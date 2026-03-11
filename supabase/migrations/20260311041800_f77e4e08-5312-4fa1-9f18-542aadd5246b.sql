
-- Add ref_code to leads for referral tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ref_code text UNIQUE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS referred_by text;

-- Create function to generate short ref codes
CREATE OR REPLACE FUNCTION public.generate_ref_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ref_code IS NULL THEN
    NEW.ref_code := lower(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate ref_code on lead insert
CREATE TRIGGER trigger_generate_ref_code
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ref_code();
