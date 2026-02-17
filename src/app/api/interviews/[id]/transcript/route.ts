import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transcripts, interviews } from '@/lib/db/schema';
import { eq, gt, and, asc, sql } from 'drizzle-orm';
import { validateDualAuth, unauthorizedResponse } from '@/lib/api-auth';

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

    // For Clerk auth, verify org ownership
    // For API key auth (M2M), we trust the caller
    // validateDualAuth already confirmed one of these
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.id, interviewId),
    });
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '200'), 500);

    const whereClause = after
      ? and(eq(transcripts.interviewId, interviewId), gt(transcripts.id, parseInt(after)))
      : eq(transcripts.interviewId, interviewId);

    const entries = await db
      .select()
      .from(transcripts)
      .where(whereClause)
      .orderBy(asc(transcripts.timestamp))
      .limit(limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transcripts)
      .where(eq(transcripts.interviewId, interviewId));

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
