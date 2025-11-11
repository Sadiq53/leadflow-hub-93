-- Add source_link column to leads table
ALTER TABLE public.leads
ADD COLUMN source_link text;

-- Add followup_day field to templates table to mark which day the template is for
ALTER TABLE public.templates
ADD COLUMN followup_day integer CHECK (followup_day >= 1 AND followup_day <= 3);