import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, transcripts, interviews, scorecards } from '@/lib/db/schema';
import { eq, desc, asc, and, gt, sql } from 'drizzle-orm';
import { validateApiKey, validateDualAuth, unauthorizedResponse } from '@/lib/api-auth';

/**
 * Unified API endpoint for interview data.
 * Workaround for Vercel dynamic route [id] deployment issues.
 * 
 * Usage:
 *   GET /api/interview-data?id=4&type=transcript
 *   GET /api/interview-data?id=4&type=insights
 *   GET /api/interview-data?id=4&type=stats
 *   POST /api/interview-data?id=4&type=insights  (body: insight data)
 *   POST /api/interview-data?id=4&type=scorecard  (body: scorecard data)
 *   POST /api/interview-data?id=4&type=used&insightId=5  (mark suggestion used)
 */

export async function GET(request: NextRequest) {
  if (!(await validateDualAuth(request))) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const interviewId = parseInt(searchParams.get('id') || '0');
  const type = searchParams.get('type') || '';

  if (!interviewId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    switch (type) {
      case 'transcript': {
        const after = searchParams.get('after');
        const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

        const whereClause = after
          ? and(eq(transcripts.interviewId, interviewId), gt(transcripts.id, parseInt(after)))
          : eq(transcripts.interviewId, interviewId);

        const entries = await db
          .select()
          .from(transcripts)
          .where(whereClause)
          .orderBy(asc(transcripts.timestamp))
          .limit(limit);

        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(transcripts)
          .where(eq(transcripts.interviewId, interviewId));

        return NextResponse.json({
          entries,
          total: Number(count),
          hasMore: entries.length === limit,
        });
      }

      case 'insights': {
        const typeFilter = searchParams.get('filter');

        const insights = typeFilter
          ? await db.query.aiInsights.findMany({
              where: and(
                eq(aiInsights.interviewId, interviewId),
                eq(aiInsights.type, typeFilter)
              ),
              orderBy: [desc(aiInsights.timestamp)],
            })
          : await db.query.aiInsights.findMany({
              where: eq(aiInsights.interviewId, interviewId),
              orderBy: [desc(aiInsights.timestamp)],
            });

        return NextResponse.json(insights);
      }

      case 'stats': {
        const [counts] = await db
          .select({
            redFlagCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'red-flag')`,
            greenFlagCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'green-flag')`,
            suggestionCount: sql<number>`count(*) filter (where ${aiInsights.type} = 'suggestion')`,
            totalInsights: sql<number>`count(*)`,
          })
          .from(aiInsights)
          .where(eq(aiInsights.interviewId, interviewId));

        const topics = await db
          .selectDistinct({ topic: aiInsights.topic })
          .from(aiInsights)
          .where(eq(aiInsights.interviewId, interviewId));

        return NextResponse.json({
          redFlagCount: Number(counts.redFlagCount),
          greenFlagCount: Number(counts.greenFlagCount),
          suggestionCount: Number(counts.suggestionCount),
          topicsCovered: topics.map(t => t.topic).filter(Boolean),
          totalInsights: Number(counts.totalInsights),
        });
      }

      case 'scorecard': {
        const scorecard = await db.query.scorecards.findFirst({
          where: eq(scorecards.interviewId, interviewId),
        });
        return NextResponse.json(scorecard || null);
      }

      case 'plan': {
        // Interview planning: sections → topics → questions
        const sections = await db.execute(sql`
          SELECT s.id, s.name, s.description, s.duration_min, s.sort_order,
            COALESCE(json_agg(
              json_build_object(
                'id', t.id, 'name', t.name, 'description', t.description,
                'priority', t.priority, 'sort_order', t.sort_order,
                'questions', (
                  SELECT COALESCE(json_agg(
                    json_build_object(
                      'id', q.id, 'question', q.question, 'purpose', q.purpose,
                      'expected_signals', q.expected_signals, 'follow_ups', q.follow_ups,
                      'asked', q.asked, 'answer_quality', q.answer_quality, 'notes', q.notes
                    ) ORDER BY q.sort_order
                  ), '[]'::json)
                  FROM interview_questions q WHERE q.topic_id = t.id
                )
              ) ORDER BY t.sort_order
            ) FILTER (WHERE t.id IS NOT NULL), '[]'::json) as topics
          FROM interview_sections s
          LEFT JOIN interview_topics t ON t.section_id = s.id
          WHERE s.interview_id = ${interviewId}
          GROUP BY s.id, s.name, s.description, s.duration_min, s.sort_order
          ORDER BY s.sort_order
        `);
        return NextResponse.json(sections.rows || []);
      }

      default:
        return NextResponse.json({ error: 'Invalid type. Use: transcript, insights, stats, scorecard, plan' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/interview-data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await validateDualAuth(request))) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const interviewId = parseInt(searchParams.get('id') || '0');
  const type = searchParams.get('type') || '';

  if (!interviewId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const body = await request.json();

    switch (type) {
      case 'insights': {
        const { type: insightType, content, severity, suggestion, topic, responseQuality } = body;
        if (!insightType || !content) {
          return NextResponse.json({ error: 'Missing type or content' }, { status: 400 });
        }

        const [insight] = await db.insert(aiInsights).values({
          interviewId,
          type: insightType,
          content,
          severity,
          suggestion,
          topic,
          responseQuality,
        }).returning();

        return NextResponse.json(insight);
      }

      case 'scorecard': {
        const { attitude, communication, technical, strategic, leadership, english, notes, recommendation } = body;

        const existing = await db.query.scorecards.findFirst({
          where: eq(scorecards.interviewId, interviewId),
        });

        let scorecard;
        if (existing) {
          [scorecard] = await db.update(scorecards).set({
            attitude, communication, technical, strategic, leadership, english, notes, recommendation,
            updatedAt: new Date(),
          }).where(eq(scorecards.interviewId, interviewId)).returning();
        } else {
          [scorecard] = await db.insert(scorecards).values({
            interviewId, attitude, communication, technical, strategic, leadership, english, notes, recommendation,
          }).returning();
        }

        return NextResponse.json(scorecard);
      }

      case 'used': {
        const insightId = parseInt(searchParams.get('insightId') || '0');
        if (!insightId) {
          return NextResponse.json({ error: 'Missing insightId' }, { status: 400 });
        }
        await db.update(aiInsights).set({ used: true }).where(eq(aiInsights.id, insightId));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid type for POST. Use: insights, scorecard, used' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/interview-data POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
