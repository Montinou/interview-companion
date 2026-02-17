import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights, interviews } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getOrgContext } from '@/lib/auth';

// Use Node runtime for long-lived SSE connections (edge has 30s timeout on free tier)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check before starting stream
  let orgId: string;
  try {
    const ctx = await getOrgContext();
    orgId = ctx.orgId;
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await params;
  const interviewId = parseInt(id);

  // Verify interview belongs to this org
  const interview = await db.query.interviews.findFirst({
    where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
  });
  if (!interview) {
    return new Response(JSON.stringify({ error: 'Interview not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendHeartbeat = () => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      };

      send(JSON.stringify({ type: 'connected', interviewId }));
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));

      let lastTimestamp = new Date(0);
      let aborted = false;

      request.signal.addEventListener('abort', () => {
        aborted = true;
      });

      let tickCount = 0;

      const interval = setInterval(async () => {
        if (aborted) {
          clearInterval(interval);
          try { controller.close(); } catch {}
          return;
        }

        tickCount++;

        if (tickCount % 7 === 0) {
          try { sendHeartbeat(); } catch {
            clearInterval(interval);
            return;
          }
        }

        try {
          const newInsights = await db.query.aiInsights.findMany({
            where: (insights, { and: a, eq: e, gt }) => 
              a(
                e(insights.interviewId, interviewId),
                gt(insights.timestamp, lastTimestamp)
              ),
            orderBy: (insights, { asc }) => [asc(insights.timestamp)],
          });

          for (const insight of newInsights) {
            send(JSON.stringify(insight));
            lastTimestamp = insight.timestamp;
          }
        } catch (error) {
          console.error('Error polling insights:', error);
        }
      }, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
