import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);
    const body = await request.json();

    const { type, content, severity, suggestion, topic, responseQuality } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing type or content' },
        { status: 400 }
      );
    }

    // Save insight to database
    const [insight] = await db.insert(aiInsights).values({
      interviewId,
      type,
      content,
      severity,
      suggestion,
      topic,
      responseQuality,
    }).returning();

    return NextResponse.json(insight);
  } catch (error) {
    console.error('Error saving insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);
    
    // Get type filter from query params
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    let insights;
    
    if (typeFilter) {
      insights = await db.query.aiInsights.findMany({
        where: and(
          eq(aiInsights.interviewId, interviewId),
          eq(aiInsights.type, typeFilter)
        ),
        orderBy: [desc(aiInsights.timestamp)],
      });
    } else {
      insights = await db.query.aiInsights.findMany({
        where: eq(aiInsights.interviewId, interviewId),
        orderBy: [desc(aiInsights.timestamp)],
      });
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
