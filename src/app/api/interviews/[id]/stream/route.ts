import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const interviewId = parseInt(id);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', interviewId })}\n\n`)
      );

      // Poll for new insights every 2 seconds
      let lastTimestamp = new Date(0);
      
      const interval = setInterval(async () => {
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
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(insight)}\n\n`)
            );
            lastTimestamp = insight.timestamp;
          }
        } catch (error) {
          console.error('Error polling insights:', error);
        }
      }, 2000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
