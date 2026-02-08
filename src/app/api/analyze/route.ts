import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
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
  speaker?: string;
  candidateName: string;
  position?: string;
  durationMinutes?: number;
}

export async function POST(request: NextRequest) {
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

    // 1. Save transcript chunk to DB (fast, <100ms)
    await db.insert(transcripts).values({
      interviewId,
      text,
      speaker,
    });

    // 2. Get recent context for Haiku
    const recentTranscripts = await db.query.transcripts.findMany({
      where: eq(transcripts.interviewId, interviewId),
      orderBy: [desc(transcripts.timestamp)],
      limit: 10,
    });
    const recentContext = recentTranscripts
      .reverse()
      .map(t => `[${t.speaker}] ${t.text}`);

    const existingInsights = await db.query.aiInsights.findMany({
      where: eq(aiInsights.interviewId, interviewId),
      orderBy: [desc(aiInsights.timestamp)],
    });

    // 3. HAIKU with thinking (~2-3s, within Vercel hobby 10s limit)
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
      haikuDecision = { escalate: false, reason: 'Parse error', quick_note: null, severity: 'none', topic: null };
    }

    // 4. Save Haiku quick_note if high severity and not escalating
    if (
      haikuDecision.quick_note &&
      haikuDecision.severity === 'high' &&
      !haikuDecision.escalate
    ) {
      await db.insert(aiInsights).values({
        interviewId,
        type: 'note',
        content: haikuDecision.quick_note,
        topic: haikuDecision.topic || null,
        severity: 'warning',
      });
    }

    // 5. If Haiku says escalate → run Sonnet AFTER response (background)
    //    This avoids Vercel hobby 10s timeout
    if (haikuDecision.escalate) {
      after(async () => {
        try {
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
              type: insight.type.replaceAll('_', '-'),
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
        } catch (error) {
          console.error('Sonnet background analysis failed:', error);
        }
      });
    }

    // 6. Return immediately with Haiku result (fast response)
    return NextResponse.json({
      haiku: {
        escalate: haikuDecision.escalate,
        reason: haikuDecision.reason,
        quick_note: haikuDecision.quick_note,
        severity: haikuDecision.severity,
        topic: haikuDecision.topic,
        usage: haikuResponse.usage,
      },
      sonnet: haikuDecision.escalate ? 'processing_in_background' : null,
    });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/analyze',
    pipeline: 'Haiku (thinking, sync) → Sonnet (deep, async via after())',
    vercel: 'Hobby-compatible: Haiku responds in <5s, Sonnet runs after response',
  });
}
