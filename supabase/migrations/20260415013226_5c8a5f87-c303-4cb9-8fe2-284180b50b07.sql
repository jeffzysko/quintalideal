-- Add billing fields
ALTER TABLE public.franchises
  ADD COLUMN IF NOT EXISTS whatsapp_plan_expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_plan_price numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_plan_notes text DEFAULT NULL;

-- Update the enforce_whatsapp_plan function to also check expiration
CREATE OR REPLACE FUNCTION public.enforce_whatsapp_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-expire: if plan has an expiration date that has passed, deactivate
  IF NEW.whatsapp_plan_active = true
     AND NEW.whatsapp_plan_expires_at IS NOT NULL
     AND NEW.whatsapp_plan_expires_at < now() THEN
    NEW.whatsapp_plan_active := false;
    NEW.whatsapp_mode := 'platform';
    NEW.zapi_instance_active := false;
  END IF;

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
$function$;
