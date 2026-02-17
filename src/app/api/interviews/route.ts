import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviews, candidates } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    const { orgId } = await getOrgContext();

    const allInterviews = await db
      .select({
        id: interviews.id,
        candidateName: candidates.name,
        status: interviews.status,
        createdAt: interviews.createdAt,
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .where(eq(interviews.orgId, orgId))
      .orderBy(desc(interviews.createdAt));

    return NextResponse.json(allInterviews);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching interviews:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}
