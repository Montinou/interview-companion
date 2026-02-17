# Interview Companion v2 — Technical Debt

## Missing Automated Tests

**Test coverage** currently zero due to rapid prototyping phase. Manual testing workflow covers critical paths (audio capture, transcription, AI analysis, Realtime updates) but fragile. Technical debt: no unit tests for Tauri commands, no integration tests for Edge Functions, no E2E tests for interview flow. Risk: regressions undetected until production. Mitigation plan: add Vitest for unit tests, Playwright for E2E after MVP launch. Priority: test audio capture logic, differential analysis state tracking, role detection accuracy.

**Impact:** High regression risk on refactors. **Effort:** 2-3 weeks for 60% coverage. **Priority:** Post-MVP.

**Summary:** Zero test coverage with manual testing only creates high regression risk requiring Vitest and Playwright implementation post-MVP.

## CORS Wildcard in Edge Functions

**CORS configuration** uses `Access-Control-Allow-Origin: *` allowing requests from any domain. Security risk: CSRF attacks possible if attacker hosts malicious site. Technical debt: production should restrict to specific domain (e.g., `https://interview-companion.vercel.app`). Current wildcard simplifies development (works from localhost, Vercel preview URLs). Mitigation: add origin validation in Edge Functions, read allowed origins from env var, return matching origin in response header.

**Impact:** Medium security risk (mitigated by internal API key). **Effort:** 30 minutes. **Priority:** Pre-production.

**Summary:** CORS wildcard allows any origin creating CSRF risk requiring origin restriction to production domain before launch.

## Hardcoded AI Prompts

**AI analysis prompts** hardcoded in Edge Function source code. Change requires redeployment. Technical debt: no prompt versioning, no A/B testing, no per-interview customization. Current prompts tuned for QA roles at Distillery—not generalizable. Mitigation: move prompts to database table (prompt_templates), reference by ID in analysis calls. Add variables for job-specific context injection. Track prompt version in ai_insights table for analysis.

**Impact:** Low (current prompts work). **Effort:** 1 day for database-driven prompts. **Priority:** Future enhancement.

**Summary:** Hardcoded AI prompts prevent versioning and A/B testing requiring database-driven prompt templates for flexibility.

## No Transcript Export Feature

**Transcript data** stored in database but no export functionality. Users can't download transcripts as PDF, DOCX, or plain text. Technical debt: missing feature for post-interview documentation, candidate feedback, legal compliance. Mitigation: add API route `/api/interviews/[id]/export?format=pdf`, generate PDF with library (jsPDF or Puppeteer), attach to scorecard. Include speaker labels, timestamps, AI insights inline.

**Impact:** Medium (workaround: copy from HUD). **Effort:** 1-2 days. **Priority:** Post-MVP.

**Summary:** Missing transcript export feature limits documentation options requiring PDF generation API for compliance and sharing.

## Single AI Provider Config

**AI provider selection** hardcoded in Edge Function (Kimi primary, Cerebras fallback). No per-interview provider override. Technical debt: can't test new providers without redeployment, can't choose provider based on interview type. Mitigation: add ai_provider field to interviews table (nullable), read in Edge Function, default to Kimi if null. Support provider selection in interview creation UI.

**Impact:** Low (current failover works). **Effort:** 2-3 hours. **Priority:** Future enhancement.

**Summary:** Hardcoded AI provider config prevents per-interview selection requiring database field and UI for provider override.

## No Role Detection Confidence Score

**Role detection** happens automatically after 5+ chunks but lacks confidence metric. Technical debt: false positives (wrong host/guest mapping) silently corrupt data. No way to flag uncertain mappings for manual review. Mitigation: add role_detection_confidence field to interviews table (0-1 range), prompt AI to return confidence with role mapping, surface in HUD for interviewer confirmation.

**Impact:** Medium (rare but critical when wrong). **Effort:** 4-5 hours. **Priority:** Post-MVP.

**Summary:** Missing role detection confidence allows silent errors requiring confidence score and manual confirmation UI.

## Limited Error Telemetry

**Error logging** uses console.error with no aggregation or alerting. Production errors invisible until users report. Technical debt: no Sentry integration, no CloudWatch dashboards, no Slack alerts. Mitigation: add Sentry SDK to Next.js and Edge Functions, track error rates, set up alerts for critical failures (Deepgram connection, AI provider exhaustion). Add user-facing error IDs for support debugging.

**Impact:** High (slow incident response). **Effort:** 1 day for Sentry setup. **Priority:** Pre-production.

**Summary:** Console-only error logging prevents incident detection requiring Sentry integration for aggregation and alerting.

## No Differential Analysis Replay

**Differential analysis state** depends on previous insight from database. Technical debt: can't replay analysis with different prompts (state already modified). No audit trail of analysis decisions. Mitigation: store full context snapshots in ai_insights table (previous_state jsonb field), enable replay mode that reconstructs state from transcript history, test prompt changes without affecting production data.

**Impact:** Low (current flow works). **Effort:** 3-4 days. **Priority:** Future enhancement.

**Summary:** Irreversible differential analysis prevents prompt iteration requiring state snapshots and replay mode for testing.

## Hardcoded HUD Layout for Ultrawide

**HUD dashboard** optimized for ultrawide monitors (3440×1440) with fixed grid layout. Technical debt: poor experience on standard 16:9 displays, no responsive breakpoints. Current workaround: users resize browser window. Mitigation: add Tailwind responsive classes, detect screen width, switch between ultrawide layout (grid) and standard layout (stacked). Use CSS Grid with `grid-auto-flow: dense` for automatic reflow.

**Impact:** Medium (usability on standard displays). **Effort:** 1 day for responsive layout. **Priority:** Post-MVP.

**Summary:** Ultrawide-only HUD layout breaks on standard displays requiring responsive breakpoints and adaptive grid layout.

## No Interview Pause/Resume

**Audio capture** runs continuously from start to stop. Technical debt: no pause button for breaks, bathroom visits, technical issues. Workaround: stop and create new interview (fragments data). Mitigation: add pause_capture Tauri command, track pause timestamps, insert pause markers in transcripts table, filter pauses from analysis. UI: pause button in HUD, resume continues same interview.

**Impact:** Medium (workaround exists but inconvenient). **Effort:** 6-8 hours. **Priority:** Post-MVP.

**Summary:** Missing pause functionality fragments interviews requiring pause command and timestamp tracking for break handling.

## Database Connection Pooling Not Tuned

**Postgres.js connection pool** uses default max: 10 connections. Technical debt: no analysis of actual usage, possible connection exhaustion under load. Current scale: ~5 concurrent interviews max. Mitigation: add connection pool monitoring (log pool stats), tune max connections based on traffic, implement connection timeout handling. Consider Supabase connection pooler (Supavisor) for production scale.

**Impact:** Low (current scale works). **Effort:** 2-3 hours for monitoring. **Priority:** Pre-scale (50+ users).

**Summary:** Untuned connection pool risks exhaustion at scale requiring monitoring and Supabase pooler for production traffic.

## No Scorecard Regeneration

**Scorecard generation** runs once after interview completion. Technical debt: no way to regenerate with updated prompt, refined criteria, or corrected transcripts. Workaround: manual database delete and API call. Mitigation: add "Regenerate Scorecard" button in interview detail page, track scorecard version (scorecards.version field), archive old versions instead of overwrite.

**Impact:** Low (rare need). **Effort:** 3-4 hours. **Priority:** Future enhancement.

**Summary:** One-time scorecard generation prevents refinement requiring regenerate button and versioning for iteration.

## No Candidate Profile Parsing

**Candidate cvData jsonb field** exists but unpopulated. Technical debt: manual data entry for skills, experience. Planned feature: CV upload with AI parsing. Current state: field structure undefined, no parsing logic. Mitigation: implement file upload API route, use AI (Claude or GPT-4) to extract structured data from PDF/DOCX, store in cvData field, display in candidate profile UI.

**Impact:** Medium (manual entry time-consuming). **Effort:** 1 week for CV parsing. **Priority:** Future enhancement.

**Summary:** Unpopulated cvData field requires CV parsing AI for automated candidate profile extraction from resume PDFs.

## Tauri Dev Mode SSL Certificate Issues

**Tauri dev mode** uses HTTP localhost, Deepgram WebSocket uses WSS. Technical debt: browser mixed content warnings when Next.js served over HTTPS (Vercel dev tunnels). Workaround: use HTTP localhost for dev. Mitigation: use mkcert for local SSL certificates, configure Next.js dev server with HTTPS, update Tauri allowed origins. Or: accept HTTP-only dev mode (production uses HTTPS everywhere).

**Impact:** Low (dev inconvenience only). **Effort:** 2-3 hours for mkcert setup. **Priority:** Developer quality-of-life.

**Summary:** Mixed HTTP/HTTPS in dev mode causes warnings requiring mkcert local SSL or accepting HTTP-only development.

## FAQ

**Q: Why focus on MVP first vs addressing tech debt?**  
A: Validate product-market fit before investing in polish. Debt manageable at current scale. Risk increases with user growth.

**Q: Which debt items are blockers for production launch?**  
A: CORS wildcard restriction, error telemetry (Sentry), role detection confidence. Others are post-launch improvements.

**Q: How to prioritize tech debt vs new features?**  
A: Allocate 20% sprint capacity to debt reduction. Address high-impact items (security, reliability) before medium (usability).

**Q: Can I refactor without tests?**  
A: Risky. Add characterization tests first (test current behavior), then refactor, validate tests still pass. Manual regression testing required.

**Q: What's the risk of CORS wildcard in production?**  
A: CSRF attacks possible but mitigated by internal API key. Still, restrict origin before public launch to follow security best practices.

**Q: How to track tech debt over time?**  
A: Create GitHub issues labeled "tech-debt" with impact/effort estimates. Review quarterly. Use debt ratio metric: debt items / total features.
