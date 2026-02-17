# Interview Companion v2 — Tech Stack

## Frontend Framework

**Next.js 16.1** powers the Interview Companion dashboard with React 19.2 Server Components and App Router architecture. The framework uses Turbopack for dev builds, enabling sub-second hot reload. Clerk 6.37.3 handles authentication with session management and protected routes. Tailwind CSS 4.1 with PostCSS provides utility-first styling with dark mode support. Framer Motion 12.33 adds smooth animations to insight cards and timeline components. The app deploys to Vercel with edge runtime support for optimal performance.

```json
// package.json dependencies
"next": "16.1.6",
"react": "19.2.4",
"@clerk/nextjs": "6.37.3"
```

**Summary:** Next.js 16 + React 19 + Clerk auth + Tailwind CSS 4 for modern dashboard UI with Server Components.

## Database Layer

**Supabase PostgreSQL** stores interview data with Drizzle ORM 0.45.1 for type-safe queries. The postgres.js 3.4.8 driver connects directly (no Supabase client for queries). Schema includes 8 tables: users, candidates, interviews, transcripts, ai_insights, scorecards, job_positions. Drizzle Kit handles migrations with `drizzle-kit generate` and `drizzle-kit push`. Database credentials live in `.env.local` with `DATABASE_URL` connection string. Supabase Realtime broadcasts INSERT events on ai_insights table for live dashboard updates.

```typescript
// drizzle.config.ts
export default {
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! }
}
```

**Summary:** Supabase postgres + Drizzle ORM + postgres.js for type-safe database access with Realtime broadcasting.

## Desktop Audio Capture

**Tauri v2.10** provides native desktop app with Rust backend for audio capture. The cpal 0.15 crate accesses macOS CoreAudio for low-latency microphone input. Audio streams as PCM16 linear samples at 48kHz. Tokio 1.x async runtime handles WebSocket connections to Deepgram. tokio-tungstenite 0.24 manages WebSocket lifecycle with futures-util for stream processing. reqwest 0.12 HTTP client POSTs transcript chunks to Supabase Edge Functions with native-tls support.

```toml
// src-tauri/Cargo.toml
tauri = "2.10.0"
cpal = "0.15"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = "0.24"
```

**Summary:** Tauri v2 + cpal + tokio for native macOS audio capture with WebSocket streaming to Deepgram.

## Speech-to-Text Provider

**Deepgram nova-3** transcribes audio in real-time via WebSocket API. The model uses multichannel diarization to detect multiple speakers (host vs guest). Smart formatting enables punctuation and capitalization. Configuration: `language=en|es|multi`, `interim_results=false`, `utterance_end_ms=1500`, `encoding=linear16`, `sample_rate=48000`. Deepgram returns JSON with transcript text, speaker ID, confidence score, and word-level timestamps. Free tier provides 12,000 minutes monthly which covers ~200 hour-long interviews.

```rust
// src-tauri/src/audio.rs:170-175
let url = format!(
  "wss://api.deepgram.com/v1/listen?model=nova-3&language={}&diarize=true&interim_results=false",
  language
);
request.header("Authorization", format!("Token {}", deepgram_key))
```

**Summary:** Deepgram nova-3 WebSocket API for real-time transcription with speaker diarization and smart formatting.

## AI Analysis Providers

**Kimi k2-turbo-preview** (Moonshot.ai) performs primary interview analysis with 8k context window. The model excels at structured JSON responses for insight extraction. API endpoint: `https://api.moonshot.ai/v1/chat/completions` with bearer token auth. **Cerebras Llama 3.3 70B** serves as failover with llama-3.3-70b model at `https://api.cerebras.ai/v1/chat/completions`. AIManager class tries Kimi first, falls back to Cerebras on error. Both use temperature=0.1 for deterministic output and max_tokens=1024 for insight generation.

```typescript
// supabase/functions/analyze-chunk/index.ts:25-30
class AIManager {
  async analyze(prompt, maxTokens) {
    for (const provider of this.providers) {
      try { return await provider.analyze(prompt, maxTokens) }
      catch { console.warn(`${provider.name} failed, trying next`) }
    }
  }
}
```

**Summary:** Kimi k2-turbo (primary) + Cerebras Llama 3.3 70B (failover) for differential interview analysis with auto-failover.

## Edge Functions Runtime

**Deno Deploy** runs 4 Supabase Edge Functions with JSR imports. Functions: `analyze-chunk` (per-utterance AI analysis), `generate-scorecard` (post-interview summary), `create-interview` (session initialization), `end-interview` (finalization). Each function authenticates with `x-internal-key` header checked against `INTERNAL_API_KEY` env var. CORS headers allow browser requests from Next.js app. Supabase service role key bypasses RLS for admin operations. Functions use `@supabase/supabase-js@2` JSR package for database access.

```typescript
// supabase/functions/analyze-chunk/index.ts:10-15
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-internal-key, apikey",
}
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)
```

**Summary:** Deno Edge Functions with JSR imports for serverless interview analysis with CORS + auth headers.

## Real-time Broadcast System

**Supabase Realtime** broadcasts database changes via WebSocket to Next.js dashboard. PostgreSQL triggers fire on INSERT to `ai_insights` table. Next.js components use `useEffect` with Supabase client subscriptions. Channel filter: `eq('interview_id', activeId)` ensures clients only receive relevant updates. Dashboard HUD listens on 4 channels: insights (ai_insights table), transcripts (transcripts table), notes (notes table), scorecard (scorecards table). Latency: ~500ms from database INSERT to browser render.

```typescript
// src/app/dashboard/hud/page.tsx:45-50
useEffect(() => {
  const channel = supabase.channel('ai_insights')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_insights',
         filter: `interview_id=eq.${id}` },
      (payload) => setInsights(prev => [...prev, payload.new]))
    .subscribe()
}, [id])
```

**Summary:** Supabase Realtime with postgres triggers for sub-second latency from database INSERT to dashboard update.

## UI Component Library

**Tailwind CSS 4.1** provides utility classes with JIT mode and custom theme. Shadcn/ui components (Button, Card, Badge) use class-variance-authority for variant styling. lucide-react 0.563 supplies icon set (Mic, Flag, Check, X). Recharts 3.7 renders radar scorecard with 6 skill dimensions. Framer Motion animates insight cards with stagger children for timeline effect. CVA patterns: `variants: { severity: { critical: "bg-red-500", warning: "bg-yellow-500" } }`.

```typescript
// src/components/InsightCard.tsx:15-20
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className={cn("rounded-lg p-4", severityColors[severity])}
>
  {content}
</motion.div>
```

**Summary:** Tailwind CSS 4 + Shadcn/ui + CVA + Framer Motion + Recharts for animated dashboard UI components.

## Development Tools

**TypeScript 5.9.3** enforces strict type checking with `noEmit` for validation. ESM module resolution with `"type": "module"` in package.json. pnpm 10.14 manages dependencies with workspace protocol. Drizzle Kit CLI handles migrations: `pnpm db:generate`, `pnpm db:push`, `pnpm db:studio`. Tauri CLI commands: `pnpm tauri dev` (development), `pnpm tauri build` (production). Vercel deployment via git push with automatic previews. Environment vars: `.env.local` (dev), `.env.production` (prod).

```json
// package.json scripts
"scripts": {
  "dev": "next dev --turbopack",
  "tauri:dev": "tauri dev",
  "db:push": "drizzle-kit push"
}
```

**Summary:** TypeScript 5.9 + pnpm + Drizzle Kit + Tauri CLI + Vercel for type-safe development workflow.

## FAQ

**Q: Why Drizzle ORM instead of Prisma?**  
A: Drizzle is lighter (no generate step), type-safe without codegen, and works with postgres.js for better performance.

**Q: Why Deno Edge Functions vs Node.js?**  
A: Deno has faster cold starts, native TypeScript, JSR package imports, and better edge runtime compatibility.

**Q: Can audio capture work on Windows/Linux?**  
A: Yes, cpal supports all platforms. Windows uses WASAPI, Linux uses ALSA/PulseAudio.

**Q: What's the Deepgram monthly cost?**  
A: Free tier: 12K minutes ($0). After that: $0.0043/min (~$260 for 1K hours).

**Q: Why Clerk over Auth0/Firebase?**  
A: Clerk has better Next.js 16 integration, built-in UI components, and simpler middleware setup.

**Q: Can I run Edge Functions locally?**  
A: Yes. `supabase functions serve` runs local Deno runtime with hot reload.
