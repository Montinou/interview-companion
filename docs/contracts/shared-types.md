# Interview Companion v2 — Shared Types

## Tauri Capture Config Type

**CaptureConfig interface** defines parameters for Tauri audio capture initialization. Properties: `deepgramApiKey` (string, Deepgram token), `language` (string, ISO code: en, es, multi), `supabaseUrl` (string, project URL), `supabaseAnonKey` (string, anon key for browser), `internalApiKey` (string, Edge Function auth). Used in `start_capture` command. Next.js loads from environment variables and passes to Tauri. Rust accepts as `serde_json::Value` for flexible deserialization. Validation: empty deepgramApiKey rejects with error.

```typescript
// src/lib/tauri/types.ts:5-12
export interface CaptureConfig {
  deepgramApiKey: string;
  language: 'en' | 'es' | 'multi';
  supabaseUrl: string;
  supabaseAnonKey: string;
  internalApiKey: string;
}

// Usage:
const config: CaptureConfig = {
  deepgramApiKey: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!,
  language: 'en',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  internalApiKey: process.env.NEXT_PUBLIC_INTERNAL_API_KEY!
};
```

**Summary:** CaptureConfig type defines Tauri audio capture parameters with Deepgram and Supabase credentials from environment variables.

## Transcript Chunk Type

**TranscriptChunk interface** represents real-time speech-to-text output from Deepgram. Properties: `text` (string, transcribed utterance), `speaker` (string, diarization ID: speaker_0, speaker_1), `timestamp` (string, ISO 8601), `confidence` (number, optional, 0-1 range). Emitted by Tauri via `transcript` event. Consumed by Next.js HUD component. POSTed to `analyze-chunk` Edge Function. Stored in transcripts table after conversion (confidence × 100 for integer). Interim results excluded—only final transcripts.

```typescript
// src/lib/types/transcripts.ts:3-9
export interface TranscriptChunk {
  text: string;
  speaker: string;
  timestamp: string;
  confidence?: number;
}

// Tauri event payload:
window.__TAURI__.event.listen('transcript', (event) => {
  const chunk: TranscriptChunk = event.payload;
  console.log(`[${chunk.speaker}] ${chunk.text}`);
});
```

**Summary:** TranscriptChunk type for Deepgram transcription output with speaker diarization and confidence scores from Tauri events.

## AI Insight Type

**AIInsight type** mirrors ai_insights table with TypeScript. Fields: `id`, `interviewId`, `type` (red-flag | green-flag | suggestion | note | contradiction), `severity` (critical | warning | info | success), `content`, `suggestion`, `topic`, `evidence`, `responseQuality`, `sentiment`, `score`, `used`, `timestamp`. The score field type: `{ technical?: number; communication?: number; experience?: number; [key: string]: number | undefined }`. Used in HUD timeline, insight cards, Realtime payloads. Inferred from Drizzle schema: `typeof aiInsights.$inferSelect`.

```typescript
// src/lib/db/schema.ts:210
export type AIInsight = typeof aiInsights.$inferSelect;

// Component usage:
interface InsightCardProps {
  insight: AIInsight;
  onMarkUsed?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => (
  <div className={severityColors[insight.severity]}>
    <h3>{insight.content}</h3>
    {insight.suggestion && <p>{insight.suggestion}</p>}
    {insight.evidence && <blockquote>{insight.evidence}</blockquote>}
  </div>
);
```

**Summary:** AIInsight type from Drizzle inference with typed severity, type, and jsonb score fields for component props.

## Scorecard Type

**Scorecard type** represents post-interview evaluation from scorecards table. Fields: `id`, `interviewId`, `attitude`, `communication`, `technical`, `strategic`, `leadership`, `english` (integers 1-10), `overallScore` (real), `recommendation` (text), `strengths` (string[]), `weaknesses` (string[]), `summary`, `notes`, `updatedAt`. The strengths/weaknesses arrays contain evidence-backed statements from AI. Recommendation format: "hire: Strong technical skills..." or "no_hire: Insufficient experience...". Rendered in radar chart (Recharts), comparison view, PDF export.

```typescript
// src/lib/db/schema.ts:215
export type Scorecard = typeof scorecards.$inferSelect;

// Radar chart data transformation:
const radarData = [
  { skill: 'Technical', value: scorecard.technical },
  { skill: 'Communication', value: scorecard.communication },
  { skill: 'Leadership', value: scorecard.leadership },
  { skill: 'Attitude', value: scorecard.attitude },
  { skill: 'Strategic', value: scorecard.strategic },
  { skill: 'English', value: scorecard.english },
];
```

**Summary:** Scorecard type with skill dimensions, overall score, and evidence arrays for hiring decision visualization and comparison.

## Interview Status Union

**InterviewStatus type** constrains interview lifecycle states to literal union. Values: `'scheduled' | 'live' | 'completed' | 'cancelled'`. Used in interviews table status column (varchar). Enforced at TypeScript level with discriminated unions. Status transitions: scheduled → live → completed (normal flow), scheduled → cancelled (abort), live → cancelled (technical failure). Components use status for conditional rendering (disable controls when completed, show live indicator when live).

```typescript
// src/lib/types/interviews.ts:5-10
export type InterviewStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

// Status guard:
function isLive(status: InterviewStatus): boolean {
  return status === 'live';
}

// Component conditional:
{interview.status === 'live' && (
  <Badge variant="success">● LIVE</Badge>
)}
```

**Summary:** InterviewStatus literal union type for lifecycle state management with TypeScript exhaustiveness checking.

## Insight Type Union

**InsightType type** classifies AI analysis output with discriminated union. Values: `'red-flag' | 'green-flag' | 'suggestion' | 'note' | 'contradiction'`. Stored in ai_insights.type column. Determines insight card styling, icon, priority. red-flag: concerns or gaps. green-flag: strengths or positive signals. suggestion: follow-up questions. note: neutral observations. contradiction: conflicting statements across chunks. Used for filtering: show only red-flags, group by type in timeline.

```typescript
// src/lib/types/insights.ts:3-8
export type InsightType = 
  | 'red-flag' 
  | 'green-flag' 
  | 'suggestion' 
  | 'note' 
  | 'contradiction';

// Icon mapping:
const typeIcons: Record<InsightType, React.ReactNode> = {
  'red-flag': <Flag className="text-red-500" />,
  'green-flag': <Check className="text-green-500" />,
  'suggestion': <Lightbulb className="text-yellow-500" />,
  'note': <FileText className="text-gray-500" />,
  'contradiction': <AlertTriangle className="text-orange-500" />,
};
```

**Summary:** InsightType discriminated union for AI analysis classification with component styling and filtering logic.

## Severity Level Union

**SeverityLevel type** indicates insight urgency with literal union. Values: `'critical' | 'warning' | 'info' | 'success'`. Stored in ai_insights.severity column. Determines color scheme, notification priority, sort order. critical: immediate attention (e.g., evasive answers). warning: noteworthy concerns. info: neutral information. success: positive highlights. Used in dashboard sorting: critical first, then warning, info, success. Tailwind classes: `bg-red-500` (critical), `bg-yellow-500` (warning), `bg-blue-500` (info), `bg-green-500` (success).

```typescript
// src/lib/types/insights.ts:10-15
export type SeverityLevel = 'critical' | 'warning' | 'info' | 'success';

const severityColors: Record<SeverityLevel, string> = {
  critical: 'bg-red-500/10 border-red-500 text-red-700',
  warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-700',
  info: 'bg-blue-500/10 border-blue-500 text-blue-700',
  success: 'bg-green-500/10 border-green-500 text-green-700',
};
```

**Summary:** SeverityLevel type for insight urgency classification with Tailwind color mapping and dashboard priority sorting.

## Skill Score Object Type

**SkillScore interface** structures running skill assessments in ai_insights.score jsonb. Properties: `technical`, `communication`, `experience`, `attitude`, `leadership`, `english` (all optional numbers 1-10). Updated incrementally by differential analysis. Aggregated into final scorecard dimensions. Enables trend visualization: skill scores over time. Allows partial updates: AI may only assess 2-3 dimensions per chunk.

```typescript
// src/lib/types/scores.ts:3-11
export interface SkillScore {
  technical?: number;
  communication?: number;
  experience?: number;
  attitude?: number;
  leadership?: number;
  english?: number;
  [key: string]: number | undefined;
}

// Trend chart data:
const technicalTrend = insights
  .filter(i => i.score?.technical)
  .map(i => ({ timestamp: i.timestamp, score: i.score!.technical }));
```

**Summary:** SkillScore interface for jsonb score fields with optional dimensions for incremental skill assessment tracking.

## Speaker Role Type

**SpeakerRole type** maps diarized speakers to interview participants. Values: `'host' | 'guest'`. Stored in transcripts.speakerRole and interviews.roles jsonb. The roles field structure: `{ host: "speaker_0", guest: "speaker_1" }`. Role detection happens after 5+ chunks when AI identifies question asker (host) vs answerer (guest). Used for transcript filtering (show only guest responses), statistical analysis (host vs guest talk time ratio), scorecard context (focus on guest answers).

```typescript
// src/lib/types/roles.ts:3-8
export type SpeakerRole = 'host' | 'guest';

export interface RoleMapping {
  host: string;    // Deepgram speaker ID, e.g., "speaker_0"
  guest: string;   // Deepgram speaker ID, e.g., "speaker_1"
}

// Usage in query:
const guestTranscripts = await db.query.transcripts.findMany({
  where: eq(transcripts.speakerRole, 'guest')
});
```

**Summary:** SpeakerRole type and RoleMapping interface for Deepgram speaker ID to interview participant mapping after AI detection.

## Tauri Event Payload Types

**Tauri event payloads** use discriminated unions for type-safe event handling. Events: `capture-started` (`{ device: string }`), `transcript` (`TranscriptChunk`), `capture-error` (`{ error: string }`), `capture-stopped` (`{}`). TypeScript listeners use payload type discrimination. The `@tauri-apps/api/event` module provides `listen` function with generic payload type. Events enable decoupled communication between Rust backend and Next.js frontend.

```typescript
// src/lib/tauri/events.ts:5-15
import { listen } from '@tauri-apps/api/event';

type CaptureEvent = 
  | { event: 'capture-started'; payload: { device: string } }
  | { event: 'transcript'; payload: TranscriptChunk }
  | { event: 'capture-error'; payload: { error: string } }
  | { event: 'capture-stopped'; payload: {} };

// Type-safe listener:
await listen<{ device: string }>('capture-started', (event) => {
  console.log('Capture started on device:', event.payload.device);
});
```

**Summary:** Discriminated union types for Tauri events with type-safe payload handling in Next.js listeners.

## FAQ

**Q: Why separate CaptureConfig from .env variables?**  
A: Tauri commands can't access Next.js env directly. Config object bridges Next.js env to Rust.

**Q: Can I extend SkillScore with custom dimensions?**  
A: Yes. Index signature `[key: string]: number | undefined` allows arbitrary skill keys. Update AI prompt to assess new dimensions.

**Q: Why string timestamp instead of Date in TranscriptChunk?**  
A: JSON serialization across Rust-JS boundary. ISO 8601 strings serialize consistently. Convert to Date in components as needed.

**Q: How to ensure InterviewStatus transitions are valid?**  
A: Use state machine library (e.g., XState) or validation functions: `canTransition(from: InterviewStatus, to: InterviewStatus): boolean`.

**Q: Can insights have multiple severity levels?**  
A: No. One severity per insight. Create separate insights for different aspects if needed.

**Q: Why optional in SkillScore fields?**  
A: AI may not assess all dimensions in every chunk. Partial updates are common. Final scorecard aggregates non-null values.
