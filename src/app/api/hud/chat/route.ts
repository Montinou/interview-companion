import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, interviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, interviewId } = await req.json();

    if (!message || !interviewId) {
      return NextResponse.json({ error: 'Missing message or interviewId' }, { status: 400 });
    }

    // Verify the interview belongs to this user
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 });
    }

    const { orgId } = await auth();
    const effectiveOrgId = orgId || `personal_${clerkId}`;

    const interview = await db.query.interviews.findFirst({
      where: and(
        eq(interviews.id, interviewId),
        eq(interviews.orgId, effectiveOrgId),
        eq(interviews.interviewerId, dbUser.id),
      ),
    });
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Fetch recent transcripts (last 50)
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('timestamp, speaker_role, speaker, text, confidence')
      .eq('interview_id', interviewId)
      .order('timestamp', { ascending: false })
      .limit(50);

    // Fetch recent insights
    const { data: insights } = await supabase
      .from('ai_insights')
      .select('timestamp, type, content, topic, sentiment, evidence, score, suggestion')
      .eq('interview_id', interviewId)
      .order('timestamp', { ascending: false })
      .limit(30);

    // Build context
    const transcriptContext = transcripts
      ?.reverse()
      .map(t => {
        const speaker = (t.speaker_role === 'guest' || t.speaker === 'candidate') ? 'Candidate' : 'Interviewer';
        return `[${speaker}] ${t.text}`;
      })
      .join('\n') || 'No transcript available yet.';

    const insightsContext = insights
      ?.map(i => {
        let line = `[${i.type}] ${i.content}`;
        if (i.topic) line += ` (${i.topic})`;
        if (i.sentiment) line += ` - ${i.sentiment}`;
        if (i.suggestion) line += ` → ${i.suggestion}`;
        return line;
      })
      .join('\n') || 'No insights available yet.';

    const systemPrompt = `You are an interview analysis assistant. Answer questions about the candidate based on the transcript and insights provided. Be concise and specific. Reply in the same language as the user's question.

## Recent Transcript:
${transcriptContext}

## AI Insights:
${insightsContext}
`;

    // Call Moonshot (Kimi) API
    const moonshot_key = process.env.MOONSHOT_API_KEY;
    if (!moonshot_key) {
      return NextResponse.json({ error: 'MOONSHOT_API_KEY not configured' }, { status: 500 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${moonshot_key}`,
        },
        body: JSON.stringify({
          model: 'kimi-k2-turbo-preview',
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if ((error as Error).name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moonshot API error:', response.status, errorText);
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    // Stream the response back
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'No response body' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Parse SSE format from OpenClaw
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
