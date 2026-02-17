import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getOrgContext } from '@/lib/auth';

/**
 * Find the currently active (live) interview for the authenticated user's org,
 * or the most recent one. Returns null if not authenticated or no interviews.
 */
export async function getActiveInterview() {
  const { orgId } = await getOrgContext();

  // First try live
  const live = await db.query.interviews.findFirst({
    where: and(
      eq(interviews.orgId, orgId),
      eq(interviews.status, 'live'),
    ),
    with: { candidate: true },
    orderBy: [desc(interviews.startedAt)],
  });
  if (live) return live;

  // Fallback to most recent completed
  const recent = await db.query.interviews.findFirst({
    where: eq(interviews.orgId, orgId),
    with: { candidate: true },
    orderBy: [desc(interviews.updatedAt)],
  });
  return recent || null;
}
