import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scorecards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getActiveInterview } from '@/lib/hud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const interview = await getActiveInterview();
    if (!interview) return NextResponse.json({ notes: '' });

    const sc = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interview.id),
    });

    return NextResponse.json({ notes: sc?.notes || '' });
  } catch (error) {
    console.error('HUD notes GET error:', error);
    return NextResponse.json({ notes: '' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const interview = await getActiveInterview();
    if (!interview) return NextResponse.json({ error: 'No active interview' }, { status: 404 });

    const body = await request.json();
    const notes = body.notes || '';

    // Upsert into scorecards table
    const existing = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interview.id),
    });

    if (existing) {
      await db
        .update(scorecards)
        .set({ notes, updatedAt: new Date() })
        .where(eq(scorecards.interviewId, interview.id));
    } else {
      await db.insert(scorecards).values({
        interviewId: interview.id,
        notes,
      });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('HUD notes POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
