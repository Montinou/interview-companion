-- Create job_positions table
CREATE TABLE IF NOT EXISTS "job_positions" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(256) NOT NULL,
  "description" text,
  "requirements" jsonb,
  "seniority_level" varchar(50),
  "location" varchar(256),
  "salary_range" varchar(100),
  "status" varchar(50) DEFAULT 'open' NOT NULL,
  "jira_epic" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add job_position_id to interviews table
ALTER TABLE "interviews" ADD COLUMN "job_position_id" integer REFERENCES "job_positions"("id") ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "interviews_job_position_idx" ON "interviews" ("job_position_id");

-- Insert existing QA Automation Engineer position (for Nicolas & Frederico)
INSERT INTO "job_positions" (
  "title",
  "description",
  "requirements",
  "seniority_level",
  "location",
  "status",
  "jira_epic"
) VALUES (
  'QA Automation Engineer',
  'QA Automation Engineer with Playwright expertise for web application testing',
  '{"technical_skills": ["Playwright", "TypeScript/JavaScript", "CI/CD (GitHub Actions or Azure DevOps)", "Page Object Model", "API Testing"], "experience": "5+ years in QA automation", "english_level": "Advanced (B2+)", "nice_to_have": ["Performance testing (K6/JMeter)", "Mobile testing (Appium)", "Data-driven testing frameworks"]}'::jsonb,
  'Middle +',
  'Remote (LATAM)',
  'open',
  'TI-7197'
);

-- Update existing interviews to link to this position
UPDATE "interviews" SET "job_position_id" = 1 WHERE "id" IN (1, 2);
