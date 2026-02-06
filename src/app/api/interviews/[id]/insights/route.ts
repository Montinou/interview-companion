import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);
    const body = await request.json();

    const { type, content } = body;

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

    const insights = await db.query.aiInsights.findMany({
      where: (aiInsights, { eq }) => eq(aiInsights.interviewId, interviewId),
      orderBy: (aiInsights, { asc }) => [asc(aiInsights.timestamp)],
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
