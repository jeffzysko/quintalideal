-- Add multi-instance Z-API fields to franchises
ALTER TABLE public.franchises
  ADD COLUMN IF NOT EXISTS whatsapp_mode text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS zapi_instance_id text,
  ADD COLUMN IF NOT EXISTS zapi_token text,
  ADD COLUMN IF NOT EXISTS zapi_client_token text,
  ADD COLUMN IF NOT EXISTS zapi_instance_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_plan_active boolean NOT NULL DEFAULT false;

-- Add a check constraint for whatsapp_mode values
ALTER TABLE public.franchises
  ADD CONSTRAINT franchises_whatsapp_mode_check CHECK (whatsapp_mode IN ('platform', 'own'));

-- Create a trigger to force whatsapp_mode back to 'platform' when plan is deactivated
CREATE OR REPLACE FUNCTION public.enforce_whatsapp_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If plan is being deactivated, force mode back to platform
  IF OLD.whatsapp_plan_active = true AND NEW.whatsapp_plan_active = false THEN
    NEW.whatsapp_mode := 'platform';
  END IF;
  
  -- Prevent franchise users from changing whatsapp_plan_active
  IF OLD.whatsapp_plan_active IS DISTINCT FROM NEW.whatsapp_plan_active THEN
    IF auth.uid() IS NOT NULL AND NOT (
      public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR 
      public.has_role(auth.uid(), 'super_admin'::app_role)
    ) THEN
      NEW.whatsapp_plan_active := OLD.whatsapp_plan_active;
    END IF;
  END IF;
  
  -- Prevent setting mode to 'own' if plan is not active
  IF NEW.whatsapp_mode = 'own' AND NEW.whatsapp_plan_active = false THEN
    NEW.whatsapp_mode := 'platform';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_whatsapp_plan_trigger
  BEFORE UPDATE ON public.franchises
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_whatsapp_plan();