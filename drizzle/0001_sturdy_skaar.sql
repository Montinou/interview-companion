ALTER TABLE "ai_insights" ADD COLUMN "severity" varchar(20);--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "suggestion" text;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "topic" varchar(100);--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "response_quality" integer;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD COLUMN "used" boolean DEFAULT false;