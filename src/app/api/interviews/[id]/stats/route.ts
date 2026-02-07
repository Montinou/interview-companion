import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);

    // Get counts by type
    const insights = await db.query.aiInsights.findMany({
      where: eq(aiInsights.interviewId, interviewId),
    });

    const redFlagCount = insights.filter(i => i.type === 'red-flag').length;
    const greenFlagCount = insights.filter(i => i.type === 'green-flag').length;
    const suggestionCount = insights.filter(i => i.type === 'suggestion').length;
    
    // Get unique topics
    const topicsCovered = [...new Set(
      insights
        .filter(i => i.topic)
        .map(i => i.topic as string)
    )];

    return NextResponse.json({
      redFlagCount,
      greenFlagCount,
      suggestionCount,
      topicsCovered,
      totalInsights: insights.length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
