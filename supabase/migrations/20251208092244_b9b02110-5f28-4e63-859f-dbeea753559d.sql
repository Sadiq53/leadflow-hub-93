-- COMPREHENSIVE SECURITY & RELIABILITY OPTIMIZATION
-- Fix POCs table RLS policies to restrict access based on lead ownership
-- Fix Activities table RLS to only show user's own activities

-- Drop existing overly permissive policies on pocs
DROP POLICY IF EXISTS "Authenticated users can view all pocs" ON public.pocs;
DROP POLICY IF EXISTS "Authenticated users can update pocs" ON public.pocs;
DROP POLICY IF EXISTS "Authenticated users can delete pocs" ON public.pocs;
DROP POLICY IF EXISTS "Authenticated users can create pocs" ON public.pocs;

-- Create helper function to check if user owns the lead
CREATE OR REPLACE FUNCTION public.owns_lead(_user_id uuid, _lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leads
    WHERE id = _lead_id AND created_by = _user_id
  )
$$;

-- Create new secure policies for pocs table
-- Users can view their own POCs (where they own the lead) OR all POCs if admin
CREATE POLICY "Users can view their own pocs" 
ON public.pocs 
FOR SELECT 
USING (
  owns_lead(auth.uid(), lead_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can create POCs for leads they own
CREATE POLICY "Users can create pocs for their leads" 
ON public.pocs 
FOR INSERT 
WITH CHECK (
  owns_lead(auth.uid(), lead_id)
);

-- Users can update POCs for leads they own
CREATE POLICY "Users can update their own pocs" 
ON public.pocs 
FOR UPDATE 
USING (
  owns_lead(auth.uid(), lead_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete POCs for leads they own
CREATE POLICY "Users can delete their own pocs" 
ON public.pocs 
FOR DELETE 
USING (
  owns_lead(auth.uid(), lead_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Drop existing overly permissive policies on activities
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON public.activities;

-- Create new secure policy for activities
-- Users can only view their own activities (or all if admin)
CREATE POLICY "Users can view their own activities" 
ON public.activities 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_pocs_lead_id ON public.pocs(lead_id);
CREATE INDEX IF NOT EXISTS idx_pocs_response_type ON public.pocs(response_type);
CREATE INDEX IF NOT EXISTS idx_pocs_auto_removed ON public.pocs(auto_removed);
CREATE INDEX IF NOT EXISTS idx_pocs_invite_accepted_at ON public.pocs(invite_accepted_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_status ON public.notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_poc_id ON public.notifications(poc_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_created_by ON public.leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_templates_followup_day ON public.templates(followup_day);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);