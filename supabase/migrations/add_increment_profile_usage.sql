-- Add RPC function to increment profile usage count
CREATE OR REPLACE FUNCTION increment_profile_usage(profile_id INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE interview_profiles
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = profile_id;
END;
$$;
