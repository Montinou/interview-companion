import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviews, candidates } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allInterviews = await db
      .select({
        id: interviews.id,
        candidateName: candidates.name,
        status: interviews.status,
        createdAt: interviews.createdAt,
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .orderBy(desc(interviews.createdAt));

    return NextResponse.json(allInterviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}
