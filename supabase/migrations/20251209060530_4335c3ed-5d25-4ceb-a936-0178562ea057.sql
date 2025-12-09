-- Fix POCs table RLS policies to restrict access based on lead ownership
-- First, drop the existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their own pocs" ON public.pocs;
DROP POLICY IF EXISTS "Users can create pocs for their leads" ON public.pocs;
DROP POLICY IF EXISTS "Users can update their own pocs" ON public.pocs;
DROP POLICY IF EXISTS "Users can delete their own pocs" ON public.pocs;

-- Create proper RLS policies using the owns_lead function
CREATE POLICY "Users can view POCs from their leads"
ON public.pocs
FOR SELECT
USING (
  owns_lead(auth.uid(), lead_id) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create POCs for their leads"
ON public.pocs
FOR INSERT
WITH CHECK (
  owns_lead(auth.uid(), lead_id)
);

CREATE POLICY "Users can update POCs from their leads"
ON public.pocs
FOR UPDATE
USING (
  owns_lead(auth.uid(), lead_id) OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete POCs from their leads"
ON public.pocs
FOR DELETE
USING (
  owns_lead(auth.uid(), lead_id) OR has_role(auth.uid(), 'admin')
);