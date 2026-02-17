# Plan: Organizations & Multi-Tenancy

## Goal
Complete data isolation between organizations. Every query, every API route, every Edge Function 
must scope data to the authenticated user's organization. Zero cross-org data leakage.

## Architecture Decisions

### Clerk Organizations (built-in)
- Clerk @clerk/nextjs 6.37.3 already supports organizations
- `auth().orgId` returns current org in server components
- `<OrganizationSwitcher />` pre-built component
- Webhooks for org.created, org.membership events
- Roles: org:admin, org:member (Clerk built-in)

### Data Isolation Strategy: `org_id` on every table
- Every data table gets `org_id VARCHAR(256) NOT NULL`
- `org_id` = Clerk org ID (e.g., `org_2abc123`)
- All queries filter by `org_id` — no exceptions
- Supabase RLS as second layer of defense
- Personal accounts (no org) use a synthetic `org_id = 'personal_' + clerkUserId`

### Why org_id on every table (not just interviews)?
- `candidates` — org A's candidates must not appear in org B's search
- `interview_profiles` — templates are org-scoped (shared within team)
- `job_positions` — positions are org-specific
- `transcripts`, `ai_insights`, `scorecards` — inherit isolation from interview, 
  but adding org_id enables direct RLS without JOINs (faster, safer)

## Tables to Modify

| Table | Change | Notes |
|-------|--------|-------|
| `users` | Add `org_memberships` relation | User can be in multiple orgs |
| `organizations` | **NEW TABLE** | Synced from Clerk webhooks |
| `org_memberships` | **NEW TABLE** | user_id + org_id + role |
| `candidates` | Add `org_id` | Candidates belong to an org |
| `job_positions` | Add `org_id` | Positions belong to an org |
| `interview_profiles` | Add `org_id` | Templates shared within org |
| `interviews` | Add `org_id` | Primary isolation point |
| `transcripts` | Add `org_id` | Denormalized for RLS perf |
| `ai_insights` | Add `org_id` | Denormalized for RLS perf |
| `scorecards` | Add `org_id` | Denormalized for RLS perf |

## Roles

| Role | Can do |
|------|--------|
| `org:admin` | Everything + invite/remove members, manage org settings |
| `org:member` (interviewer) | Create interviews, profiles, use HUD, see all org interviews |
| `org:viewer` | Read-only: view scorecards, transcripts, insights (for hiring managers) |

Note: Viewer role = Phase 2. Start with admin + member only.

## Implementation Phases

### Phase 1: Schema + Webhook (no breaking changes)
1. Create `organizations` and `org_memberships` tables in Drizzle
2. Add `org_id` column to all data tables (NULLABLE initially for migration)
3. Push schema to Supabase
4. Create Clerk webhook endpoint for org events
5. Backfill existing data with synthetic personal org_id
6. Make `org_id` NOT NULL after backfill

### Phase 2: Query Layer — The Critical Part
1. Create `getOrgId()` helper — single source of truth
2. Update EVERY API route to filter by org_id
3. Update EVERY server component query
4. Update Edge Functions to accept/validate org_id
5. Update `getActiveInterview()` to use org_id

### Phase 3: UI
1. Add `<OrganizationSwitcher />` to navbar
2. Create `/dashboard/settings/team` page
3. Update HUD to show org context
4. Profile builder creates profiles under current org

### Phase 4: RLS (defense in depth)
1. Enable RLS on all tables
2. Create policies: `org_id = current_setting('app.org_id')`
3. Set `app.org_id` in connection via Drizzle middleware

## Critical Safety Rules

1. **No query without org_id** — Every SELECT, INSERT, UPDATE, DELETE must include org_id
2. **Helper function, not manual** — Always use `getOrgId()`, never raw `auth().orgId`
3. **Fail closed** — If org_id is null/undefined, return 403, never proceed
4. **Edge Functions** — org_id passed as parameter, validated against JWT
5. **Realtime subscriptions** — filter by org_id in channel subscription
6. **Test with 2 orgs** — Always verify data isolation with two separate org accounts

## getOrgId() Helper Design

```typescript
// src/lib/auth.ts
export async function getOrgContext(): Promise<{ orgId: string; userId: number }> {
  const { userId: clerkId, orgId: clerkOrgId } = await auth();
  
  if (!clerkId) throw new AuthError('Not authenticated');
  
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!dbUser) throw new AuthError('User not found');

  // If user is in an org, use that. Otherwise, personal scope.
  const orgId = clerkOrgId || `personal_${clerkId}`;
  
  return { orgId, userId: dbUser.id };
}
```

## Migration Strategy

1. Add columns as NULLABLE
2. Backfill: UPDATE candidates SET org_id = 'personal_user_xxx' WHERE org_id IS NULL
3. ALTER COLUMN SET NOT NULL
4. Add indexes on org_id
5. Zero downtime — no breaking changes at any step

## Files to Touch

### New Files
- `src/lib/auth.ts` — getOrgContext() helper
- `src/app/api/webhooks/clerk/route.ts` — org webhook handler
- `src/app/dashboard/settings/team/page.tsx` — team management
- `supabase/migrations/add_organizations.sql` — SQL migration

### Modified Files (EVERY API route)
- `src/lib/db/schema.ts` — new tables + org_id columns
- `src/lib/hud.ts` — use getOrgContext()
- `src/app/api/hud/*/route.ts` (5 files) — add org_id filter
- `src/app/api/interviews/*/route.ts` (7 files) — add org_id filter
- `src/app/api/profiles/*/route.ts` (3 files) — add org_id filter
- `src/app/api/analyze/route.ts` — validate org_id
- `src/app/api/interview-data/route.ts` — add org_id filter
- `src/app/api/scorecards/compare/route.ts` — add org_id filter
- `src/app/dashboard/layout.tsx` — add OrgSwitcher
- `src/app/dashboard/hud/page.tsx` — Supabase realtime with org_id filter
- `supabase/functions/*/index.ts` (4 files) — accept/validate org_id
- `middleware.ts` — add webhook to public routes
