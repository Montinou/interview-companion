import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiInsights } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; insightId: string }> }
) {
  try {
    const { insightId } = await params;

    const [updated] = await db
      .update(aiInsights)
      .set({ used: true })
      .where(eq(aiInsights.id, parseInt(insightId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, insight: updated });
  } catch (error) {
    console.error('Error marking insight as used:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
