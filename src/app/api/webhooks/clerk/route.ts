import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { organizations, orgMemberships, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Clerk Webhook Handler
 * 
 * Handles:
 * - organization.created → create org record
 * - organization.updated → update org record
 * - organization.deleted → delete org record + memberships
 * - organizationMembership.created → add membership
 * - organizationMembership.deleted → remove membership
 * - user.created → create user record + personal org scope
 */
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Verify webhook signature
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: any;
  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const { type, data } = event;
  console.log(`[Clerk Webhook] ${type}`, data?.id || data?.organization?.id || '');

  try {
    switch (type) {
      // ── Organization Events ──────────────────────────────────
      case 'organization.created':
      case 'organization.updated': {
        await db
          .insert(organizations)
          .values({
            clerkOrgId: data.id,
            name: data.name,
            slug: data.slug,
            imageUrl: data.image_url,
          })
          .onConflictDoUpdate({
            target: organizations.clerkOrgId,
            set: {
              name: data.name,
              slug: data.slug,
              imageUrl: data.image_url,
              updatedAt: new Date(),
            },
          });
        break;
      }

      case 'organization.deleted': {
        // Remove all memberships first, then the org
        await db.delete(orgMemberships).where(eq(orgMemberships.orgId, data.id));
        await db.delete(organizations).where(eq(organizations.clerkOrgId, data.id));
        // Note: data tables with this org_id are NOT deleted — they become orphaned
        // but inaccessible (no membership = no access). Admin cleanup later.
        break;
      }

      // ── Membership Events ───────────────────────────────────
      case 'organizationMembership.created': {
        const memberClerkId = data.public_user_data?.user_id;
        const orgClerkId = data.organization?.id;
        if (!memberClerkId || !orgClerkId) break;

        const dbUser = await db.query.users.findFirst({
          where: eq(users.clerkId, memberClerkId),
        });
        if (!dbUser) {
          console.warn(`[Clerk Webhook] User ${memberClerkId} not found in DB, skipping membership`);
          break;
        }

        const role = data.role === 'org:admin' ? 'admin' : 'member';

        await db
          .insert(orgMemberships)
          .values({
            userId: dbUser.id,
            orgId: orgClerkId,
            role,
          })
          .onConflictDoNothing(); // Idempotent
        break;
      }

      case 'organizationMembership.updated': {
        const memberClerkId2 = data.public_user_data?.user_id;
        const orgClerkId2 = data.organization?.id;
        if (!memberClerkId2 || !orgClerkId2) break;

        const dbUser2 = await db.query.users.findFirst({
          where: eq(users.clerkId, memberClerkId2),
        });
        if (!dbUser2) break;

        const role2 = data.role === 'org:admin' ? 'admin' : 'member';
        await db
          .update(orgMemberships)
          .set({ role: role2 })
          .where(
            and(
              eq(orgMemberships.userId, dbUser2.id),
              eq(orgMemberships.orgId, orgClerkId2),
            )
          );
        break;
      }

      case 'organizationMembership.deleted': {
        const memberClerkId3 = data.public_user_data?.user_id;
        const orgClerkId3 = data.organization?.id;
        if (!memberClerkId3 || !orgClerkId3) break;

        const dbUser3 = await db.query.users.findFirst({
          where: eq(users.clerkId, memberClerkId3),
        });
        if (!dbUser3) break;

        await db
          .delete(orgMemberships)
          .where(
            and(
              eq(orgMemberships.userId, dbUser3.id),
              eq(orgMemberships.orgId, orgClerkId3),
            )
          );
        break;
      }

      // ── User Events ─────────────────────────────────────────
      case 'user.created': {
        const email = data.email_addresses?.[0]?.email_address;
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

        if (!email) {
          console.warn('[Clerk Webhook] user.created without email, skipping');
          break;
        }

        await db
          .insert(users)
          .values({
            clerkId: data.id,
            email,
            name,
          })
          .onConflictDoUpdate({
            target: users.clerkId,
            set: { email, name },
          });
        break;
      }

      case 'user.updated': {
        const email2 = data.email_addresses?.[0]?.email_address;
        const name2 = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

        await db
          .update(users)
          .set({ email: email2, name: name2 })
          .where(eq(users.clerkId, data.id));
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Clerk Webhook] Error handling ${type}:`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
