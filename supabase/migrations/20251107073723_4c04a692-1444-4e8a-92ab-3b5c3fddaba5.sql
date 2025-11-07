-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_contacted_at = NOW();
  RETURN NEW;
END;
$$;