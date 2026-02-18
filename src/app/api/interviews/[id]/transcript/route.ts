import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transcripts, interviews } from '@/lib/db/schema';
import { eq, gt, and, asc, sql } from 'drizzle-orm';
import { validateDualAuth, validateApiKey, unauthorizedResponse } from '@/lib/api-auth';
import { getOrgContext } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await validateDualAuth(request))) {
    return unauthorizedResponse('Authentication required');
  }

  try {
    const { id } = await params;
    const interviewId = parseInt(id);

    let orgIdFilter: string | null = null;

    // Verify org ownership for Clerk sessions; M2M API key is trusted
    if (!validateApiKey(request)) {
      try {
        const { orgId } = await getOrgContext();
        orgIdFilter = orgId;
        const interview = await db.query.interviews.findFirst({
          where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
        });
        if (!interview) {
          return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const interview = await db.query.interviews.findFirst({
        where: eq(interviews.id, interviewId),
      });
      if (!interview) {
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
      }
    }

    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '200'), 500);

    // Build where clause with orgId filter for Clerk sessions
    let whereClause;
    if (orgIdFilter) {
      whereClause = after
        ? and(eq(transcripts.interviewId, interviewId), eq(transcripts.orgId, orgIdFilter), gt(transcripts.id, parseInt(after)))
        : and(eq(transcripts.interviewId, interviewId), eq(transcripts.orgId, orgIdFilter));
    } else {
      // API key auth - no orgId filter needed
      whereClause = after
        ? and(eq(transcripts.interviewId, interviewId), gt(transcripts.id, parseInt(after)))
        : eq(transcripts.interviewId, interviewId);
    }

    const entries = await db
      .select()
      .from(transcripts)
      .where(whereClause)
      .orderBy(asc(transcripts.timestamp))
      .limit(limit);

    // Count query with orgId filter
    const countWhereClause = orgIdFilter
      ? and(eq(transcripts.interviewId, interviewId), eq(transcripts.orgId, orgIdFilter))
      : eq(transcripts.interviewId, interviewId);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transcripts)
      .where(countWhereClause);

    return NextResponse.json({
      entries,
      total: Number(count),
      hasMore: entries.length === limit,
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
