-- Allow all authenticated users to view profile names
-- This is needed for showing lead creator names in the team environment
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);