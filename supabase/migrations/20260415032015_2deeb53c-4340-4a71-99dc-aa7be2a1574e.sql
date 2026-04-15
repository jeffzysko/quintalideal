
-- Add orcamento plan columns to franchises
ALTER TABLE public.franchises
ADD COLUMN IF NOT EXISTS orcamento_plan_active boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS orcamento_stripe_subscription_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS orcamento_stripe_customer_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS orcamento_stripe_subscription_status text DEFAULT NULL;

-- Create enforce_orcamento_plan trigger function
CREATE OR REPLACE FUNCTION public.enforce_orcamento_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If whatsapp plan is active, automatically keep orcamento active
  IF NEW.whatsapp_plan_active = true THEN
    NEW.orcamento_plan_active := true;
  END IF;

  -- Prevent franchise users from changing orcamento_plan_active directly
  IF OLD.orcamento_plan_active IS DISTINCT FROM NEW.orcamento_plan_active THEN
    IF auth.uid() IS NOT NULL AND NOT (
      public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR
      public.has_role(auth.uid(), 'super_admin'::app_role)
    ) THEN
      -- Allow only if it was auto-set by whatsapp_plan_active logic above
      IF NEW.whatsapp_plan_active = false OR NEW.whatsapp_plan_active = OLD.whatsapp_plan_active THEN
        NEW.orcamento_plan_active := OLD.orcamento_plan_active;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER enforce_orcamento_plan_trigger
BEFORE INSERT OR UPDATE ON public.franchises
FOR EACH ROW
EXECUTE FUNCTION public.enforce_orcamento_plan();

-- Create has_orcamento_access function
CREATE OR REPLACE FUNCTION public.has_orcamento_access(_franchise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.franchises
    WHERE id = _franchise_id
      AND (orcamento_plan_active = true OR whatsapp_plan_active = true)
  )
$$;
