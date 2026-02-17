import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext, AuthError } from '@/lib/auth';

interface ChatRequest {
  message: string;
  profileDraft: Partial<{
    name: string;
    roleType: string;
    seniority: string;
    description: string;
    techStack: string[];
    evaluationDimensions: { key: string; label: string; weight: number }[];
    interviewStructure: {
      totalDuration: number;
      phases: {
        name: string;
        duration: number;
        questions: { text: string; listenFor?: string; note?: string }[];
      }[];
    };
    analysisInstructions: string;
    redFlags: string[];
    greenFlags: string[];
  }>;
  step: number;
}

interface ChatResponse {
  reply: string;
  profileUpdate: Partial<ChatRequest['profileDraft']>;
  nextStep: number;
  complete: boolean;
}

const SYSTEM_PROMPTS = {
  0: (draft: any) => `You are a warm, helpful interview planning assistant. You're helping a hiring manager build a structured interview profile.

Current profile draft: ${JSON.stringify(draft, null, 2)}

Step 1: Role Discovery
Ask the user what role they're hiring for. Be conversational and warm. Ask about:
- Job title
- Seniority level (junior/mid/senior/lead/staff)
- Key technical skills/stack (if technical role)
- Brief description of what this person will do

Keep it brief and friendly. Don't be robotic.

Respond in JSON format:
{
  "reply": "your conversational message here",
  "profileUpdate": { "name": "...", "roleType": "...", "seniority": "...", "description": "...", "techStack": [...] },
  "nextStep": 1,
  "complete": false
}`,

  1: (draft: any) => `You are a warm, helpful interview planning assistant.

Current profile draft: ${JSON.stringify(draft, null, 2)}

Step 2: Evaluation Dimensions
The user just told you about the role: ${draft.name || 'unknown role'} (${draft.seniority || 'unspecified'} level).

Now propose 4-6 evaluation dimensions based on the role. For a ${draft.roleType || 'technical'} role with stack ${draft.techStack?.join(', ') || 'unknown'}, suggest dimensions like:
- Technical skills (e.g., "React Proficiency", "System Design", "Testing")
- Soft skills (e.g., "Communication", "Problem Solving", "Collaboration")
- Experience areas (e.g., "Production Experience", "Team Leadership")

Give each dimension a suggested weight (0.1 to 0.3, totaling 1.0).

Present this warmly: "For a ${draft.seniority} ${draft.name}, I'd evaluate these areas: [list with weights]. Does this feel right? Want to adjust any?"

Respond in JSON format:
{
  "reply": "your message",
  "profileUpdate": { "evaluationDimensions": [{ "key": "react", "label": "React Proficiency", "weight": 0.2 }, ...] },
  "nextStep": 2,
  "complete": false
}`,

  2: (draft: any) => `You are a warm, helpful interview planning assistant.

Current profile draft: ${JSON.stringify(draft, null, 2)}

Step 3: Priorities & Flags
The user confirmed evaluation dimensions. Now dig into their priorities and experience-based signals.

Ask warmly: "Now I want to understand YOUR priorities. For a ${draft.seniority} ${draft.name}:
- What's a dealbreaker for you? (red flags)
- What signals excellence? (green flags)
- Any specific patterns you've noticed in past hires?"

Extract red flags (e.g., "vague about past projects", "can't explain trade-offs") and green flags (e.g., "asks clarifying questions", "mentions production incidents").

Also generate analysis_instructions for the AI analyzer (1-2 sentences on what to watch for).

Respond in JSON:
{
  "reply": "your message",
  "profileUpdate": { "redFlags": [...], "greenFlags": [...], "analysisInstructions": "..." },
  "nextStep": 3,
  "complete": false
}`,

  3: (draft: any) => `You are a warm, helpful interview planning assistant.

Current profile draft: ${JSON.stringify(draft, null, 2)}

Step 4: Interview Structure
User has confirmed flags. Now design the interview structure.

Create a 45-60 minute interview plan with 3-4 phases:
1. Warm-up (5-10 min): Ice breaker, background questions
2. Technical Deep Dive (20-30 min): Role-specific questions based on ${draft.techStack?.join(', ') || 'the tech stack'}
3. Behavioral/Situational (10-15 min): Past experiences, problem-solving
4. Q&A / Close (5 min): Candidate questions

For each phase, include 3-5 specific questions with optional "listenFor" hints.

Present warmly: "Here's the structure I'd suggest: [phases with timing]. Total ~X min. Want to adjust anything?"

Respond in JSON:
{
  "reply": "your message",
  "profileUpdate": { "interviewStructure": { "totalDuration": 60, "phases": [...] } },
  "nextStep": 4,
  "complete": false
}`,

  4: (draft: any) => `You are a warm, helpful interview planning assistant.

Current profile draft: ${JSON.stringify(draft, null, 2)}

Step 5: Confirmation
User has reviewed the interview structure. Confirm completion.

Say warmly: "✅ Your profile is ready! Here's what we built:
- Role: ${draft.name} (${draft.seniority})
- ${draft.evaluationDimensions?.length || 0} evaluation dimensions
- ${draft.interviewStructure?.phases?.length || 0} interview phases (~${draft.interviewStructure?.totalDuration || 0} min)
- ${draft.redFlags?.length || 0} red flags, ${draft.greenFlags?.length || 0} green flags

Ready to save this as a template?"

Respond in JSON:
{
  "reply": "your message",
  "profileUpdate": {},
  "nextStep": 5,
  "complete": true
}`,
};

export async function POST(req: NextRequest) {
  try {
    // Validate org context (chat is org-scoped even though it doesn't insert directly)
    await getOrgContext();

    const body: ChatRequest = await req.json();
    const { message, profileDraft = {}, step = 0 } = body;

    // Get the appropriate system prompt
    const systemPrompt = SYSTEM_PROMPTS[step as keyof typeof SYSTEM_PROMPTS]?.(profileDraft) || SYSTEM_PROMPTS[0](profileDraft);

    // Call Moonshot API
    const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Moonshot API error:', error);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const aiResponse: ChatResponse = JSON.parse(data.choices[0].message.content);

    // Merge profileUpdate into profileDraft
    const updatedDraft = { ...profileDraft, ...aiResponse.profileUpdate };

    return NextResponse.json({
      reply: aiResponse.reply,
      profileDraft: updatedDraft,
      step: aiResponse.nextStep,
      complete: aiResponse.complete,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Profile chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
