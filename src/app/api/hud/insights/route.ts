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

    // Try to parse JSON content (may have markdown wrapping)
    function tryParseJson(text: string | null): Record<string, any> | null {
      if (!text) return null;
      let raw = text.trim();
      if (raw.startsWith('```json')) raw = raw.slice(7);
      else if (raw.startsWith('```')) raw = raw.slice(3);
      if (raw.endsWith('```')) raw = raw.slice(0, -3);
      raw = raw.trim();
      try { return JSON.parse(raw); } catch { return null; }
    }

    // Map DB insight types to HUD format
    const insights = entries.map(e => {
      const isSuggestion = e.type === 'suggestion';

      // First try: parse content as JSON (tier1/tier2 raw output)
      const contentJson = tryParseJson(e.content);

      // Build a parsed-like object the HUD frontend expects
      let parsed: Record<string, any> = {};

      if (contentJson && (contentJson.follow_up !== undefined || contentJson.scorecard !== undefined || contentJson.contradictions !== undefined)) {
        // This is a full tier1 or tier2 JSON response stored as content
        parsed = contentJson;
      } else {
        // Individual typed insight
        if (isSuggestion && e.content) parsed.follow_up = e.content;
        if (e.topic) parsed.topic = e.topic;
        if (e.type === 'red-flag') {
          parsed.flag = e.content;
          parsed.red_flags = [e.content];
        }
        if (e.type === 'green-flag') {
          parsed.green_flags = [e.content];
          parsed.insight = e.content;
        }
      }

      // Determine tier from topic or type
      const tier = (e.topic?.includes('tier2') || e.type === 'red-flag' || e.type === 'green-flag') ? 2 : 1;

      return {
        time: e.timestamp.toISOString().substring(11, 19),
        timestamp: e.timestamp.getTime() / 1000,
        tier,
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
