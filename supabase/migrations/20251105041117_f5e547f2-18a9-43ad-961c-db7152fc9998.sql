-- Add invite acceptance flag to POCs
ALTER TABLE public.pocs
ADD COLUMN IF NOT EXISTS linkedin_invite_accepted boolean NOT NULL DEFAULT false;