import { db } from '@/lib/db';
import { interviews, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

/**
 * Get the Clerk user's internal DB user ID.
 * Returns null if not authenticated.
 */
async function getDbUserId(): Promise<number | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  return dbUser?.id ?? null;
}

/**
 * Find the currently active (live) interview for the authenticated user,
 * or the most recent one. Returns null if not authenticated or no interviews.
 */
export async function getActiveInterview() {
  const userId = await getDbUserId();
  if (!userId) return null;

  // First try live
  const live = await db.query.interviews.findFirst({
    where: and(
      eq(interviews.interviewerId, userId),
      eq(interviews.status, 'live'),
    ),
    with: { candidate: true },
    orderBy: [desc(interviews.startedAt)],
  });
  if (live) return live;

  // Fallback to most recent completed
  const recent = await db.query.interviews.findFirst({
    where: eq(interviews.interviewerId, userId),
    with: { candidate: true },
    orderBy: [desc(interviews.updatedAt)],
  });
  return recent || null;
}
