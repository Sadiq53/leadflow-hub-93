-- Add delete policies for templates table
CREATE POLICY "Users can delete their own templates" 
ON public.templates 
FOR DELETE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete all templates" 
ON public.templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));