# Interview Companion v2 — Database Models

## users Table

**users table** stores interviewer accounts synced from Clerk authentication. Columns: `id` (serial primary key), `clerkId` (varchar 256, unique), `email` (varchar 256), `name` (varchar 256, nullable), `createdAt` (timestamp). The clerkId column links to Clerk user ID for auth integration. Email is required for notification features. Name displays in interview history. Relation: hasMany interviews as interviewer. Clerk webhook populates this table on user signup. No direct writes from application—only Clerk sync.

```typescript
// src/lib/db/schema.ts:5-12
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }).notNull(),
  name: varchar('name', { length: 256 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
```

**Summary:** users table synced from Clerk with clerkId unique constraint for authentication and interviewer tracking.

## candidates Table

**candidates table** stores interview candidate profiles. Columns: `id` (serial primary key), `name` (varchar 256, required), `email` (varchar 256, nullable), `phone` (varchar 50, nullable), `cvUrl` (text, nullable), `cvData` (jsonb, nullable), `jiraTicket` (varchar 50, nullable), `createdAt` (timestamp). The cvData jsonb field stores parsed resume data (skills, experience, education). jiraTicket links to Jira candidate tracking ticket. Relation: hasMany interviews. Created via dashboard CRUD interface. No auth required—interviewers manage candidates.

```typescript
// src/lib/db/schema.ts:27-36
export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: varchar('email', { length: 256 }),
  phone: varchar('phone', { length: 50 }),
  cvUrl: text('cv_url'),
  cvData: jsonb('cv_data'),  // Parsed CV data
  jiraTicket: varchar('jira_ticket', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Summary:** candidates table with profile data, jsonb cvData field, and Jira ticket integration for applicant tracking.

## interviews Table

**interviews table** tracks interview sessions with status lifecycle. Columns: `id` (serial PK), `candidateId` (integer FK → candidates.id), `interviewerId` (integer FK → users.id), `jobPositionId` (integer FK → job_positions.id, nullable), `status` (varchar 50, default 'scheduled'), `roles` (jsonb), `rolesAssigned` (boolean), `sttProvider` (varchar 50), `aiProvider` (varchar 50), `language` (varchar 10, default 'es'), `scheduledAt`, `startedAt`, `completedAt`, `createdAt`, `updatedAt`. Status values: scheduled, live, completed, cancelled. The roles field maps Deepgram speakers to host/guest after detection. Relations: belongsTo candidate, interviewer, jobPosition; hasMany transcripts, insights; hasOne scorecard.

```typescript
// src/lib/db/schema.ts:50-70
export const interviews = pgTable('interviews', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  interviewerId: integer('interviewer_id').notNull().references(() => users.id),
  jobPositionId: integer('job_position_id').references(() => jobPositions.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'),
  roles: jsonb('roles'),  // {"host": "speaker_0", "guest": "speaker_1"}
  rolesAssigned: boolean('roles_assigned').default(false),
  sttProvider: varchar('stt_provider', { length: 50 }),
  aiProvider: varchar('ai_provider', { length: 50 }),
  language: varchar('language', { length: 10 }).default('es'),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Summary:** interviews table with status lifecycle, jsonb roles for speaker mapping, and provider tracking for STT/AI.

## transcripts Table

**transcripts table** stores real-time speech-to-text chunks from Deepgram. Columns: `id` (serial PK), `interviewId` (integer FK → interviews.id), `timestamp` (timestamp), `text` (text, required), `speaker` (varchar 50), `speakerRole` (varchar 50), `isInterim` (boolean, default false), `confidence` (integer 0-100). The speaker field contains Deepgram diarization IDs (speaker_0, speaker_1). speakerRole maps to host/guest after role detection. Index: `idx_transcripts_interview_ts` on (interviewId, timestamp) for efficient chronological queries. Cascade delete when interview deleted.

```typescript
// src/lib/db/schema.ts:85-95
export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  text: text('text').notNull(),
  speaker: varchar('speaker', { length: 50 }),
  speakerRole: varchar('speaker_role', { length: 50 }),
  isInterim: boolean('is_interim').default(false),
  confidence: integer('confidence'),
}, (table) => [
  index('idx_transcripts_interview_ts').on(table.interviewId, table.timestamp),
]);
```

**Summary:** transcripts table with Deepgram chunks, speaker diarization, role mapping, and chronological index for efficient queries.

## ai_insights Table

**ai_insights table** stores per-chunk AI analysis results with differential state tracking. Columns: `id` (serial PK), `interviewId` (integer FK → interviews.id), `type` (varchar 50: red-flag, green-flag, suggestion, note, contradiction), `severity` (varchar 20: critical, warning, info, success), `content` (text, required), `suggestion` (text, nullable), `topic` (varchar 100), `evidence` (text), `responseQuality` (integer 1-10), `sentiment` (varchar 20: positive, negative, neutral, evasive), `score` (jsonb), `used` (boolean, default false), `timestamp` (timestamp). The score field contains running skill dimensions: `{"technical": 7, "communication": 9}`. Indexes: (interviewId, timestamp), (interviewId, type). Realtime broadcast on INSERT for live dashboard.

```typescript
// src/lib/db/schema.ts:120-135
export const aiInsights = pgTable('ai_insights', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }),
  content: text('content').notNull(),
  suggestion: text('suggestion'),
  topic: varchar('topic', { length: 100 }),
  evidence: text('evidence'),
  responseQuality: integer('response_quality'),
  sentiment: varchar('sentiment', { length: 20 }),
  score: jsonb('score'),  // {"technical": 7, "communication": 8, ...}
  used: boolean('used').default(false),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => [
  index('idx_insights_interview_ts').on(table.interviewId, table.timestamp),
  index('idx_insights_interview_type').on(table.interviewId, table.type),
]);
```

**Summary:** ai_insights table with differential analysis state, jsonb scores, and indexes for efficient filtering by type and timestamp.

## scorecards Table

**scorecards table** stores post-interview hiring recommendations. Columns: `id` (serial PK), `interviewId` (integer FK → interviews.id, unique), `attitude` (integer 1-10), `communication` (integer 1-10), `technical` (integer 1-10), `strategic` (integer 1-10), `leadership` (integer 1-10), `english` (integer 1-10), `overallScore` (real), `recommendation` (text), `strengths` (jsonb array), `weaknesses` (jsonb array), `summary` (text), `notes` (text), `updatedAt` (timestamp). The unique constraint ensures one scorecard per interview. Strengths/weaknesses arrays contain evidence-backed statements. recommendation field structure: "hire|no_hire|maybe: justification". Generated by generate-scorecard Edge Function.

```typescript
// src/lib/db/schema.ts:105-120
export const scorecards = pgTable('scorecards', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }).unique(),
  attitude: integer('attitude'),
  communication: integer('communication'),
  technical: integer('technical'),
  strategic: integer('strategic'),
  leadership: integer('leadership'),
  english: integer('english'),
  overallScore: real('overall_score'),
  recommendation: text('recommendation'),
  strengths: jsonb('strengths'),  // ["strength with evidence", ...]
  weaknesses: jsonb('weaknesses'),  // ["weakness with evidence", ...]
  summary: text('summary'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Summary:** scorecards table with skill dimensions, jsonb strengths/weaknesses arrays, and unique constraint per interview.

## job_positions Table

**job_positions table** defines open positions for interview targeting. Columns: `id` (serial PK), `title` (varchar 256, required), `description` (text), `requirements` (jsonb), `seniorityLevel` (varchar 50), `location` (varchar 256), `salaryRange` (varchar 100), `status` (varchar 50, default 'open'), `jiraEpic` (varchar 50), `createdAt`, `updatedAt`. The requirements jsonb field structure: `{ technical_skills: [], experience: string, english_level: string, nice_to_have: [] }`. Status values: open, closed, on_hold. Relation: hasMany interviews. Used by AI for context-aware analysis (job-specific questions).

```typescript
// src/lib/db/schema.ts:15-28
export const jobPositions = pgTable('job_positions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  requirements: jsonb('requirements'),  // technical_skills, experience, english_level
  seniorityLevel: varchar('seniority_level', { length: 50 }),
  location: varchar('location', { length: 256 }),
  salaryRange: varchar('salary_range', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  jiraEpic: varchar('jira_epic', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Summary:** job_positions table with jsonb requirements for AI-powered job-specific interview analysis and Jira epic integration.

## Relations and Cascades

**Drizzle relations** define foreign key relationships with cascade behaviors. The interviews.candidateId → candidates.id with onDelete: 'cascade' deletes interviews when candidate removed. The interviews.jobPositionId → job_positions.id with onDelete: 'set null' preserves interviews when position deleted. Transcripts, insights, scorecard all cascade delete when interview removed. User deletion blocked if interviews exist (no cascade). Relations enable `with` clause queries: `db.query.interviews.findMany({ with: { candidate: true, transcripts: true } })`. Ensures data consistency across related records.

```typescript
// src/lib/db/schema.ts:170-185
export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id],
  }),
  interviewer: one(users, {
    fields: [interviews.interviewerId],
    references: [users.id],
  }),
  jobPosition: one(jobPositions, {
    fields: [interviews.jobPositionId],
    references: [jobPositions.id],
  }),
  transcripts: many(transcripts),
  insights: many(aiInsights),
  scorecard: one(scorecards),
}));
```

**Summary:** Drizzle relations with cascade delete for interview dependencies and set null for job position references.

## Type Exports and Inference

**TypeScript type inference** generates types from Drizzle schema definitions. The `.$inferSelect` utility creates SELECT types (database rows). The `.$inferInsert` utility creates INSERT types (new records). Export pattern: `export type Interview = typeof interviews.$inferSelect`. Components import these types for props and state. Drizzle query results infer types automatically: `const interview: Interview = await db.query.interviews.findFirst()`. No manual type definitions needed—single source of truth from schema. Type safety from database to UI.

```typescript
// src/lib/db/schema.ts:200-210
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type AIInsight = typeof aiInsights.$inferSelect;
export type Scorecard = typeof scorecards.$inferSelect;

// Usage in components:
import type { Interview, Transcript } from '@/lib/db/schema'
```

**Summary:** Drizzle type inference with $inferSelect/$inferInsert for end-to-end type safety from database schema to UI components.

## FAQ

**Q: Why jsonb for cvData instead of separate tables?**  
A: Flexible schema for parsed resumes. Different formats (JSON, PDF, LinkedIn) produce varying structures. jsonb avoids migration overhead.

**Q: How to query jsonb fields?**  
A: Use postgres jsonb operators: `where(sql\`cv_data->>'skills' ILIKE '%React%'\`)` or extract in application layer.

**Q: Why unique constraint on scorecards.interviewId?**  
A: One canonical scorecard per interview. Regeneration updates existing scorecard instead of creating duplicates.

**Q: Can I query across interviews for candidate history?**  
A: Yes. `db.query.candidates.findFirst({ with: { interviews: { with: { scorecard: true } } } })` loads all interviews with scorecards.

**Q: Why separate speaker and speakerRole columns?**  
A: speaker stores raw Deepgram IDs before role detection. speakerRole adds semantic meaning after AI maps host/guest.

**Q: How to handle schema migrations with existing data?**  
A: `drizzle-kit generate` creates migration SQL. Test with `db:push` locally. Apply to production with `db:migrate`. Backup first.
