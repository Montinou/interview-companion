import { pgTable, serial, text, timestamp, integer, boolean, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (synced with Clerk)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }).notNull(),
  name: varchar('name', { length: 256 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // scheduled, live, completed, cancelled
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transcripts table (real-time messages)
export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  text: text('text').notNull(),
  speaker: varchar('speaker', { length: 50 }), // interviewer, candidate, system
  isInterim: boolean('is_interim').default(false), // for partial transcriptions
  confidence: integer('confidence'), // 0-100
});

// Scorecards table
export const scorecards = pgTable('scorecards', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }).unique(),
  attitude: integer('attitude'), // 1-10
  communication: integer('communication'), // 1-10
  technical: integer('technical'), // 1-10
  strategic: integer('strategic'), // 1-10
  leadership: integer('leadership'), // 1-10
  english: integer('english'), // 1-10
  notes: text('notes'),
  recommendation: text('recommendation'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// AI Insights table
export const aiInsights = pgTable('ai_insights', {
  id: serial('id').primaryKey(),
  interviewId: integer('interview_id').notNull().references(() => interviews.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // question, red-flag, insight
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
