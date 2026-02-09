import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scorecards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getActiveInterview } from '@/lib/hud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const interview = await getActiveInterview();
    if (!interview) return NextResponse.json({ scorecard: null });

    const sc = await db.query.scorecards.findFirst({
      where: eq(scorecards.interviewId, interview.id),
    });

    if (!sc) return NextResponse.json({ scorecard: null });

    // Map English DB column names to Spanish HUD names
    return NextResponse.json({
      scorecard: {
        actitud: sc.attitude || 0,
        comunicacion: sc.communication || 0,
        tecnico: sc.technical || 0,
        estrategico: sc.strategic || 0,
        liderazgo: sc.leadership || 0,
        ingles: sc.english || 0,
        recommendation: sc.recommendation || null,
        justification: sc.notes || null,
      },
    });
  } catch (error) {
    console.error('HUD scorecard error:', error);
    return NextResponse.json({ scorecard: null, error: String(error) });
  }
}
