import { pgTable, serial, text, timestamp, integer, boolean, jsonb, varchar, real, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (synced with Clerk)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }).notNull(),
  name: varchar('name', { length: 256 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Job Positions table
export const jobPositions = pgTable('job_positions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  requirements: jsonb('requirements'), // technical_skills, experience, english_level, nice_to_have
  seniorityLevel: varchar('seniority_level', { length: 50 }),
  location: varchar('location', { length: 256 }),
  salaryRange: varchar('salary_range', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('open'), // open, closed, on_hold
  jiraEpic: varchar('jira_epic', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Candidates table
export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: varchar('email', { length: 256 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  cvUrl: text('cv_url'),
  cvData: jsonb('cv_data'), // Parsed CV data
  jiraTicket: varchar('jira_ticket', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Interviews table
export const interviews = pgTable('interviews', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  interviewerId: integer('interviewer_id').notNull().references(() => users.id),
  jobPositionId: integer('job_position_id').references(() => jobPositions.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, live, completed, cancelled
  // v2: Speaker role mapping from Deepgram diarization
  roles: jsonb('roles'), // {"host": "speaker_0", "guest": "speaker_1"}
  rolesAssigned: boolean('roles_assigned').default(false),
  // v2: STT/AI provider tracking
  sttProvider: varchar('stt_provider', { length: 50 }), // deepgram, assemblyai, revai
  aiProvider: varchar('ai_provider', { length: 50 }), // kimi, cerebras, nvidia, claude
  language: varchar('language', { length: 10 }).default('es'), // es, en, multi
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transcripts table (real-time chunks from Deepgram)
export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  text: text('text').notNull(),
  speaker: varchar('speaker', { length: 50 }), // speaker_0, speaker_1 (from diarization) or interviewer, candidate (after role mapping)
  speakerRole: varchar('speaker_role', { length: 50 }), // host, guest (mapped from roles)
  isInterim: boolean('is_interim').default(false),
  confidence: integer('confidence'), // 0-100
}, (table) => [
  index('idx_transcripts_interview_ts').on(table.interviewId, table.timestamp),
]);

// Scorecards table (post-interview AI-generated)
export const scorecards = pgTable('scorecards', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }).unique(),
  attitude: integer('attitude'), // 1-10
  communication: integer('communication'), // 1-10
  technical: integer('technical'), // 1-10
  strategic: integer('strategic'), // 1-10
  leadership: integer('leadership'), // 1-10
  english: integer('english'), // 1-10
  // v2: AI-generated scorecard fields
  overallScore: real('overall_score'), // weighted average
  recommendation: text('recommendation'), // hire, no_hire, maybe + justification
  strengths: jsonb('strengths'), // ["strength with evidence", ...]
  weaknesses: jsonb('weaknesses'), // ["weakness with evidence", ...]
  summary: text('summary'), // executive summary
  notes: text('notes'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// AI Insights table (per-chunk differential analysis)
export const aiInsights = pgTable('ai_insights', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'red-flag' | 'green-flag' | 'suggestion' | 'note' | 'contradiction' | 'sentiment'
  severity: varchar('severity', { length: 20 }), // 'critical' | 'warning' | 'info' | 'success'
  content: text('content').notNull(),
  suggestion: text('suggestion'), // suggested follow-up question
  topic: varchar('topic', { length: 100 }), // topic category
  evidence: text('evidence'), // quote from transcript backing this insight
  responseQuality: integer('response_quality'), // 1-10 rating
  // v2: Differential analysis state
  sentiment: varchar('sentiment', { length: 20 }), // positive, negative, neutral, evasive
  score: jsonb('score'), // {"technical": 7, "communication": 8, ...} running scores
  used: boolean('used').default(false), // for suggestions - was it used?
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => [
  index('idx_insights_interview_ts').on(table.interviewId, table.timestamp),
  index('idx_insights_interview_type').on(table.interviewId, table.type),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  interviews: many(interviews),
}));

export const jobPositionsRelations = relations(jobPositions, ({ many }) => ({
  interviews: many(interviews),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  interviews: many(interviews),
}));

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
  scorecard: one(scorecards),
  insights: many(aiInsights),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  interview: one(interviews, {
    fields: [transcripts.interviewId],
    references: [interviews.id],
  }),
}));

export const scorecardsRelations = relations(scorecards, ({ one }) => ({
  interview: one(interviews, {
    fields: [scorecards.interviewId],
    references: [interviews.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  interview: one(interviews, {
    fields: [aiInsights.interviewId],
    references: [interviews.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type JobPosition = typeof jobPositions.$inferSelect;
export type NewJobPosition = typeof jobPositions.$inferInsert;

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;

export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type Scorecard = typeof scorecards.$inferSelect;
export type NewScorecard = typeof scorecards.$inferInsert;

export type AIInsight = typeof aiInsights.$inferSelect;
export type NewAIInsight = typeof aiInsights.$inferInsert;
