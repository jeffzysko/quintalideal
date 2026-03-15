
-- Add last_accessed_at to franchises for inactivity tracking
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS last_accessed_at timestamp with time zone DEFAULT now();

-- Add last_lead_activity_at to track when franchise last moved a lead
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS last_lead_activity_at timestamp with time zone DEFAULT NULL;
