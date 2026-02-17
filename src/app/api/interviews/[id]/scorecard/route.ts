import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scorecards, interviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

async function verifyInterviewOrg(interviewId: number, orgId: string) {
  const interview = await db.query.interviews.findFirst({
    where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
  });
  return interview;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getOrgContext();
    const { id } = await params;
    const interviewId = parseInt(id);

    if (!await verifyInterviewOrg(interviewId, orgId)) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const scorecard = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interviewId),
    });

    return NextResponse.json(scorecard || null);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await getOrgContext();
    const { id } = await params;
    const interviewId = parseInt(id);

    const interview = await verifyInterviewOrg(interviewId, orgId);
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const body = await request.json();
    const { attitude, communication, technical, strategic, leadership, english, notes, recommendation } = body;

    const existing = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interviewId),
    });

    let scorecard;
    if (existing) {
      [scorecard] = await db
        .update(scorecards)
        .set({
          attitude, communication, technical, strategic, leadership, english,
          notes, recommendation, updatedAt: new Date(),
        })
        .where(eq(scorecards.interviewId, interviewId))
        .returning();
    } else {
      [scorecard] = await db
        .insert(scorecards)
        .values({
          orgId: interview.orgId,
          interviewId,
          attitude, communication, technical, strategic, leadership, english,
          notes, recommendation,
        })
        .returning();
    }

    return NextResponse.json(scorecard);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error saving scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
