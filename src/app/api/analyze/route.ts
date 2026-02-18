import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transcripts, interviews } from '@/lib/db/schema';
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { eq } from 'drizzle-orm';
import { createRateLimiter } from '@/lib/rate-limit';

// M2M ingest: 60 req/min per interview (chunks arrive fast during live capture)
const limiter = createRateLimiter({ windowMs: 60_000, max: 60, name: 'analyze-ingest' });

/**
 * Transcript ingestion endpoint.
 * Saves transcript chunks to DB. AI analysis happens via OpenClaw agents (not here).
 * 
 * Flow: Mac script → POST /api/analyze → save to DB → return 200
 *       OpenClaw cron → spawns analyzer agent → reads from DB → writes insights
 */

interface IngestRequest {
  interviewId: number;
  text: string;
  speaker?: string;
  candidateName?: string;
  position?: string;
  durationMinutes?: number;
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse('Invalid or missing API key');
  }

  try {
    const body: IngestRequest = await request.json();
    const { interviewId, text, speaker = 'unknown' } = body;

    if (!interviewId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: interviewId, text' },
        { status: 400 }
      );
    }

    // Rate limit per interview
    const limited = limiter.check(String(interviewId));
    if (limited) return limited;

    // Look up interview to get orgId (M2M auth, no Clerk session)
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.id, interviewId),
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Save transcript chunk to DB (fast, <100ms)
    const [entry] = await db.insert(transcripts).values({
      orgId: interview.orgId,
      interviewId,
      text,
      speaker,
    }).returning();

    return NextResponse.json({
      id: entry.id,
      saved: true,
    });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/analyze',
    description: 'Transcript ingestion. AI analysis handled by OpenClaw agents.',
  });
}
