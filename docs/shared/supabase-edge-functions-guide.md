# Supabase Edge Functions — Practical Guide

## Edge Functions Overview and Use Cases

**Supabase Edge Functions are Deno-based serverless functions** running in same region as your database for low-latency operations. Best suited for database operations combined with external API calls (LLM, webhooks, payment processing) in single request. Deployed globally via Deno Deploy infrastructure. Stateless execution means no persistent connections between invocations. Cold starts add ~500ms-1s on first invocation. Good for: authentication flows, data transformation, external API orchestration, scheduled jobs. Not good for: WebSocket servers, long-running tasks, heavy computation, stateful applications.

**Summary:** Deno-based serverless functions ideal for DB + API operations, with 60s timeout and ~500ms cold start.

## Key Constraints and Limitations

**Edge Function constraints** define architectural boundaries for serverless applications. Hard 60-second timeout prevents long-running tasks—use client-side for extended operations. Stateless execution requires database for persistence between invocations. Cold starts (~500ms-1s) impact first request after idle period. Cannot reliably call other Edge Functions due to internal routing—orchestrate from client instead. Deno runtime compatibility differs from Node.js—verify npm packages before use. Request/response payload limit is 6MB. No persistent WebSocket connections from Edge Function context.

**Summary:** 60s timeout, stateless, ~500ms cold start, no Edge-to-Edge calls, 6MB payload limit, Deno-only runtime.

## Deployment and Secret Management

**Deploy Edge Functions** using Supabase CLI with project-ref targeting specific project. Single function deployment: `supabase functions deploy function-name --project-ref YOUR_REF`. Deploy all functions by omitting function name. Secrets are set with `supabase secrets set KEY=value` and accessed via Deno.env.get(). List secrets with `supabase secrets list`. Secrets are encrypted at rest and injected at runtime. Never commit secrets to version control. Update secrets without redeploying function. Project structure: supabase/functions/function-name/index.ts.

```bash
supabase functions deploy function-name --project-ref YOUR_REF
supabase secrets set API_KEY=value --project-ref YOUR_REF
```

**Summary:** Deploy with `supabase functions deploy`, manage secrets with `supabase secrets set`, access via Deno.env.get().

## Authentication Patterns

**Edge Function authentication** supports JWT tokens from Supabase Auth or custom API keys for server-to-server. Extract JWT from Authorization header, validate with supabase.auth.getUser(). This respects Row Level Security policies. For internal services, use x-internal-key header compared against INTERNAL_API_KEY secret—simpler than JWT for service-to-service. Combine approaches: JWT for user requests, API key for background jobs. Service role key bypasses RLS for admin operations. Always validate auth before processing request.

```typescript
const authHeader = req.headers.get('Authorization');
const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));

const internalKey = req.headers.get('x-internal-key');
if (internalKey !== Deno.env.get('INTERNAL_API_KEY')) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Summary:** Use JWT (supabase.auth.getUser) for users, custom API key headers for server-to-server authentication.

## CORS Configuration

**CORS headers enable cross-origin requests** from browser-based clients. Always include Access-Control-Allow-Origin, Access-Control-Allow-Headers, and Access-Control-Allow-Methods. Handle OPTIONS preflight requests by returning 200 with CORS headers before main logic. Whitelist specific headers (authorization, x-internal-key, content-type) instead of wildcard. Set Access-Control-Allow-Origin to specific domain in production, * for development. Return CORS headers in all responses, including errors. Missing CORS headers cause cryptic browser errors.

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-internal-key, content-type',
};
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
```

**Summary:** Always handle OPTIONS preflight and include CORS headers in all responses to prevent browser errors.

## Database Access from Edge Functions

**Database operations in Edge Functions** use Supabase client initialized with service role key for server-side access. Import @supabase/supabase-js from esm.sh CDN (Deno-compatible). Service role key (SUPABASE_SERVICE_ROLE_KEY) bypasses Row Level Security—use for admin operations. Regular anon key respects RLS. Client is created per-request (stateless). Database and Edge Function in same region have <10ms latency. Use typed queries for better DX. Handle errors explicitly. No connection pooling needed—Supabase manages pooling.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

**Summary:** Use service role key for admin DB access, bypassing RLS; initialize client per-request with createClient.

## External API Integration

**External API calls from Edge Functions** enable integration with LLM providers, payment processors, and webhooks. Use fetch with appropriate headers (Authorization, Content-Type). Store API keys in Supabase secrets, access via Deno.env.get(). Set reasonable timeout (default is no timeout—dangerous). Handle errors explicitly—external services can fail. Parse JSON responses with error handling. Combine DB query + external API in single Edge Function to reduce client round-trips. Log errors for debugging.

```typescript
const response = await fetch('https://api.provider.com/v1/endpoint', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('API_KEY')}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ model: 'gpt-4', messages: [...] }),
});
```

**Summary:** Use fetch for external APIs, store keys in secrets, combine with DB operations for reduced round-trips.

## Anti-Patterns and Best Practices

**Edge Function anti-patterns** cause reliability issues and debugging nightmares. Never call one Edge Function from another—internal routing fails unpredictably; orchestrate from client. Don't maintain long-running WebSocket connections—use client-side. Avoid heavy computation—Edge Functions are for I/O, not CPU. Don't store state between invocations—use database or client. Keep payloads under 6MB. Don't log sensitive data (API keys, tokens). One function per responsibility—avoid monolithic handlers. Use service_role sparingly—respect RLS when possible. Test locally with `supabase functions serve` before deploying.

**Summary:** No Edge-to-Edge calls, no WebSockets, no heavy computation, no state storage, payloads <6MB, one responsibility per function.

## Debugging and Local Development

**Debug Edge Functions** using Supabase dashboard logs and local serving for rapid iteration. Dashboard shows invocation logs with console.log/error output. Test locally: `supabase functions serve function-name` starts local Deno server. Access at http://localhost:54321/functions/v1/function-name. Local serve hot-reloads on file changes. Check secrets: `supabase secrets list --project-ref YOUR_REF`. Use curl or Postman to test endpoints. Add console.log liberally—logs appear in dashboard. Errors include stack traces. Monitor cold start times and execution duration in dashboard.

**Summary:** Use dashboard logs for production, `supabase functions serve` for local dev, console.log for debugging.

## Cost and Free Tier Limits

**Supabase Edge Functions free tier** includes 2 million invocations per month and 500,000 Edge Function invocations. Database access from Edge Functions doesn't count against additional quotas. No charge for bandwidth between database and Edge Function (same region). Free tier is per-project, not per-function. Cold starts don't count toward timeout. Exceeding limits requires Pro plan ($25/month). Monitor usage in dashboard. Free tier resets monthly. Shared code in _shared/ folder doesn't deploy as separate function.

**Summary:** 2M invocations/month free, no DB access charges from Edge Functions, $25/month Pro plan after limits.

## FAQ

**Q: Can I call one Edge Function from another?**  
A: No. Supabase internal routing is unreliable. Orchestrate from client instead—call functions sequentially or parallel.

**Q: How do I maintain WebSocket connections?**  
A: You don't. Use client-side for persistent connections. Edge Functions are stateless and timeout after 60s.

**Q: What's the difference between service_role and anon key?**  
A: Service role bypasses Row Level Security (RLS) for admin operations. Anon key respects RLS for user operations.

**Q: How do I share code between Edge Functions?**  
A: Put shared modules in supabase/functions/_shared/ (underscore prefix prevents deployment). Import with relative paths.

**Q: Can I use npm packages?**  
A: Yes, via esm.sh CDN (https://esm.sh/package-name). Verify Deno compatibility—some Node.js packages fail.

**Q: How do I test Edge Functions locally?**  
A: Run `supabase functions serve function-name`, then curl http://localhost:54321/functions/v1/function-name.
