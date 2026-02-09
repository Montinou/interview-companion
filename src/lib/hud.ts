import { db } from '@/lib/db';
import { interviews } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Find the currently active (live) interview, or the most recent one.
 */
export async function getActiveInterview() {
  // First try live
  const live = await db.query.interviews.findFirst({
    where: eq(interviews.status, 'live'),
    with: { candidate: true },
    orderBy: [desc(interviews.startedAt)],
  });
  if (live) return live;

  // Fallback to most recent completed
  const recent = await db.query.interviews.findFirst({
    with: { candidate: true },
    orderBy: [desc(interviews.updatedAt)],
  });
  return recent || null;
}
