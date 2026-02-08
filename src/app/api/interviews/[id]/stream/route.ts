import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';

// Use Node runtime for long-lived SSE connections (edge has 30s timeout on free tier)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interviewId = parseInt(id);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendHeartbeat = () => {
        // SSE comment as keepalive — clients ignore these but proxies keep connection alive
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      };

      // Send initial connection message
      send(JSON.stringify({ type: 'connected', interviewId }));

      // Send retry directive so client auto-reconnects after 3s
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));

      let lastTimestamp = new Date(0);
      let aborted = false;

      request.signal.addEventListener('abort', () => {
        aborted = true;
      });

      // Poll for new insights every 2 seconds, heartbeat every 15s
      let tickCount = 0;

      const interval = setInterval(async () => {
        if (aborted) {
          clearInterval(interval);
          try { controller.close(); } catch {}
          return;
        }

        tickCount++;

        // Heartbeat every ~15 seconds (every 7-8 ticks at 2s interval)
        if (tickCount % 7 === 0) {
          try {
            sendHeartbeat();
          } catch {
            clearInterval(interval);
            return;
          }
        }

        try {
          const newInsights = await db.query.aiInsights.findMany({
            where: (insights, { and, eq, gt }) => 
              and(
                eq(insights.interviewId, interviewId),
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

      // Cleanup on abort
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
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
