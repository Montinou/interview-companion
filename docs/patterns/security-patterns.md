# Interview Companion v2 — Security Patterns

## Clerk Authentication Middleware

**Clerk middleware** protects Next.js routes with session-based authentication. The `middleware.ts` file intercepts requests before route handlers execute. Protected routes: `/dashboard/*`, `/api/*` (except `/api/extension/config`). Unauthenticated requests redirect to `/sign-in`. Clerk JWT stored in HTTP-only cookie, validated on each request. The `auth()` function in Server Components retrieves userId for database queries. Clerk session expires after 7 days of inactivity. Public routes bypass middleware with `publicRoutes` config.

```typescript
// middleware.ts:5-15
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)']
}
```

**Summary:** Clerk middleware with route protection and session validation for authenticated dashboard and API access with HTTP-only cookies.

## Internal API Key for Edge Functions

**Internal API key** authenticates server-to-server calls between Next.js and Supabase Edge Functions. The `x-internal-key` header contains shared secret from environment variables. Edge Functions validate header against `INTERNAL_API_KEY` env var before processing. Prevents public access to Edge Functions (bypasses Clerk). Key rotation: update env var in Vercel + Supabase, redeploy. Key never exposed to browser—only in Tauri config (passed from Next.js env). Supabase service role key separate concern—for database admin operations.

```typescript
// supabase/functions/analyze-chunk/index.ts:150-158
Deno.serve(async (req) => {
  const internalKey = req.headers.get("x-internal-key")
  const expectedKey = Deno.env.get("INTERNAL_API_KEY")
  
  if (!internalKey || internalKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
  
  // ... business logic ...
})
```

**Summary:** Internal API key in x-internal-key header for server-to-server Edge Function authentication with environment variable validation.

## Supabase Row Level Security Bypass

**Supabase service role key** bypasses Row Level Security (RLS) policies for Edge Functions. RLS enforces user-specific data isolation at database level. Edge Functions use service role key from `SUPABASE_SERVICE_ROLE_KEY` env var. Browser-side Next.js uses anon key with RLS enabled. Service role allows cross-user operations: AI analysis on any interview, role detection updates, scorecard generation. RLS policies enforce: users see only their interviews, candidates see nothing (no direct access). Edge Functions trusted server context—internal key prevents abuse.

```typescript
// supabase/functions/analyze-chunk/index.ts:165-170
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // Bypasses RLS
)

// Query any interview regardless of owner
const { data: interview } = await supabase
  .from("interviews")
  .select("*")
  .eq("id", interviewId)
  .single()
```

**Summary:** Supabase service role key in Edge Functions bypasses RLS for trusted server operations with internal key protection.

## Environment Variable Security

**Environment variables** separate secrets from codebase with `.env.local` and Vercel dashboard. Variables prefixed `NEXT_PUBLIC_` exposed to browser (Supabase anon key, Clerk publishable key). Secrets without prefix server-only (Clerk secret key, Deepgram API key, internal API key, service role key). The `.gitignore` excludes `.env.local` from version control. Production uses Vercel environment variables UI with encrypted storage. Tauri receives secrets via config object (passed from Next.js Server Component, never hardcoded). The `.env.example` documents required variables without values.

```bash
# .env.local (server-only secrets)
DATABASE_URL=postgres://...
CLERK_SECRET_KEY=sk_...
DEEPGRAM_API_KEY=...
MOONSHOT_API_KEY=...
CEREBRAS_API_KEY=...
INTERNAL_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Browser-exposed (NEXT_PUBLIC_)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_DEEPGRAM_API_KEY=...  # Only for Tauri, not browser
NEXT_PUBLIC_INTERNAL_API_KEY=...   # Only for Tauri, not browser
```

**Summary:** Environment variables with NEXT_PUBLIC_ prefix for browser exposure and .env.local exclusion from version control.

## CORS Headers on Edge Functions

**CORS headers** allow browser requests to Supabase Edge Functions from Next.js domain. The `corsHeaders` object defines: `Access-Control-Allow-Origin: *` (accept all origins), `Access-Control-Allow-Headers` (authorization, x-internal-key, apikey), `Access-Control-Allow-Methods` (POST, OPTIONS). OPTIONS preflight requests return 200 with CORS headers. All error responses include CORS headers to prevent browser CORS errors. Production should restrict `Allow-Origin` to specific domain (e.g., `https://app.example.com`) instead of wildcard.

```typescript
// supabase/functions/analyze-chunk/index.ts:5-10
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // TODO: Restrict in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  // ... all responses include corsHeaders ...
})
```

**Summary:** CORS headers on Edge Functions with OPTIONS preflight handling and error response inclusion for browser compatibility.

## Input Validation and Sanitization

**Input validation** prevents injection attacks and ensures data integrity. API routes validate request bodies with Zod schemas. Edge Functions check required fields, reject malformed data with 400 status. TypeScript types enforce compile-time validation. Database queries use Drizzle parameterized queries (no raw SQL concatenation). AI prompts escape user input to prevent prompt injection (though LLM isolation mitigates). Transcript text stored as-is (no HTML rendering)—XSS risk low. File uploads (future CV parsing) validate MIME types and file extensions.

```typescript
// src/app/api/analyze/route.ts:10-20
import { z } from 'zod'

const RequestSchema = z.object({
  interviewId: z.number().int().positive(),
  chunk: z.object({
    text: z.string().min(1).max(5000),
    speaker: z.string().regex(/^speaker_\d+$/),
    timestamp: z.string().datetime(),
    confidence: z.number().min(0).max(1).optional(),
  })
})

export async function POST(req: Request) {
  const body = RequestSchema.parse(await req.json())  // Throws on invalid
  // ... validated body ...
}
```

**Summary:** Input validation with Zod schemas and Drizzle parameterized queries for injection prevention and type safety.

## Tauri Security Context

**Tauri app** runs with restricted system permissions via capability declarations. Audio capture requires microphone permission (macOS: Info.plist entry). WebSocket connections allowed via Tauri's network capability. Local file access limited to app data directory. The Tauri context security model: Rust backend (privileged), JavaScript frontend (sandboxed). Commands bridge with explicit `#[tauri::command]` decoration. No arbitrary command execution—only whitelisted functions. CSP headers prevent inline script execution. App notarized on macOS for Gatekeeper approval.

```json
// src-tauri/tauri.conf.json:40-50
{
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://*.supabase.co https://api.deepgram.com",
    "dangerousDisableAssetCspModification": false
  },
  "permissions": [
    "audio-capture",
    "network-request"
  ]
}
```

**Summary:** Tauri security context with capability-based permissions and CSP headers for sandboxed frontend with explicit command bridge.

## Deepgram API Key Management

**Deepgram API key** stored as environment variable, passed to Tauri at runtime. Key never hardcoded in Rust source. Browser never accesses key directly—only Tauri backend. Key used in WebSocket Authorization header: `Token <key>`. Deepgram doesn't support key rotation—regenerate via dashboard, update env var. Monitor usage via Deepgram dashboard to detect anomalies. Free tier 12K minutes—rate limit prevents abuse. If key compromised, regenerate immediately, update all deployments.

```rust
// src-tauri/src/audio.rs:175-180
let request = tokio_tungstenite::tungstenite::http::Request::builder()
    .uri(&url)
    .header("Authorization", format!("Token {}", deepgram_key))  // From config param
    .header("Host", "api.deepgram.com")
    .body(())?;

let (ws_stream, _) = connect_async(request).await?;
```

**Summary:** Deepgram API key from environment variables with Authorization header and usage monitoring for abuse detection.

## Database Connection Security

**Database connections** use SSL/TLS encryption with Supabase postgres. Connection string format: `postgres://user:password@host:5432/db?sslmode=require`. The sslmode=require enforces encrypted connection, rejects insecure fallback. Drizzle client uses postgres.js driver with connection pooling (max 10 connections). Service role key and database password never in frontend code. Connection strings in environment variables only. Vercel automatically injects env vars at runtime (encrypted at rest). Database firewall restricts connections to Vercel/Supabase IP ranges.

```typescript
// src/lib/db/index.ts:5-10
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!  // SSL enforced
const client = postgres(connectionString, { max: 10 })
export const db = drizzle(client)
```

**Summary:** Database SSL/TLS encryption with connection string security and Vercel environment variable injection for credential protection.

## Clerk Webhook Signature Verification

**Clerk webhooks** sync user creation to database with signature verification. Webhook endpoint: `/api/webhooks/clerk`. Requests include `svix-signature` header with HMAC-SHA256 signature. Verify signature using `@clerk/webhook` package and webhook secret from Clerk dashboard. Reject unverified requests with 401 status. Webhook creates user in database on `user.created` event. Idempotent: ignore duplicate events by checking existing clerkId. Webhook secret stored in environment variable, rotated periodically.

```typescript
// src/app/api/webhooks/clerk/route.ts:10-25
import { Webhook } from '@clerk/webhook'

export async function POST(req: Request) {
  const payload = await req.text()
  const headers = {
    'svix-signature': req.headers.get('svix-signature')!,
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
  }
  
  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  try {
    const event = webhook.verify(payload, headers)
    if (event.type === 'user.created') {
      await db.insert(users).values({ clerkId: event.data.id, email: event.data.email })
    }
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }
}
```

**Summary:** Clerk webhook signature verification with HMAC-SHA256 and @clerk/webhook for secure user sync to database.

## FAQ

**Q: Why not use Supabase Auth instead of Clerk?**  
A: Clerk has better Next.js 16 integration, built-in UI components, simpler middleware. Supabase Auth requires more boilerplate.

**Q: How to prevent INTERNAL_API_KEY leaks?**  
A: Never log it, never commit to git, rotate periodically. Use secrets manager (Vercel env vars) with team access control.

**Q: Can users access other users' interviews via API?**  
A: No. API routes check Clerk auth, filter queries by interviewer_id. RLS enforces isolation at database level.

**Q: Why pass Deepgram key to Tauri instead of storing in Tauri?**  
A: Centralized secret management in Next.js env. Tauri rebuild not needed for key rotation. Config-driven is more flexible.

**Q: How to detect compromised API keys?**  
A: Monitor usage dashboards (Deepgram, Moonshot, Cerebras). Set up alerts for unusual traffic spikes. Check Vercel logs for failed auth.

**Q: What's the attack surface of Tauri app?**  
A: Microphone access, network requests, local storage. CSP prevents XSS. No arbitrary code execution. Notarization validates integrity.
