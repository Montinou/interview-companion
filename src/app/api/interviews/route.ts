import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allInterviews = await db
      .select({
        id: interviews.id,
        candidateName: interviews.candidateName,
        status: interviews.status,
        createdAt: interviews.createdAt,
      })
      .from(interviews)
      .orderBy(desc(interviews.createdAt));

    return NextResponse.json(allInterviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}
