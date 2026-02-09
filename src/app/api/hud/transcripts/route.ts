import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transcripts } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getActiveInterview } from '@/lib/hud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const interview = await getActiveInterview();
    if (!interview) return NextResponse.json({ transcripts: [], interview: null });

    const entries = await db.query.transcripts.findMany({
      where: eq(transcripts.interviewId, interview.id),
      orderBy: [asc(transcripts.timestamp)],
    });

    return NextResponse.json({
      interview: {
        id: interview.id,
        status: interview.status,
        candidateName: interview.candidate?.name || 'Unknown',
        jiraTicket: interview.candidate?.jiraTicket || '',
        startedAt: interview.startedAt,
      },
      transcripts: entries.map(e => ({
        time: e.timestamp.toISOString().substring(11, 19),
        timestamp: e.timestamp.getTime() / 1000,
        speaker: e.speaker === 'candidate' ? 'Guest' : 'Host',
        channel: e.speaker === 'candidate' ? 1 : 0,
        text: e.text,
        confidence: (e.confidence || 95) / 100,
      })),
    });
  } catch (error) {
    console.error('HUD transcripts error:', error);
    return NextResponse.json({ transcripts: [], error: String(error) });
  }
}
