import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scorecards, interviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);

    const scorecard = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interviewId),
    });

    return NextResponse.json(scorecard || null);
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);
    const body = await request.json();

    const { attitude, communication, technical, strategic, leadership, english, notes, recommendation } = body;

    // Look up interview to get orgId
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.id, interviewId),
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Upsert: create or update
    const existing = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interviewId),
    });

    let scorecard;
    if (existing) {
      [scorecard] = await db
        .update(scorecards)
        .set({
          attitude,
          communication,
          technical,
          strategic,
          leadership,
          english,
          notes,
          recommendation,
          updatedAt: new Date(),
        })
        .where(eq(scorecards.interviewId, interviewId))
        .returning();
    } else {
      [scorecard] = await db
        .insert(scorecards)
        .values({
          orgId: interview.orgId,
          interviewId,
          attitude,
          communication,
          technical,
          strategic,
          leadership,
          english,
          notes,
          recommendation,
        })
        .returning();
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error('Error saving scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
