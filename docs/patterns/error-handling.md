# Interview Companion v2 — Error Handling Patterns

## Rust Result Type in Tauri Commands

**Tauri commands** return `Result<T, String>` for explicit error handling in Rust. Success variant contains typed return value. Error variant wraps error message as String. TypeScript receives Promise that rejects with error string on Err variant. The `?` operator propagates errors up call stack. anyhow crate simplifies error conversion with `.map_err(|e| e.to_string())`. Example: cpal device errors, WebSocket connection failures, JSON parsing errors all convert to String for JavaScript consumption.

```rust
// src-tauri/src/lib.rs:5-12
#[tauri::command]
async fn start_capture(
    app: tauri::AppHandle,
    interview_id: i64,
    config: serde_json::Value,
) -> Result<String, String> {
    audio::start_capture(app, interview_id, config)
        .await
        .map_err(|e| e.to_string())  // anyhow::Error → String
}
```

**Summary:** Rust Result<T, String> type with anyhow error conversion for TypeScript Promise rejection with descriptive messages.

## Try-Catch in API Routes

**Next.js API routes** wrap logic in try-catch blocks with standardized JSON responses. Success path returns `{ ok: true, data }` with 200 status. Error path returns `{ error: string }` with appropriate status code (400, 401, 404, 500). Supabase client errors checked inline: `if (error) return Response.json({ error: error.message }, { status: 500 })`. Catch block logs error to console, returns generic 500 response. Never expose stack traces in production—only message strings.

```typescript
// src/app/api/interviews/route.ts:15-25
export async function GET(req: Request) {
  try {
    const { data, error } = await supabase.from('interviews').select('*')
    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }
    return Response.json({ ok: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Summary:** Try-catch with standardized JSON responses and inline Supabase error checking for consistent API error handling.

## Edge Function Error Boundaries

**Supabase Edge Functions** implement multi-level error handling with CORS preservation. Top-level try-catch catches all errors, returns 500 with CORS headers. Auth failures return 401 with CORS headers. Validation errors return 400 with CORS headers. AI provider failures handled by AIManager with automatic failover. Database errors logged to console, return generic error message (no SQL exposure). All error responses include corsHeaders to prevent browser CORS errors during failures.

```typescript
// supabase/functions/analyze-chunk/index.ts:140-160
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  
  try {
    // Auth check
    if (!isAuthorized(req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }
    
    // Validation
    const { interviewId, chunk } = await req.json()
    if (!interviewId) {
      return new Response(JSON.stringify({ error: "Missing interviewId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }
    
    // ... business logic ...
  } catch (error) {
    console.error("Edge Function error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
```

**Summary:** Edge Functions with multi-level error handling and CORS preservation on all error responses including auth and validation failures.

## AI Provider Failover Logic

**AIManager class** implements try-catch failover across multiple AI providers. Primary provider (Kimi) attempts analysis first. On error, catch block logs warning and tries next provider (Cerebras). If all providers exhausted, throws aggregated error. Provider errors include: API rate limits (429), network timeouts, invalid JSON responses, authentication failures. Each provider implements `analyze()` method with consistent interface. Failover transparent to caller—only final provider name returned.

```typescript
// supabase/functions/analyze-chunk/index.ts:90-105
class AIManager {
  private providers: AIProvider[]

  async analyze(prompt: string, maxTokens = 1024): Promise<{ result: string; provider: string }> {
    for (const provider of this.providers) {
      try {
        const result = await provider.analyze(prompt, maxTokens)
        return { result, provider: provider.name }
      } catch (e) {
        console.warn(`${provider.name} failed: ${e.message}, trying next...`)
      }
    }
    throw new Error("All AI providers exhausted")
  }
}
```

**Summary:** AIManager failover with try-catch loop across providers for automatic provider switching on API failures.

## Supabase Client Error Tuple Pattern

**Supabase JavaScript client** returns `{ data, error }` tuples instead of throwing. Always check error field before accessing data. Pattern: `if (error) return handleError(error)`. Null data with non-null error indicates failure. Error object contains: `message` (human-readable), `code` (postgres error code), `details` (additional context). Use error.code for specific handling (e.g., '23505' = unique constraint violation). Log full error object for debugging, return sanitized message to client.

```typescript
// src/app/actions/interviews.ts:20-30
const { data: interview, error } = await supabase
  .from('interviews')
  .select('*, candidate(*), transcripts(*)')
  .eq('id', id)
  .single()

if (error) {
  console.error('Fetch interview error:', error)
  if (error.code === 'PGRST116') {
    throw new Error('Interview not found')
  }
  throw new Error(error.message)
}

return interview  // Safe to access data
```

**Summary:** Supabase error tuple pattern with null-check before data access and error.code for specific failure handling.

## WebSocket Error Handling in Tauri

**WebSocket connections** in Rust use tokio-tungstenite with error propagation. Connection errors return via Result::Err with descriptive message. Message send failures break event loop, emit capture-error event. Deepgram authentication errors detected by initial handshake failure. Network disconnections trigger ws_rx.next() returning None. The audio thread uses anyhow::Error for all error types. Main thread catches errors, emits Tauri event to Next.js, sets IS_RECORDING to false.

```rust
// src-tauri/src/audio.rs:170-185
async fn run_websocket(...) -> Result<(), anyhow::Error> {
    let (ws_stream, _) = connect_async(request).await?;  // Connection error
    let (mut ws_tx, mut ws_rx) = ws_stream.split();

    loop {
        tokio::select! {
            Some(audio) = audio_rx.recv() => {
                if ws_tx.send(Message::Binary(audio)).await.is_err() {
                    break;  // Send error, exit loop
                }
            }
            _ = stop_rx.recv() => {
                let _ = ws_tx.close().await;
                break;
            }
        }
    }
    Ok(())
}
```

**Summary:** WebSocket error handling with anyhow::Error propagation and loop exit on send failures with Tauri event emission.

## React Error Boundaries

**React Error Boundaries** catch component render errors in production. Next.js provides `error.tsx` file convention for route-level boundaries. Error boundaries display fallback UI instead of white screen. Errors logged to console, optionally sent to error tracking service (Sentry). Boundary scoped to route segments: dashboard errors don't crash landing page. Reset mechanism: button reloads component state. Server Component errors handled by Next.js automatically with error page.

```typescript
// src/app/dashboard/error.tsx:5-15
'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('Dashboard error:', error)
  
  return (
    <div className="p-8">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-gray-600">{error.message}</p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Try again
      </button>
    </div>
  )
}
```

**Summary:** React Error Boundaries with error.tsx convention for route-level error catching and fallback UI with reset functionality.

## Realtime Subscription Error Handling

**Supabase Realtime subscriptions** handle connection errors with status callbacks. The `channel.on('system', {}, callback)` receives connection events: SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT. On error, log message and attempt reconnection. Unsubscribe cleanup in useEffect return prevents memory leaks. Network disconnections auto-reconnect when connection restored. Invalid filter syntax returns error in system event. Always check `channel.state` before sending messages.

```typescript
// src/app/dashboard/hud/page.tsx:60-75
useEffect(() => {
  const channel = supabase
    .channel('ai_insights')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ai_insights',
      filter: `interview_id=eq.${interviewId}`
    }, (payload) => setInsights(prev => [...prev, payload.new as AIInsight]))
    .on('system', {}, (status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Realtime channel error')
      }
    })
    .subscribe()
    
  return () => { channel.unsubscribe() }
}, [interviewId])
```

**Summary:** Realtime subscription error handling with system event callbacks and cleanup in useEffect for connection error detection.

## Database Migration Error Recovery

**Drizzle migrations** may fail mid-application leaving schema inconsistent. Recovery strategy: DROP all tables, reapply migrations from clean state. The `DB-MIGRATION-LOG.md` documents manual intervention steps. Test migrations locally before production with `db:push` (no migration history). Use transactions for multi-statement migrations (Drizzle Kit generates). Backup database before major migrations. If migration fails in production, rollback to previous schema snapshot, fix migration SQL, retry.

```bash
# Migration error recovery
# 1. Backup current database
pg_dump -Fc -h <host> -U <user> <db> > backup.dump

# 2. Check migration error
cat drizzle/0005_*.sql  # Review failed migration

# 3. Rollback approach A: Manual table drops
psql -h <host> -U <user> <db> -c "DROP TABLE IF EXISTS new_table CASCADE"

# 4. Rollback approach B: Restore from backup
pg_restore -h <host> -U <user> -d <db> backup.dump

# 5. Fix migration SQL, retry
npm run db:migrate
```

**Summary:** Database migration error recovery with backup, manual rollback, and migration SQL fixes before retry.

## FAQ

**Q: How to debug Tauri command errors?**  
A: Check Tauri terminal (not browser console) for Rust logs. Enable `RUST_LOG=debug` for verbose output.

**Q: Why return String instead of custom error types in Tauri?**  
A: JavaScript can't deserialize complex Rust types. String error messages are simplest cross-boundary format.

**Q: How to handle Deepgram rate limits?**  
A: Catch 429 responses in WebSocket connection, emit error event, show user notification. Retry after delay.

**Q: Can I retry failed Edge Function calls?**  
A: Yes. Implement exponential backoff in API route that calls Edge Function. Use libraries like `p-retry`.

**Q: What happens if AI provider fails during interview?**  
A: Failover to secondary provider. If both fail, transcripts still save. Generate insights retroactively later.

**Q: How to test error boundaries?**  
A: Throw error in component: `if (forceError) throw new Error('Test error')`. Toggle with URL param or state.
