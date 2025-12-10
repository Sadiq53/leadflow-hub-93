-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view POCs from their leads" ON public.pocs;

-- Create new policy allowing all authenticated users to view all POCs
CREATE POLICY "Authenticated users can view all POCs" 
ON public.pocs 
FOR SELECT 
USING (true);