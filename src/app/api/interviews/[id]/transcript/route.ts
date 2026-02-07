import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transcripts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const interviewId = parseInt(id);

    const entries = await db.query.transcripts.findMany({
      where: eq(transcripts.interviewId, interviewId),
      orderBy: (transcripts, { asc }) => [asc(transcripts.timestamp)],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
