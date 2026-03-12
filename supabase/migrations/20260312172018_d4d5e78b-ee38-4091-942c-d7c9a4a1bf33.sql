-- Update RLS policies to include super_admin wherever admin_fabrica is used

-- profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- franchises
DROP POLICY IF EXISTS "Admins can insert franchises" ON public.franchises;
CREATE POLICY "Admins can insert franchises" ON public.franchises FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update franchises" ON public.franchises;
CREATE POLICY "Admins can update franchises" ON public.franchises FOR UPDATE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete franchises" ON public.franchises;
CREATE POLICY "Admins can delete franchises" ON public.franchises FOR DELETE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- leads
DROP POLICY IF EXISTS "Admins can read all leads" ON public.leads;
CREATE POLICY "Admins can read all leads" ON public.leads FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all leads" ON public.leads;
CREATE POLICY "Admins can update all leads" ON public.leads FOR UPDATE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- analytics_events
DROP POLICY IF EXISTS "Admins can read all events" ON public.analytics_events;
CREATE POLICY "Admins can read all events" ON public.analytics_events FOR SELECT USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- pool_models
DROP POLICY IF EXISTS "Admins can insert pool models" ON public.pool_models;
CREATE POLICY "Admins can insert pool models" ON public.pool_models FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update pool models" ON public.pool_models;
CREATE POLICY "Admins can update pool models" ON public.pool_models FOR UPDATE USING (has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Update protect_franquia_id to also allow super_admin
CREATE OR REPLACE FUNCTION public.protect_franquia_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.franquia_id IS DISTINCT FROM NEW.franquia_id THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT (public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
      RAISE EXCEPTION 'You are not allowed to change franquia_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
