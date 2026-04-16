
-- 1. Fix franchise_goals: add role check to INSERT and UPDATE policies
DROP POLICY IF EXISTS "Franchise can insert own goals" ON public.franchise_goals;
CREATE POLICY "Franchise can insert own goals"
ON public.franchise_goals
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'franquia'::app_role)
  AND franchise_id = get_user_franquia_id(auth.uid())
);

DROP POLICY IF EXISTS "Franchise can update own goals" ON public.franchise_goals;
CREATE POLICY "Franchise can update own goals"
ON public.franchise_goals
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'franquia'::app_role)
  AND franchise_id = get_user_franquia_id(auth.uid())
);

DROP POLICY IF EXISTS "Franchise can read own goals" ON public.franchise_goals;
CREATE POLICY "Franchise can read own goals"
ON public.franchise_goals
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'franquia'::app_role)
  AND franchise_id = get_user_franquia_id(auth.uid())
);

-- 2. Protect webhook_secret and webhook_url from franchise user modifications
CREATE OR REPLACE FUNCTION public.protect_webhook_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change webhook-related fields
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  THEN
    NEW.webhook_url := OLD.webhook_url;
    NEW.webhook_secret := OLD.webhook_secret;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_webhook_fields
BEFORE UPDATE ON public.franchises
FOR EACH ROW
EXECUTE FUNCTION public.protect_webhook_fields();
