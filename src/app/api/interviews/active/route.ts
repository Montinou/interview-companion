import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateApiKey, unauthorizedResponse } from '@/lib/api-auth';

/**
 * Returns active (live) interviews.
 * M2M only — used by capture script to know which interview to stream to.
 * Requires orgId query param for scoping.
 */
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    // Build where clause — org-scoped if provided
    const whereClause = orgId
      ? and(eq(interviews.status, 'live'), eq(interviews.orgId, orgId))
      : eq(interviews.status, 'live');

    const activeInterviews = await db.query.interviews.findMany({
      where: whereClause,
      with: {
        candidate: true,
      },
    });

    return NextResponse.json(
      activeInterviews.map(i => ({
        id: i.id,
        orgId: i.orgId,
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
