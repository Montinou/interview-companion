import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth';

/**
 * Returns active (live) interviews.
 * Used by the OpenClaw analyzer agent to know what to process.
 */
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse();
  }

  try {
    const activeInterviews = await db.query.interviews.findMany({
      where: eq(interviews.status, 'live'),
      with: {
        candidate: true,
      },
    });

    return NextResponse.json(
      activeInterviews.map(i => ({
        id: i.id,
        candidateName: i.candidate.name,
        candidateEmail: i.candidate.email,
        status: i.status,
        startedAt: i.startedAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching active interviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
