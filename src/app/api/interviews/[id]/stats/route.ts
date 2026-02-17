import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, interviews } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getOrgContext();
    const { id } = await params;
    const interviewId = parseInt(id);

    // Verify interview belongs to this org
    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
    });
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const [counts] = await db
      .select({
        redFlagCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'red-flag')`.as('red_flag_count'),
        greenFlagCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'green-flag')`.as('green_flag_count'),
        suggestionCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'suggestion')`.as('suggestion_count'),
        totalInsights: sql<number>`count(*)`.as('total_insights'),
      })
      .from(aiInsights)
      .where(eq(aiInsights.interviewId, interviewId));

    const topics = await db
      .selectDistinct({ topic: aiInsights.topic })
      .from(aiInsights)
      .where(eq(aiInsights.interviewId, interviewId));

    return NextResponse.json({
      redFlagCount: Number(counts.redFlagCount),
      greenFlagCount: Number(counts.greenFlagCount),
      suggestionCount: Number(counts.suggestionCount),
      topicsCovered: topics.map(t => t.topic).filter((t): t is string => t !== null),
      totalInsights: Number(counts.totalInsights),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
