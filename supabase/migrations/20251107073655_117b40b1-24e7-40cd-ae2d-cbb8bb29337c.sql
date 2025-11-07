-- Add new columns for enhanced outreach management

-- Add response type tracking to pocs
CREATE TYPE response_type AS ENUM ('positive', 'negative', 'neutral', 'no_response');

ALTER TABLE pocs 
ADD COLUMN response_type response_type DEFAULT 'no_response',
ADD COLUMN invite_accepted_at timestamp with time zone,
ADD COLUMN auto_removed boolean DEFAULT false,
ADD COLUMN auto_removed_at timestamp with time zone,
ADD COLUMN auto_removed_reason text;

-- Add metadata to activities for better filtering
ALTER TABLE activities
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for faster queries
CREATE INDEX idx_pocs_response_type ON pocs(response_type);
CREATE INDEX idx_pocs_invite_accepted_at ON pocs(invite_accepted_at);
CREATE INDEX idx_pocs_auto_removed ON pocs(auto_removed);
CREATE INDEX idx_activities_metadata ON activities USING gin(metadata);

-- Update existing data with proper casting
UPDATE pocs 
SET response_type = CASE 
  WHEN response IS NOT NULL THEN 'positive'::response_type
  ELSE 'no_response'::response_type
END;

-- Create function to auto-remove stale members
CREATE OR REPLACE FUNCTION auto_remove_stale_members()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-remove members who haven't responded in 3 days after last contact
  UPDATE pocs
  SET 
    auto_removed = true,
    auto_removed_at = NOW(),
    auto_removed_reason = 'No response after 3 days'
  WHERE 
    auto_removed = false
    AND linkedin_invite_accepted = true
    AND response IS NULL
    AND last_contacted_at < NOW() - INTERVAL '3 days';
    
  -- Cancel pending notifications for auto-removed members
  UPDATE notifications
  SET status = 'cancelled'
  WHERE poc_id IN (
    SELECT id FROM pocs WHERE auto_removed = true
  )
  AND status = 'pending';
END;
$$;

-- Create function to check if follow-up is allowed
CREATE OR REPLACE FUNCTION is_followup_allowed(poc_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_date timestamp with time zone;
  is_removed boolean;
BEGIN
  SELECT invite_accepted_at, auto_removed
  INTO invite_date, is_removed
  FROM pocs
  WHERE id = poc_id_param;
  
  -- Don't allow follow-up if auto-removed
  IF is_removed THEN
    RETURN false;
  END IF;
  
  -- Allow follow-up only within 2 days of invite acceptance
  IF invite_date IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN (NOW() - invite_date) <= INTERVAL '2 days';
END;
$$;