import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);

    // Single query with SQL aggregation instead of fetching all rows
    const [counts] = await db
      .select({
        redFlagCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'red-flag')`.as('red_flag_count'),
        greenFlagCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'green-flag')`.as('green_flag_count'),
        suggestionCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'suggestion')`.as('suggestion_count'),
        totalInsights: sql<number>`count(*)`.as('total_insights'),
      })
      .from(aiInsights)
      .where(eq(aiInsights.interviewId, interviewId));

    // Get unique topics (still need a separate query, but lightweight)
    const topics = await db
      .selectDistinct({ topic: aiInsights.topic })
      .from(aiInsights)
      .where(eq(aiInsights.interviewId, interviewId));

    const topicsCovered = topics
      .map(t => t.topic)
      .filter((t): t is string => t !== null);

    return NextResponse.json({
      redFlagCount: Number(counts.redFlagCount),
      greenFlagCount: Number(counts.greenFlagCount),
      suggestionCount: Number(counts.suggestionCount),
      topicsCovered,
      totalInsights: Number(counts.totalInsights),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
