-- Add dedicated columns for location detection analytics to the leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS location_detection_status TEXT,
ADD COLUMN IF NOT EXISTS location_detected_name TEXT;

-- Add indexes for better performance on reporting
CREATE INDEX IF NOT EXISTS idx_leads_location_detection_status ON public.leads(location_detection_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at_location ON public.leads(created_at, location_detection_status);
