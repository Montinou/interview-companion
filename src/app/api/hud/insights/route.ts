import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getActiveInterview } from '@/lib/hud';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const interview = await getActiveInterview();
    if (!interview) return NextResponse.json({ insights: [] });

    const entries = await db.query.aiInsights.findMany({
      where: eq(aiInsights.interviewId, interview.id),
      orderBy: [asc(aiInsights.timestamp)],
    });

    // Map DB insight types to HUD format
    const insights = entries.map(e => {
      const isSuggestion = e.type === 'suggestion';
      const isFlag = e.type === 'red-flag' || e.type === 'green-flag';

      // Build a parsed-like object the HUD frontend expects
      const parsed: Record<string, any> = {};
      if (isSuggestion && e.suggestion) parsed.follow_up = e.suggestion;
      if (e.topic) parsed.insight = e.topic;
      if (e.type === 'red-flag') parsed.flag = e.content;
      if (e.type === 'green-flag') {
        parsed.green_flags = [e.content];
      }
      if (e.type === 'red-flag') {
        parsed.red_flags = [e.content];
      }

      return {
        time: e.timestamp.toISOString().substring(11, 19),
        timestamp: e.timestamp.getTime() / 1000,
        tier: isSuggestion ? 1 : 2,
        trigger: e.content?.substring(0, 100) || '',
        analysis: JSON.stringify(parsed),
        parsed,
      };
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('HUD insights error:', error);
    return NextResponse.json({ insights: [], error: String(error) });
  }
}
