import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, interviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; insightId: string }> }
) {
  try {
    const { orgId } = await getOrgContext();
    const { id, insightId } = await params;
    const interviewId = parseInt(id);

    // Verify interview belongs to this org
    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
    });
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Update insight — also verify it belongs to this interview
    const [updated] = await db
      .update(aiInsights)
      .set({ used: true })
      .where(and(
        eq(aiInsights.id, parseInt(insightId)),
        eq(aiInsights.interviewId, interviewId),
      ))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, insight: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error marking insight as used:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
