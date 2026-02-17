# Interview Companion v2 — Project Overview

## What is Interview Companion v2

**Interview Companion v2** is a real-time AI-powered interview analysis copilot designed for technical QA interviews at Distillery/AttorneyShare. The system captures audio via Tauri desktop app, transcribes with Deepgram STT, and provides live differential AI analysis through Supabase Edge Functions. Interview data flows from desktop capture → WebSocket transcription → database → Next.js dashboard with Realtime updates. Primary use case: give hiring managers live insights (red flags, green flags, follow-up suggestions) and post-interview scorecards with hiring recommendations.

**Summary:** Next.js + Tauri hybrid app for live interview transcription and AI-powered analysis during technical interviews.

## Core Architecture

**Tauri v2 desktop app** handles native audio capture using cpal crate for macOS CoreAudio. Audio streams to Deepgram WebSocket (nova-3 model, diarization enabled) for speech-to-text. Transcripts POST to Supabase Edge Function `analyze-chunk` which runs differential AI analysis (Kimi k2-turbo-preview primary, Cerebras Llama 3.3 70B fallback). Insights save to postgres via Drizzle ORM and broadcast via Supabase Realtime to Next.js dashboard. Dashboard components: live HUD (ultrawide layout), interview history, candidate comparison, scorecard generator.

```typescript
// src-tauri/src/audio.rs:40-45
pub async fn start_capture(app, interview_id, config) -> Result<String> {
  let (stop_tx, stop_rx) = mpsc::channel::<()>(1);
  IS_RECORDING.store(true, Ordering::Relaxed);
  std::thread::spawn(|| run_audio_thread(audio_tx));
  tokio::spawn(run_websocket(audio_rx, stop_rx));
}
```

**Summary:** Tauri native audio → Deepgram STT → Supabase Edge Functions → Next.js Realtime dashboard for live interview analysis.

## Tech Stack Summary

**Frontend:** Next.js 16.1 with React 19.2 Server Components, Tailwind CSS 4.1, Framer Motion, Clerk auth. **Backend:** Supabase postgres (Drizzle ORM, postgres.js driver), 4 Edge Functions (Deno). **Desktop:** Tauri v2 with Rust backend (cpal, tokio-tungstenite, reqwest). **AI:** Kimi k2-turbo-preview (Moonshot.ai), Cerebras Llama 3.3 70B (failover). **STT:** Deepgram nova-3 with diarization. **Realtime:** Supabase Realtime (postgres triggers → WebSocket).

```json
// package.json:15-18
"@clerk/nextjs": "6.37.3",
"@supabase/supabase-js": "^2.95.3",
"@tauri-apps/api": "^2.10.1",
"drizzle-orm": "0.45.1"
```

**Summary:** Next.js + Tauri v2 + Supabase + Deepgram STT + dual-LLM failover for real-time interview analysis.

## Data Flow Overview

**Capture phase:** Tauri app captures audio → converts to PCM16 → streams to Deepgram WebSocket → receives transcript chunks with speaker diarization. **Analysis phase:** Each chunk POSTs to `analyze-chunk` Edge Function → AI performs differential analysis (compares new chunk vs previous state) → saves to `ai_insights` table. **Realtime broadcast:** Postgres INSERT trigger → Supabase Realtime → Next.js dashboard useEffect listener → updates HUD, insights timeline, suggestions panel. **Post-interview:** `generate-scorecard` function aggregates all transcripts + insights → generates hiring recommendation with evidence.

```typescript
// supabase/functions/analyze-chunk/index.ts:225-230
await supabase.from("ai_insights").insert({
  interview_id: interviewId,
  type: analysis.type || "note",
  content: analysis.content,
  evidence: analysis.evidence,
  score: analysis.score,
})
```

**Summary:** Audio capture → STT → differential AI analysis → realtime broadcast → post-interview scorecard generation.

## Key Innovation: Differential Analysis

**Differential analysis** prevents redundant insights by providing AI with previous analysis state. Each `analyze-chunk` call includes last insight (sentiment, flags, topics, running scores) so AI only flags NEW observations. Prompt structure: "Previous state: [...] New chunk: [...] Analyze ONLY what's new." This reduces noise and keeps dashboard insights actionable. Role detection happens automatically after 5+ chunks by analyzing speaker patterns.

```typescript
// supabase/functions/analyze-chunk/index.ts:100-105
const previousState = lastInsight
  ? `Previous: Sentiment ${lastInsight.sentiment}, Flags ${lastInsight.content}, Scores ${lastInsight.score}`
  : "Beginning of interview"
const prompt = `${previousState}\nNew chunk: ${chunk.text}\nAnalyze ONLY new.`
```

**Summary:** Differential analysis with state tracking prevents duplicate flags and keeps insights actionable during live interviews.

## Project Structure

**interview-companion-v2/src/app/** — Next.js App Router (dashboard routes, API routes, HUD). **src-tauri/** — Rust Tauri app (audio capture, Deepgram WebSocket, cpal integration). **supabase/functions/** — 4 Deno Edge Functions (analyze-chunk, generate-scorecard, create-interview, end-interview). **src/lib/db/schema.ts** — Drizzle ORM schema (8 tables: users, candidates, interviews, transcripts, ai_insights, scorecards, job_positions). **src/app/dashboard/hud/** — Ultrawide HUD layout with radar scorecard, insights timeline, transcript feed, suggestions panel.

```
interview-companion-v2/
├── src/app/                  # Next.js routes
├── src-tauri/src/            # Rust audio capture
├── supabase/functions/       # Edge Functions
├── src/lib/db/schema.ts      # Drizzle schema
└── src/app/dashboard/hud/    # Live interview HUD
```

**Summary:** Hybrid monorepo with Next.js frontend, Tauri desktop app, Supabase Edge Functions, and Drizzle ORM schema.

## FAQ

**Q: Why Tauri over Electron?**  
A: Tauri is ~10x smaller bundle, native Rust cpal for macOS CoreAudio, no Chromium overhead.

**Q: Why differential analysis?**  
A: Without state tracking, AI repeats same flags every chunk. Differential analysis = 70% fewer duplicate insights.

**Q: Why dual-LLM failover?**  
A: Kimi k2-turbo is fast but rate-limited. Cerebras Llama 3.3 70B ensures zero downtime during live interviews.

**Q: Can it handle multi-language interviews?**  
A: Yes. Deepgram supports language switching via config. Dashboard has en/es/multi modes.

**Q: What's the average latency?**  
A: Deepgram: ~2-3s, AI analysis: ~3-5s, Realtime broadcast: ~500ms. Total: 5-8s from speech to dashboard.

**Q: How does role detection work?**  
A: After 5 chunks, AI analyzes patterns (who asks questions vs answers) and maps speaker_0/speaker_1 to host/guest.
