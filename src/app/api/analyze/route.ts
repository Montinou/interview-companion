import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, transcripts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { callAnthropic, HAIKU, SONNET } from '@/lib/ai/anthropic';
import {
  HAIKU_SYSTEM,
  SONNET_SYSTEM,
  buildHaikuUserMessage,
  buildSonnetUserMessage,
} from '@/lib/ai/prompts';

interface IngestRequest {
  interviewId: number;
  text: string;
  speaker?: string; // 'interviewer' | 'candidate' | 'unknown'
  candidateName: string;
  position?: string;
  durationMinutes?: number;
}

export async function POST(request: NextRequest) {
  // Machine-to-machine auth
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    const body: IngestRequest = await request.json();
    const {
      interviewId,
      text,
      speaker = 'unknown',
      candidateName,
      position = 'QA Automation Engineer',
      durationMinutes = 0,
    } = body;

    if (!interviewId || !text || !candidateName) {
      return NextResponse.json(
        { error: 'Missing required fields: interviewId, text, candidateName' },
        { status: 400 }
      );
    }

    // 1. Save transcript chunk to DB
    await db.insert(transcripts).values({
      interviewId,
      text,
      speaker,
    });

    // 2. Get recent context (last 10 transcript entries)
    const recentTranscripts = await db.query.transcripts.findMany({
      where: eq(transcripts.interviewId, interviewId),
      orderBy: [desc(transcripts.timestamp)],
      limit: 10,
    });
    const recentContext = recentTranscripts
      .reverse()
      .map(t => `[${t.speaker}] ${t.text}`);

    // 3. Get existing insight count
    const existingInsights = await db.query.aiInsights.findMany({
      where: eq(aiInsights.interviewId, interviewId),
      orderBy: [desc(aiInsights.timestamp)],
    });

    // 4. HAIKU: Constant monitoring with thinking
    const haikuResponse = await callAnthropic({
      model: HAIKU,
      system: HAIKU_SYSTEM,
      messages: [
        {
          role: 'user',
          content: buildHaikuUserMessage(text, {
            candidateName,
            position,
            durationMinutes,
            recentContext: recentContext.slice(-5),
            insightsSoFar: existingInsights.length,
          }),
        },
      ],
      maxTokens: 512,
      thinking: {
        type: 'enabled',
        budget_tokens: 2048,
      },
    });

    let haikuDecision;
    try {
      haikuDecision = JSON.parse(haikuResponse.text);
    } catch {
      haikuDecision = { escalate: false, reason: 'Parse error', quick_note: null };
    }

    const result: Record<string, unknown> = {
      haiku: {
        escalate: haikuDecision.escalate,
        reason: haikuDecision.reason,
        quick_note: haikuDecision.quick_note,
        severity: haikuDecision.severity,
        topic: haikuDecision.topic,
        usage: haikuResponse.usage,
      },
      sonnet: null,
      savedInsights: 0,
    };

    // 5. If Haiku says escalate → SONNET deep analysis
    if (haikuDecision.escalate) {
      const sonnetResponse = await callAnthropic({
        model: SONNET,
        system: SONNET_SYSTEM,
        messages: [
          {
            role: 'user',
            content: buildSonnetUserMessage(text, {
              candidateName,
              position,
              durationMinutes,
              haikuReason: haikuDecision.reason,
              recentTranscript: recentContext,
              existingInsights: existingInsights.map(i => `[${i.type}] ${i.content}`),
            }),
          },
        ],
        maxTokens: 1024,
      });

      let sonnetAnalysis;
      try {
        sonnetAnalysis = JSON.parse(sonnetResponse.text);
      } catch {
        sonnetAnalysis = { insights: [] };
      }

      // 6. Save Sonnet's insights to DB
      const insightsToSave = (sonnetAnalysis.insights || []).map(
        (insight: {
          type: string;
          content: string;
          suggestion?: string;
          topic?: string;
          responseQuality?: number;
          severity?: string;
        }) => ({
          interviewId,
          type: insight.type.replaceAll('_', '-'), // red_flag → red-flag
          content: insight.content,
          suggestion: insight.suggestion || null,
          topic: insight.topic || haikuDecision.topic || null,
          responseQuality: insight.responseQuality || null,
          severity: insight.severity || 'info',
        })
      );

      if (insightsToSave.length > 0) {
        await db.insert(aiInsights).values(insightsToSave);
      }

      result.sonnet = {
        insights: sonnetAnalysis.insights,
        usage: sonnetResponse.usage,
      };
      result.savedInsights = insightsToSave.length;
    }

    // 7. Save Haiku quick_note ONLY if high severity and it escalated
    //    (avoid flooding DB with trivial notes like "candidate said hello")
    if (
      haikuDecision.quick_note &&
      haikuDecision.severity === 'high' &&
      !haikuDecision.escalate // only save note if Sonnet didn't already cover it
    ) {
      await db.insert(aiInsights).values({
        interviewId,
        type: 'note',
        content: haikuDecision.quick_note,
        topic: haikuDecision.topic || null,
        severity: 'warning',
      });
      result.savedInsights = (result.savedInsights as number) + 1;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/analyze',
    pipeline: 'Haiku (thinking) → Sonnet (deep analysis)',
    description: 'Every transcript chunk goes through Haiku. Sonnet is called only when Haiku escalates.',
  });
}
