import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
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
        // Use unpooled URL (channel_binding breaks raw neon() on pooler)
        const unpooledUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
        const rawSql = neon(unpooledUrl);
        
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

    switch (type) {
      case 'transcript': {
        // Accept either single entry or array of entries
        const entries = Array.isArray(body.entries) ? body.entries : [body];
        
        if (entries.length === 0) {
          return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
        }

        // Insert all entries
        const insertValues = entries.map((entry: any) => ({
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

      case 'notes': {
        const { text, requestAI } = body;
        if (!text) {
          return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        // Store the note as an insight of type 'note'
        await db.insert(aiInsights).values({
          interviewId,
          type: 'note',
          content: text,
          severity: 'info',
          topic: 'interviewer-note',
        });

        let aiResponse: string | undefined;
        if (requestAI) {
          try {
            // Get recent transcript for context
            const recentTranscript = await db
              .select({ speaker: transcripts.speaker, text: transcripts.text })
              .from(transcripts)
              .where(eq(transcripts.interviewId, interviewId))
              .orderBy(desc(transcripts.id))
              .limit(20);

            // Get recent insights for context
            const recentInsights = await db.select()
              .from(aiInsights)
              .where(and(
                eq(aiInsights.interviewId, interviewId),
                sql`${aiInsights.type} != 'note'`
              ))
              .orderBy(desc(aiInsights.id))
              .limit(5);

            const transcriptContext = recentTranscript
              .reverse()
              .map(t => `${t.speaker === 'Host' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
              .join('\n');

            const insightContext = recentInsights
              .map(i => `[${i.type}] ${i.content?.substring(0, 120)}`)
              .join('\n');

            const prompt = `You are an AI interview copilot helping a QA Engineer interviewer in real-time at Distillery.
Recent transcript (last 20 lines):
${transcriptContext || '(no transcript yet)'}

Recent AI insights:
${insightContext || '(none yet)'}

The interviewer asks: "${text}"

Respond concisely (1-3 sentences max) in the same language as the question. Be direct and actionable. If they ask for a question to ask, give ONE sharp indirect question.`;

            // Call OpenAI-compatible endpoint (Vercel AI or local gateway)
            const gatewayUrl = process.env.AI_GATEWAY_URL || process.env.OPENCLAW_GATEWAY_URL;
            const gatewayToken = process.env.AI_GATEWAY_KEY || process.env.OPENCLAW_GATEWAY_TOKEN || '';

            if (gatewayUrl) {
              const aiRes = await fetch(`${gatewayUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${gatewayToken}`,
                },
                body: JSON.stringify({
                  model: process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5',
                  messages: [{ role: 'user', content: prompt }],
                  max_tokens: 300,
                }),
                signal: AbortSignal.timeout(15000),
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                aiResponse = aiData.choices?.[0]?.message?.content || 'No response from AI';
              } else {
                const errText = await aiRes.text().catch(() => '');
                aiResponse = `📌 Nota guardada. (AI error: ${aiRes.status} ${errText.substring(0, 50)})`;
              }
            } else {
              aiResponse = '📌 Nota guardada. (No AI gateway configured — set AI_GATEWAY_URL in env)';
            }
          } catch (e) {
            aiResponse = `📌 Nota guardada. (AI timeout)`;
          }
        }

        return NextResponse.json({ success: true, aiResponse });
      }

      case 'question-asked': {
        const { questionId } = body;
        if (!questionId) {
          return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
        }
        const rawSql2 = neon(process.env.DATABASE_URL!);
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
