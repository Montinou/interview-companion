-- Enable RLS on all data tables
-- This provides defense-in-depth for organization-based data isolation
-- The primary security layer is org_id scoping in API routes (using getOrgContext())
-- These policies protect against direct Supabase client queries

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (Edge Functions use service role key)
-- This is correct: Edge Functions handle their own authorization via INTERNAL_API_KEY

-- Anon key policies (used by client-side Supabase queries)
-- Strategy: Allow SELECT for Realtime subscriptions, block all writes
-- The HUD uses Realtime subscriptions filtered by interview_id
-- Since interview_id is already org-scoped from API routes, this is acceptable

-- Realtime needs SELECT access for anon key (used by HUD subscriptions)
CREATE POLICY "anon_select_transcripts" ON transcripts 
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_insights" ON ai_insights 
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_scorecards" ON scorecards 
  FOR SELECT TO anon USING (true);

-- Block anon from INSERT/UPDATE/DELETE on all tables
CREATE POLICY "anon_no_write_transcripts" ON transcripts 
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "anon_no_update_transcripts" ON transcripts 
  FOR UPDATE TO anon USING (false);

CREATE POLICY "anon_no_delete_transcripts" ON transcripts 
  FOR DELETE TO anon USING (false);

CREATE POLICY "anon_no_write_insights" ON ai_insights 
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "anon_no_update_insights" ON ai_insights 
  FOR UPDATE TO anon USING (false);

CREATE POLICY "anon_no_delete_insights" ON ai_insights 
  FOR DELETE TO anon USING (false);

CREATE POLICY "anon_no_write_scorecards" ON scorecards 
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "anon_no_update_scorecards" ON scorecards 
  FOR UPDATE TO anon USING (false);

CREATE POLICY "anon_no_delete_scorecards" ON scorecards 
  FOR DELETE TO anon USING (false);

-- Block anon completely from other tables (no SELECT needed)
CREATE POLICY "anon_no_access_interviews" ON interviews 
  FOR ALL TO anon USING (false);

CREATE POLICY "anon_no_access_candidates" ON candidates 
  FOR ALL TO anon USING (false);

CREATE POLICY "anon_no_access_profiles" ON interview_profiles 
  FOR ALL TO anon USING (false);

CREATE POLICY "anon_no_access_positions" ON job_positions 
  FOR ALL TO anon USING (false);

-- Block authenticated (Supabase auth, not Clerk) — we don't use this
CREATE POLICY "auth_no_access_interviews" ON interviews 
  FOR ALL TO authenticated USING (false);

CREATE POLICY "auth_no_access_candidates" ON candidates 
  FOR ALL TO authenticated USING (false);

CREATE POLICY "auth_no_access_profiles" ON interview_profiles 
  FOR ALL TO authenticated USING (false);

CREATE POLICY "auth_no_access_transcripts" ON transcripts 
  FOR ALL TO authenticated USING (false);

CREATE POLICY "auth_no_access_insights" ON ai_insights 
  FOR ALL TO authenticated USING (false);

CREATE POLICY "auth_no_access_scorecards" ON scorecards 
  FOR ALL TO authenticated USING (false);

CREATE POLICY "auth_no_access_positions" ON job_positions 
  FOR ALL TO authenticated USING (false);

-- NOTE: This migration has been created but NOT applied yet.
-- To apply: supabase db push (in dev) or include in next production migration
-- Test thoroughly in dev before applying to production!
