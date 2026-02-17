import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Authentication error — thrown when user is not authenticated or not found.
 */
export class AuthError extends Error {
  public status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Organization context returned by getOrgContext().
 * Every data query MUST use orgId from this context.
 */
export interface OrgContext {
  /** Clerk org ID or 'personal_<clerkUserId>' for personal accounts */
  orgId: string;
  /** Internal DB user ID */
  userId: number;
  /** Clerk user ID */
  clerkId: string;
  /** Clerk org role (org:admin, org:member) or null for personal */
  orgRole: string | null;
}

/**
 * Get the authenticated user's organization context.
 * 
 * FAIL-CLOSED: Throws AuthError if not authenticated.
 * Every API route and server component MUST call this before any data access.
 * 
 * For personal accounts (no org selected), returns synthetic orgId = 'personal_<clerkUserId>'.
 * This ensures ALL data is always scoped, even without an organization.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const { userId: clerkId, orgId: clerkOrgId, orgRole } = await auth();

  if (!clerkId) {
    throw new AuthError('Not authenticated');
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!dbUser) {
    throw new AuthError('User not found in database', 403);
  }

  // If user is in an org, use that. Otherwise, personal scope.
  const orgId = clerkOrgId || `personal_${clerkId}`;

  return {
    orgId,
    userId: dbUser.id,
    clerkId,
    orgRole: orgRole || null,
  };
}

/**
 * Require specific org role. Throws 403 if role doesn't match.
 */
export async function requireOrgRole(requiredRole: 'org:admin'): Promise<OrgContext> {
  const ctx = await getOrgContext();

  if (ctx.orgRole !== requiredRole) {
    throw new AuthError('Insufficient permissions', 403);
  }

  return ctx;
}
