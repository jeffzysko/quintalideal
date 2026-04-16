-- Add assigned_to column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to UUID DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON public.leads(assigned_to);