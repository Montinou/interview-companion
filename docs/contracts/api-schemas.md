# Interview Companion v2 — API Schemas

## POST /api/interviews - Create Interview

**Create interview endpoint** initializes new interview session. Request body: `{ candidateId: number, jobPositionId?: number, scheduledAt?: string }`. Response: `{ ok: true, data: Interview }` with generated interview ID. Authentication: requires Clerk user session via middleware. Database operation: INSERT into interviews table with interviewer_id from Clerk userId. Status defaults to 'scheduled'. The endpoint validates candidateId exists in candidates table. Optional jobPositionId must reference valid job_positions record. scheduledAt parses as ISO timestamp.

```typescript
// Request
POST /api/interviews
Authorization: Bearer <clerk-token>
Content-Type: application/json

{
  "candidateId": 42,
  "jobPositionId": 5,
  "scheduledAt": "2026-02-20T14:00:00Z"
}

// Response
{
  "ok": true,
  "data": {
    "id": 123,
    "candidateId": 42,
    "interviewerId": 1,
    "status": "scheduled",
    "createdAt": "2026-02-16T12:00:00Z"
  }
}
```

**Summary:** POST /api/interviews creates interview with candidateId, optional jobPositionId, and Clerk auth validation.

## GET /api/interviews/[id] - Get Interview Details

**Get interview endpoint** returns full interview with relations. URL parameter: interview ID (integer). Query includes candidate, transcripts, insights, scorecard via Drizzle with clauses. Response: `{ ok: true, data: Interview & { candidate, transcripts[], insights[], scorecard } }`. Authentication: Clerk middleware ensures interviewer owns interview. The endpoint validates interview exists, returns 404 if not found. Transcripts order by timestamp ascending. Insights filter by interview_id with severity index.

```typescript
// Request
GET /api/interviews/123
Authorization: Bearer <clerk-token>

// Response
{
  "ok": true,
  "data": {
    "id": 123,
    "candidateId": 42,
    "status": "completed",
    "candidate": { "id": 42, "name": "John Doe" },
    "transcripts": [
      { "id": 1, "text": "Hello", "speaker": "speaker_0", "timestamp": "..." }
    ],
    "insights": [
      { "id": 1, "type": "green-flag", "content": "Strong technical knowledge" }
    ],
    "scorecard": { "technical": 8, "communication": 9 }
  }
}
```

**Summary:** GET /api/interviews/[id] returns interview with candidate, transcripts, insights, scorecard relations via Clerk auth.

## POST /api/analyze - Trigger AI Analysis

**Analysis endpoint** manually triggers AI analysis on interview chunk. Request: `{ interviewId: number, chunk: { text: string, speaker: string, timestamp: string, confidence?: number } }`. The endpoint forwards to `analyze-chunk` Edge Function with internal API key. Response: `{ ok: true, insight: AIInsight }`. Used by Tauri app after Deepgram transcription. The endpoint validates chunk.text is non-empty. Internal API key from environment variable authenticates to Edge Function.

```typescript
// Request
POST /api/analyze
Authorization: Bearer <clerk-token>
Content-Type: application/json

{
  "interviewId": 123,
  "chunk": {
    "text": "I have 5 years of experience with React",
    "speaker": "speaker_1",
    "timestamp": "2026-02-16T12:05:30Z",
    "confidence": 0.95
  }
}

// Response
{
  "ok": true,
  "insight": {
    "id": 456,
    "type": "green-flag",
    "content": "Demonstrates relevant experience",
    "evidence": "I have 5 years of experience with React"
  }
}
```

**Summary:** POST /api/analyze forwards transcript chunks to Edge Function for AI analysis with internal auth forwarding.

## GET /api/hud/insights - Real-time Insights Feed

**HUD insights endpoint** returns recent AI insights for live dashboard. Query params: `?interviewId=123&limit=50`. Response: `{ ok: true, data: AIInsight[] }` ordered by timestamp descending. Used for initial HUD load before Realtime subscription activates. The endpoint filters by interview_id with index. Limit defaults to 50, max 200. Includes severity, type, content, suggestion, timestamp fields. Client components poll this endpoint + subscribe to Realtime updates for comprehensive coverage.

```typescript
// Request
GET /api/hud/insights?interviewId=123&limit=50
Authorization: Bearer <clerk-token>

// Response
{
  "ok": true,
  "data": [
    {
      "id": 10,
      "interviewId": 123,
      "type": "red-flag",
      "severity": "warning",
      "content": "Hesitant response on async programming",
      "suggestion": "Ask about Promise.all usage",
      "timestamp": "2026-02-16T12:10:00Z"
    }
  ]
}
```

**Summary:** GET /api/hud/insights returns recent AI insights for HUD initialization with limit and interview filter.

## POST /api/interviews/[id]/insights/[insightId]/used - Mark Suggestion Used

**Mark insight used endpoint** updates suggestion status when interviewer asks follow-up. URL params: interview ID, insight ID. Request body: `{ used: true }`. Response: `{ ok: true }`. Used to track which AI suggestions were acted upon. The endpoint validates insight belongs to interview. Updates ai_insights.used column. Analytics feature for measuring suggestion adoption rate. Client component calls endpoint on suggestion card click.

```typescript
// Request
POST /api/interviews/123/insights/456/used
Authorization: Bearer <clerk-token>
Content-Type: application/json

{ "used": true }

// Response
{ "ok": true }
```

**Summary:** POST /api/interviews/[id]/insights/[insightId]/used marks AI suggestions as used for adoption tracking.

## Supabase Edge Function: analyze-chunk

**analyze-chunk Edge Function** performs per-utterance AI analysis with differential state. Request: `{ interviewId: number, chunk: { text, speaker, timestamp, confidence } }`. Headers: `x-internal-key` for auth (bypasses Clerk). Response: `{ ok: true, insight: AIInsight, provider: string }`. The function fetches interview metadata, last insight for state, candidate name, job position. Builds differential prompt with previous state. Calls AIManager with Kimi/Cerebras failover. Parses JSON response, saves to ai_insights table, broadcasts via Realtime. Handles role detection after 5+ chunks.

```typescript
// Request
POST https://<project>.supabase.co/functions/v1/analyze-chunk
x-internal-key: <secret>
Content-Type: application/json

{
  "interviewId": 123,
  "chunk": {
    "text": "I've never used Docker in production",
    "speaker": "speaker_1",
    "timestamp": "2026-02-16T12:15:00Z",
    "confidence": 0.92
  }
}

// Response
{
  "ok": true,
  "insight": {
    "id": 789,
    "type": "red-flag",
    "severity": "warning",
    "content": "No production Docker experience",
    "evidence": "I've never used Docker in production",
    "sentiment": "negative",
    "score": { "technical": 6, "experience": 5 }
  },
  "provider": "kimi"
}
```

**Summary:** analyze-chunk Edge Function with differential AI analysis using previous state and Kimi/Cerebras failover.

## Supabase Edge Function: generate-scorecard

**generate-scorecard Edge Function** creates post-interview hiring recommendation. Request: `{ interviewId: number }`. Headers: `x-internal-key` for auth. Response: `{ ok: true, scorecard: Scorecard }`. The function aggregates all transcripts and insights for interview. Builds comprehensive prompt with transcript excerpts, insight summary, job position requirements. AI generates structured scorecard: dimension scores (1-10), overall recommendation (hire/no-hire/maybe), strengths/weaknesses arrays with evidence, executive summary. Upserts into scorecards table. Returns complete scorecard object.

```typescript
// Request
POST https://<project>.supabase.co/functions/v1/generate-scorecard
x-internal-key: <secret>
Content-Type: application/json

{ "interviewId": 123 }

// Response
{
  "ok": true,
  "scorecard": {
    "id": 50,
    "interviewId": 123,
    "technical": 7,
    "communication": 9,
    "leadership": 6,
    "overallScore": 7.3,
    "recommendation": "hire",
    "strengths": [
      "Excellent communication skills with clear explanations",
      "5 years React experience with modern patterns"
    ],
    "weaknesses": [
      "Limited Docker experience in production",
      "Hesitant on scaling questions"
    ],
    "summary": "Strong mid-level candidate with excellent communication..."
  }
}
```

**Summary:** generate-scorecard aggregates transcripts and insights into AI-generated hiring recommendation with evidence.

## Tauri Command: start_capture

**start_capture Tauri command** initializes audio capture with Deepgram streaming. Parameters: `interview_id: i64`, `config: { deepgramApiKey, language, supabaseUrl, supabaseAnonKey, internalApiKey }`. Returns: `Result<String, String>` with success message or error. The command spawns audio thread (cpal), WebSocket thread (tokio-tungstenite). Connects to Deepgram, streams PCM16 audio, receives transcripts. POSTs each transcript to analyze-chunk Edge Function. Emits Tauri events: `capture-started`, `transcript`, `capture-error`, `capture-stopped`. Returns immediately after thread spawn.

```typescript
// TypeScript wrapper
import { invoke } from '@tauri-apps/api/core'

const config = {
  deepgramApiKey: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!,
  language: 'en',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  internalApiKey: process.env.NEXT_PUBLIC_INTERNAL_API_KEY!
}

const result = await invoke<string>('start_capture', {
  interviewId: 123,
  config
})
// Returns: "Capture started"
```

**Summary:** start_capture Tauri command with audio thread + WebSocket for Deepgram streaming and Edge Function POSTs.

## Tauri Command: stop_capture

**stop_capture Tauri command** gracefully terminates audio capture. Parameters: `app: AppHandle` (injected). Returns: `Result<String, String>`. Sends stop signal to WebSocket thread via mpsc channel. Sets IS_RECORDING atomic bool to false. Audio thread detects flag, stops cpal stream. WebSocket closes Deepgram connection, aborts transcript reader task. Emits `capture-stopped` event. Returns success message. Idempotent—calling twice returns error "Not recording".

```typescript
// TypeScript wrapper
import { invoke } from '@tauri-apps/api/core'

const result = await invoke<string>('stop_capture')
// Returns: "Capture stopped"
```

**Summary:** stop_capture Tauri command signals audio thread shutdown via mpsc channel and atomic bool flag.

## FAQ

**Q: Why internal API key instead of Clerk JWT for Edge Functions?**  
A: Tauri app runs outside browser, can't easily refresh Clerk tokens. Internal key simpler for server-to-server auth.

**Q: What happens if analyze-chunk fails?**  
A: Transcript still saves to database. Insight generation retries on next chunk. No data loss.

**Q: Can multiple clients subscribe to same interview?**  
A: Yes. Supabase Realtime broadcasts to all subscribed clients. Useful for multi-monitor setups.

**Q: How to test Edge Functions without Tauri?**  
A: Use curl or Bruno HTTP client with mock interview_id and chunk data against local or production endpoint.

**Q: Why separate /api/analyze from analyze-chunk Edge Function?**  
A: /api/analyze validates Clerk auth + forwards. Edge Function uses service role for RLS bypass. Separation of concerns.

**Q: What's the max chunk size for AI analysis?**  
A: No hard limit, but typical utterance: 50-200 words. Prompt context: ~1K tokens (previous state + chunk + instructions).
