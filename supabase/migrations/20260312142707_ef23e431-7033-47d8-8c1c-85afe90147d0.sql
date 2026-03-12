-- Allow trusted backend/system contexts (auth.uid() is null) and admins to change franquia_id
CREATE OR REPLACE FUNCTION public.protect_franquia_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.franquia_id IS DISTINCT FROM NEW.franquia_id THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT public.has_role(auth.uid(), 'admin_fabrica'::app_role) THEN
      RAISE EXCEPTION 'You are not allowed to change franquia_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill missing franchise bindings for franchise users by matching login email with franchise email
UPDATE public.profiles p
SET franquia_id = f.id,
    updated_at = now()
FROM auth.users u
JOIN public.user_roles ur
  ON ur.user_id = u.id
 AND ur.role = 'franquia'::app_role
JOIN public.franchises f
  ON lower(trim(f.email)) = lower(trim(u.email))
WHERE p.user_id = u.id
  AND p.franquia_id IS NULL;