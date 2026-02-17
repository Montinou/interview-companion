# Interview Companion v2 — Testing Patterns

## Manual Testing Strategy

**Interview Companion v2** uses manual testing for critical paths due to rapid prototyping phase. Testing workflow: launch Tauri app → start mock interview → verify audio capture → check Deepgram transcription → validate AI insights → inspect database records → confirm Realtime updates. Test accounts use Clerk development mode with test users. Database testing uses separate Supabase project with seeded data. The `pnpm tauri dev` command enables live reload for fast iteration. Browser DevTools inspect WebSocket connections (Deepgram, Supabase Realtime). Console logs track audio stream, transcript chunks, AI analysis timing.

**Summary:** Manual testing workflow with Tauri dev mode and browser DevTools for audio capture validation and Realtime updates.

## TypeScript Type Checking

**TypeScript compiler** validates types without code execution via `pnpm type-check` (runs `tsc --noEmit`). Pre-deployment checks: type-check passes before git push. Drizzle schema exports TypeScript types for all tables. Server Components infer types from database queries. The `satisfies` keyword validates config objects against expected types. Generic types enforce Tauri command parameters: `invoke<ReturnType>(command, params)`. Zod schemas validate API request bodies with type inference. Type errors surface during development in VS Code with TypeScript language server.

```typescript
// src/app/api/analyze/route.ts:10-15
import { z } from 'zod'
const RequestSchema = z.object({
  interviewId: z.number(),
  chunk: z.object({ text: z.string(), speaker: z.string() })
})
const body = RequestSchema.parse(await req.json())
```

**Summary:** TypeScript compiler with tsc --noEmit for pre-deployment validation and Zod schemas for runtime type checking.

## Edge Function Local Testing

**Supabase CLI** runs Edge Functions locally with `supabase functions serve`. Local runtime uses Deno with hot reload on file changes. The `supabase start` command spins up local postgres database with Supabase Studio UI. Edge Function environment variables load from `.env.local` file. Test Edge Functions with curl or Bruno HTTP client. Example: `curl http://localhost:54321/functions/v1/analyze-chunk -H "x-internal-key: test123" -d '{"interviewId":1,"chunk":{...}}'`. Local testing validates CORS headers, auth checks, database operations, AI failover logic before deploying to production.

```bash
# Terminal 1: Start local Supabase
supabase start

# Terminal 2: Serve Edge Function
supabase functions serve analyze-chunk --env-file .env.local

# Terminal 3: Test with curl
curl -X POST http://localhost:54321/functions/v1/analyze-chunk \
  -H "x-internal-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"interviewId": 1, "chunk": {"text": "test", "speaker": "speaker_0"}}'
```

**Summary:** Supabase CLI local testing with supabase functions serve and curl for Edge Function validation before deployment.

## Database Migration Testing

**Drizzle Kit** generates migrations from schema changes with `pnpm db:generate`. The `drizzle/` directory contains numbered SQL migration files. Test migrations locally: `pnpm db:push` applies schema directly (skips migrations). Production uses `pnpm db:migrate` to apply migrations sequentially. Migration testing workflow: modify `schema.ts` → `db:generate` → inspect SQL file → `db:push` to local database → verify in Supabase Studio → test queries → commit migration. Rollback strategy: drop database tables, reapply migrations from clean state. The `DB-MIGRATION-LOG.md` file documents manual migration steps.

```bash
# Migration workflow
npm run db:generate      # Generate SQL from schema changes
cat drizzle/0001_*.sql   # Review SQL migration
npm run db:push          # Apply to local database
# Test queries in Supabase Studio
git add drizzle/0001_*.sql src/lib/db/schema.ts
```

**Summary:** Drizzle Kit migration workflow with db:generate and db:push for local validation before production migration.

## Tauri Command Testing

**Tauri dev mode** enables live testing of Rust commands from browser. The `pnpm tauri dev` launches Tauri webview with Next.js dev server. DevTools console calls commands: `await window.__TAURI__.core.invoke('start_capture', { interviewId: 1, config })`. Rust logs print to Tauri console (separate terminal window). Test audio capture with real microphone input or loopback devices (BlackHole on macOS). Mock WebSocket responses by modifying Deepgram URL to local echo server. Error testing: invalid parameters return Promise rejections with Rust error strings.

```typescript
// Browser DevTools console testing
const config = {
  deepgramApiKey: 'test',
  language: 'en',
  supabaseUrl: 'http://localhost:54321',
  supabaseAnonKey: 'test',
  internalApiKey: 'test123'
}
await window.__TAURI__.core.invoke('start_capture', { interviewId: 1, config })
// Check Tauri terminal for Rust logs
```

**Summary:** Tauri dev mode with browser DevTools console for testing Rust commands with real audio input and Rust logs.

## AI Provider Failover Testing

**AIManager class** implements failover logic with primary (Kimi) and fallback (Cerebras) providers. Test failover: comment out Kimi API key → verify Cerebras activates. Edge Function logs print provider name: `"provider": "kimi"` or `"provider": "cerebras"`. Simulate API failures with invalid keys or rate limit responses. Test prompt engineering: modify analysis prompt → check JSON parsing → validate insight structure. AI response validation: catch JSON parse errors, fallback to wrapped plain text response.

```typescript
// Test failover in Edge Function
const ai = buildAIManager()
// If Kimi fails, should auto-retry with Cerebras
const { result, provider } = await ai.analyze(prompt)
console.log(`Analysis completed by ${provider}`)  // "kimi" or "cerebras"
```

**Summary:** AI failover testing with commented API keys and Edge Function logs to validate provider switching and prompt responses.

## Realtime Update Testing

**Supabase Realtime** broadcasts database changes to connected clients. Test workflow: open HUD dashboard → trigger database INSERT via API → verify insight card appears on dashboard. Check browser Network tab for WebSocket connection to Supabase. Use Supabase Studio "Table Editor" to manually INSERT records and watch dashboard update. Test filter accuracy: create insight for different interview_id → verify HUD shows only matching records. Latency measurement: add timestamp to INSERT → compare with dashboard render timestamp. Reconnection testing: pause network → unpause → verify subscription resumes.

```typescript
// src/app/dashboard/hud/page.tsx testing
// 1. Open HUD in browser (http://localhost:3000/dashboard/hud?id=123)
// 2. Open Supabase Studio
// 3. Insert into ai_insights table with interview_id=123
// 4. Verify InsightCard appears in HUD within 1-2 seconds
```

**Summary:** Realtime testing with manual database INSERTs via Supabase Studio and Network tab WebSocket inspection for latency validation.

## End-to-End Interview Flow Testing

**Full interview workflow** tests audio capture through scorecard generation. Test steps: 1) Create interview via dashboard → 2) Start Tauri capture → 3) Speak test phrases → 4) Verify transcripts appear → 5) Check AI insights generate → 6) Stop capture → 7) Generate scorecard → 8) Review hiring recommendation. Use test candidates with known profiles. Mock interview scripts with red flag phrases ("I don't know", "never used that"). Verify role detection after 5+ utterances. Check speaker_role backfill on transcripts. Validate scorecard contains evidence quotes from transcripts.

```
End-to-End Test Checklist:
□ Interview creation (dashboard)
□ Tauri capture start (audio device detected)
□ Deepgram transcription (text appears in HUD)
□ AI insights generate (flags, suggestions)
□ Role detection (host/guest mapping after 5+ chunks)
□ Capture stop (graceful cleanup)
□ Scorecard generation (hiring recommendation)
□ Evidence validation (quotes match transcripts)
```

**Summary:** End-to-end interview flow testing from audio capture through scorecard generation with role detection and evidence validation.

## Performance Profiling

**Chrome DevTools Performance tab** profiles client-side rendering performance. Key metrics: Realtime update latency (INSERT → render), HUD component render time, WebSocket message processing. Profile Tauri audio thread: Rust logs print audio callback timing. Deepgram latency: measure WebSocket send → transcript response (target <3s). AI analysis latency: Edge Function execution time (CloudWatch logs or Supabase logs). Database query performance: Drizzle logs with `DRIZZLE_DEBUG=1`. Optimize: debounce Realtime handlers, memoize React components, index database columns.

```bash
# Enable Drizzle query logging
DRIZZLE_DEBUG=1 pnpm dev

# Measure Edge Function execution
supabase functions logs analyze-chunk --tail
# Look for "Duration: XXXms" in logs
```

**Summary:** Chrome DevTools and Drizzle logs for performance profiling with Realtime latency and Edge Function execution time measurement.

## FAQ

**Q: Why no unit tests?**  
A: Rapid prototyping phase prioritizes manual E2E testing. Unit tests planned for post-MVP stability phase.

**Q: How to test Deepgram without burning minutes?**  
A: Use short test phrases (<10s). One hour of testing = ~1 minute of transcription (~$0.004 cost).

**Q: Can I mock Tauri commands in browser?**  
A: Yes. Check `window.__TAURI__` existence, provide mock implementations for browser-only testing.

**Q: How to test Edge Functions without deploying?**  
A: Run `supabase functions serve` locally, test with curl or Bruno HTTP client against localhost:54321.

**Q: What's the best way to test AI prompt changes?**  
A: Use saved transcript chunks, POST to local Edge Function, compare insight output before/after prompt modification.

**Q: How to debug WebSocket disconnections?**  
A: Check browser Network tab → WS → Messages. Look for close frames with error codes. Verify CORS headers and auth tokens.
