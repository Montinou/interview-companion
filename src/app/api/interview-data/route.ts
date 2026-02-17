import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
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
        // Use unpooled URL for raw queries
        const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
        const rawSql = postgres(unpooledUrl, { prepare: false });
        
        const sectionRows = await rawSql`
          SELECT id, name, description, duration_min, sort_order
          FROM interview_sections WHERE interview_id = ${interviewId}
          ORDER BY sort_order`;
        const topicRows = await rawSql`
          SELECT t.id, t.section_id, t.name, t.description, t.priority, t.sort_order
          FROM interview_topics t
          JOIN interview_sections s ON t.section_id = s.id
          WHERE s.interview_id = ${interviewId}
          ORDER BY t.sort_order`;
        const questionRows = await rawSql`
          SELECT q.id, q.topic_id, q.question, q.purpose, q.expected_signals,
                 q.follow_ups, q.asked, q.answer_quality, q.notes, q.sort_order
          FROM interview_questions q
          JOIN interview_topics t ON q.topic_id = t.id
          JOIN interview_sections s ON t.section_id = s.id
          WHERE s.interview_id = ${interviewId}
          ORDER BY q.sort_order`;

        // Assemble nested structure
        const topics = topicRows.map((t: any) => ({
          ...t,
          questions: questionRows.filter((q: any) => q.topic_id === t.id),
        }));
        const sections = sectionRows.map((s: any) => ({
          ...s,
          topics: topics.filter((t: any) => t.section_id === s.id),
        }));

        return NextResponse.json(sections);
      }

      default:
        return NextResponse.json({ error: 'Invalid type. Use: transcript, insights, stats, scorecard, plan' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/interview-data:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal server error', detail: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  
  // Use validateApiKey for transcript endpoint (capture script uses API key)
  // Use validateDualAuth for all other endpoints
  if (type === 'transcript') {
    if (!(await validateApiKey(request))) {
      return unauthorizedResponse();
    }
  } else {
    if (!(await validateDualAuth(request))) {
      return unauthorizedResponse();
    }
  }

  const interviewId = parseInt(searchParams.get('id') || '0');

  if (!interviewId) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Look up interview to get orgId for all inserts
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.id, interviewId),
    });

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    switch (type) {
      case 'transcript': {
        // Accept either single entry or array of entries
        const entries = Array.isArray(body.entries) ? body.entries : [body];
        
        if (entries.length === 0) {
          return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
        }

        // Insert all entries
        const insertValues = entries.map((entry: any) => ({
          orgId: interview.orgId,
          interviewId,
          timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
          text: entry.text || '',
          speaker: entry.speaker === 'interviewer' ? 'interviewer' : 'candidate',
          confidence: entry.confidence ? Math.round(entry.confidence * 100) : null,
        }));

        await db.insert(transcripts).values(insertValues);

        return NextResponse.json({ success: true, count: entries.length });
      }

      case 'insights': {
        const { type: insightType, content, severity, suggestion, topic, responseQuality } = body;
        if (!insightType || !content) {
          return NextResponse.json({ error: 'Missing type or content' }, { status: 400 });
        }

        const [insight] = await db.insert(aiInsights).values({
          orgId: interview.orgId,
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
            orgId: interview.orgId,
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

      case 'notes': {
        const { text, requestAI } = body;
        if (!text) {
          return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        // Store the note as an insight of type 'note'
        await db.insert(aiInsights).values({
          orgId: interview.orgId,
          interviewId,
          type: 'note',
          content: text,
          severity: 'info',
          topic: 'interviewer-note',
        });

        // AI response is generated by the Mac-side note-responder (polls DB, uses local OpenClaw gateway)
        // The note is stored with topic 'pending-ai' so the responder knows to process it
        // Response comes back as a separate insight of type 'ai-response'
        return NextResponse.json({ success: true, noteId: 'saved', pendingAI: requestAI });
      }

      case 'question-asked': {
        const { questionId } = body;
        if (!questionId) {
          return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
        }
        const rawSql2 = postgres(process.env.DATABASE_URL!, { prepare: false });
        await rawSql2`UPDATE interview_questions SET asked = true WHERE id = ${questionId}`;
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid type for POST. Use: insights, scorecard, used, notes, question-asked' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in /api/interview-data POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
