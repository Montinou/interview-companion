import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviews, scorecards, candidates as candidatesTable } from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext();
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10));

    if (ids.some(id => isNaN(id))) {
      return NextResponse.json({ error: 'Invalid interview IDs' }, { status: 400 });
    }

    // Fetch interviews scoped to this org
    const results = await db
      .select({
        id: interviews.id,
        candidateName: candidatesTable.name,
        status: interviews.status,
        scorecard: scorecards,
      })
      .from(interviews)
      .leftJoin(candidatesTable, eq(interviews.candidateId, candidatesTable.id))
      .leftJoin(scorecards, eq(interviews.id, scorecards.interviewId))
      .where(and(inArray(interviews.id, ids), eq(interviews.orgId, orgId)));

    const candidatesMap = new Map();
    
    results.forEach(row => {
      if (!candidatesMap.has(row.id)) {
        candidatesMap.set(row.id, {
          id: row.id,
          name: row.candidateName || `Interview ${row.id}`,
          status: row.status,
          scorecard: null,
        });
      }
      
      if (row.scorecard) {
        candidatesMap.get(row.id).scorecard = {
          attitude: row.scorecard.attitude,
          communication: row.scorecard.communication,
          technical: row.scorecard.technical,
          strategic: row.scorecard.strategic,
          leadership: row.scorecard.leadership,
          english: row.scorecard.english,
        };
      }
    });

    return NextResponse.json({ candidates: Array.from(candidatesMap.values()) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error fetching scorecards for comparison:', error);
    return NextResponse.json({ error: 'Failed to fetch scorecards' }, { status: 500 });
  }
}
