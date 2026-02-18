import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { candidates } from '@/lib/db/schema';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { getOrgContext, AuthError } from '@/lib/auth';

// GET: List/search candidates for current org
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await getOrgContext();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    let results;
    if (query && query.length >= 2) {
      const pattern = `%${query}%`;
      results = await db.query.candidates.findMany({
        where: (c, { and, eq: eq_, or: or_, ilike: ilike_ }) =>
          and(
            eq_(c.orgId, orgId),
            or_(
              sql`${c.name} ILIKE ${pattern}`,
              sql`${c.email} ILIKE ${pattern}`,
            ),
          ),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: 20,
      });
    } else {
      results = await db.query.candidates.findMany({
        where: eq(candidates.orgId, orgId),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: 50,
      });
    }

    return NextResponse.json({ candidates: results });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET candidates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
