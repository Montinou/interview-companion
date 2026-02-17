# Interview Companion v2 — Coding Conventions

## TypeScript Strict Mode

**TypeScript 5.9 strict mode** enforces type safety across the codebase with `strict: true` in `tsconfig.json`. All variables require explicit types or inference from initialization. Functions declare parameter types and return types. The codebase uses `satisfies` keyword for config objects to preserve literal types while checking structure. Nullable types use `| null` or `| undefined` explicitly. The `noEmit` flag in `tsconfig.json` validates types without generating JavaScript. ESM module resolution with `"type": "module"` in `package.json` and `"moduleResolution": "bundler"` in `tsconfig.json`.

```typescript
// src/lib/db/schema.ts:5-10
export const interviews = pgTable('interviews', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'),
}) satisfies ReturnType<typeof pgTable>
```

**Summary:** TypeScript 5.9 strict mode with explicit types, satisfies keyword, and ESM module resolution for type safety.

## React Server Components Pattern

**Next.js 16 Server Components** are default for all components unless marked with `"use client"`. Server components fetch data directly with async/await, no useState or useEffect. Client components handle interactivity (click handlers, forms, Realtime subscriptions). The `app/` directory uses colocation: `page.tsx` (route), `layout.tsx` (wrapper), `loading.tsx` (Suspense fallback), `error.tsx` (Error Boundary). Client components import from `@tauri-apps/api` for desktop features. Server actions in `app/actions/` use `"use server"` directive for form mutations.

```typescript
// src/app/dashboard/interviews/page.tsx:1-5
// Server Component (default) — no "use client"
export default async function InterviewsPage() {
  const interviews = await db.query.interviews.findMany()
  return <InterviewsList data={interviews} />
}
```

**Summary:** Server Components default with async data fetching and Client Components for interactivity with "use client" directive.

## Async Error Handling Pattern

**Async functions** use try-catch blocks with typed error objects. API routes return standardized JSON responses: `{ ok: true, data }` for success, `{ error: string }` for failures. Supabase client returns `{ data, error }` tuples checked inline. Tauri commands return `Result<T, String>` in Rust, converted to Promise rejection in TypeScript. Edge Functions catch errors with `catch (error)` and return 500 responses with error message. The codebase avoids throwing raw errors—always wrap in descriptive strings.

```typescript
// src/app/api/interviews/route.ts:10-15
try {
  const { data, error } = await supabase.from('interviews').select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, data })
} catch (error) {
  return Response.json({ error: error.message }, { status: 500 })
}
```

**Summary:** Try-catch blocks with typed errors and standardized JSON responses for API routes and Edge Functions.

## Database Query Pattern

**Drizzle ORM queries** use builder pattern with postgres.js driver. Queries prefer `db.query.tableName.findMany()` syntax over raw SQL. Relations use `with: { relation: true }` for joins. Filters use `where: eq(table.column, value)` instead of raw conditions. The `db.select().from(table).where()` chain is for complex queries. All queries await results with TypeScript inference. Server Components query directly, Client Components fetch via API routes. Edge Functions use Supabase client with service role key to bypass RLS.

```typescript
// src/app/actions/interviews.ts:10-15
const interview = await db.query.interviews.findFirst({
  where: eq(interviews.id, id),
  with: {
    candidate: true,
    transcripts: { orderBy: (t, { asc }) => [asc(t.timestamp)] }
  }
})
```

**Summary:** Drizzle ORM with builder pattern queries, relation loading, and TypeScript inference for type-safe database access.

## Component Styling Pattern

**Tailwind CSS utility classes** style all components with `className` prop. The `cn()` helper from `lib/utils.ts` merges classes with tailwind-merge. Class Variance Authority (CVA) defines component variants with type-safe props. Components avoid inline styles—use Tailwind utilities or CSS variables for dynamic values. Dark mode uses `dark:` prefix with `className="dark"` on `<html>`. Framer Motion animation props (initial, animate, exit) sit alongside className. Colors reference Tailwind theme: `bg-blue-500`, `text-gray-900`, `border-red-500`.

```typescript
// src/components/InsightCard.tsx:20-25
const severityColors = {
  critical: "bg-red-500/10 border-red-500",
  warning: "bg-yellow-500/10 border-yellow-500",
  info: "bg-blue-500/10 border-blue-500",
}
<div className={cn("rounded-lg p-4", severityColors[severity])} />
```

**Summary:** Tailwind utilities with cn() helper and CVA variants for type-safe component styling with dark mode support.

## Tauri Command Pattern

**Tauri commands** expose Rust functions to JavaScript via `#[tauri::command]` macro. Commands use async/await in both Rust and TypeScript. The `invoke` function from `@tauri-apps/api/core` calls commands by name. Parameters serialize to JSON automatically. Return types must implement `serde::Serialize`. Error handling: Rust returns `Result<T, String>`, TypeScript catches as Promise rejection. Commands access app state via `tauri::AppHandle` parameter. The `lib.rs` file registers commands in `generate_handler![]` macro.

```rust
// src-tauri/src/lib.rs:5-10
#[tauri::command]
async fn start_capture(
    app: tauri::AppHandle,
    interview_id: i64,
    config: serde_json::Value
) -> Result<String, String> {
    audio::start_capture(app, interview_id, config).await
}
```

```typescript
// src/lib/tauri/client.ts:10-15
import { invoke } from '@tauri-apps/api/core'
export async function startCapture(interviewId: number, config: object) {
  return await invoke<string>('start_capture', { interviewId, config })
}
```

**Summary:** Tauri commands with #[tauri::command] macro and invoke() for type-safe Rust-JavaScript communication.

## Realtime Subscription Pattern

**Supabase Realtime subscriptions** listen for database changes via WebSocket. Client components use `useEffect` with cleanup to manage subscriptions. The `supabase.channel()` creates a channel, `.on()` registers listeners, `.subscribe()` activates. Filter syntax: `filter: 'interview_id=eq.123'` for row-level filtering. Payload structure: `{ new: Record, old: Record, eventType: 'INSERT' | 'UPDATE' | 'DELETE' }`. The `useEffect` return function calls `channel.unsubscribe()` to prevent memory leaks. Subscriptions work with Supabase Realtime enabled on table in database settings.

```typescript
// src/app/dashboard/hud/page.tsx:50-60
useEffect(() => {
  const channel = supabase
    .channel('ai_insights')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ai_insights',
      filter: `interview_id=eq.${interviewId}`
    }, (payload) => setInsights(prev => [...prev, payload.new as AIInsight]))
    .subscribe()
  return () => { channel.unsubscribe() }
}, [interviewId])
```

**Summary:** Supabase Realtime with useEffect cleanup for WebSocket subscriptions with row-level filtering and type-safe payloads.

## Edge Function Structure Pattern

**Supabase Edge Functions** follow consistent structure: CORS headers, auth check, input validation, database operations, AI calls, response. CORS headers allow `Access-Control-Allow-Origin: *` for browser requests. Auth uses `x-internal-key` header matched against `INTERNAL_API_KEY` env var. Input validation checks required fields, returns 400 on missing data. Database operations use Supabase service role client to bypass RLS. AI provider abstraction with failover logic retries on errors. Response format: `{ ok: true, data }` with CORS headers.

```typescript
// supabase/functions/analyze-chunk/index.ts:140-150
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  
  const internalKey = req.headers.get("x-internal-key")
  if (internalKey !== Deno.env.get("INTERNAL_API_KEY")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  
  const { interviewId, chunk } = await req.json()
  if (!interviewId) return new Response(JSON.stringify({ error: "Missing interviewId" }), { status: 400 })
  // ... database + AI logic ...
})
```

**Summary:** Edge Functions with CORS, internal auth, input validation, service role database access, and standardized responses.

## Environment Variable Pattern

**Environment variables** load from `.env.local` (dev) and `.env.production` (prod) with dotenv. Next.js uses `process.env.VARIABLE_NAME`, Deno uses `Deno.env.get("VARIABLE_NAME")`. Variables prefixed with `NEXT_PUBLIC_` are exposed to browser. Secrets (API keys, database URLs) never use NEXT_PUBLIC_ prefix. The `.env.example` file documents required variables. Vercel deployment uses environment variables UI for production secrets. Tauri app receives config via Tauri command parameters (passed from Next.js which reads from env).

```bash
# .env.local structure
DATABASE_URL=postgres://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
DEEPGRAM_API_KEY=...
MOONSHOT_API_KEY=...
CEREBRAS_API_KEY=...
INTERNAL_API_KEY=...
```

**Summary:** Environment variables with .env.local for dev and Vercel UI for production with NEXT_PUBLIC_ for browser-exposed vars.

## FAQ

**Q: When to use Server vs Client Components?**  
A: Server Components for data fetching, Client Components for interactivity (hooks, events, Tauri, Realtime).

**Q: How to share types between Next.js and Tauri?**  
A: Export types from `src/lib/db/schema.ts`, import in both Next.js components and Tauri command wrappers.

**Q: Why CVA over styled-components?**  
A: CVA works with Tailwind utilities, no runtime CSS-in-JS overhead, type-safe variants with IntelliSense.

**Q: How to test Tauri commands locally?**  
A: Run `pnpm tauri dev` to launch Tauri webview with Next.js dev server. Invoke commands from browser DevTools.

**Q: Can Edge Functions use Node.js packages?**  
A: No. Deno runtime only supports Deno/JSR packages. Use Deno-compatible alternatives (e.g., `@std/node` for Node APIs).

**Q: How to debug Realtime subscriptions?**  
A: Check Supabase dashboard → Database → Replication → table is published. Use `channel.on('system', {}, console.log)` for connection status.
