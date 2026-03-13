-- =============================================
-- FIX 1: Prevent profile franquia_id hijacking
-- =============================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND franquia_id IS NOT DISTINCT FROM (SELECT p.franquia_id FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- =============================================
-- FIX 2: Restrict franchise table access by role
-- =============================================
DROP POLICY IF EXISTS "Authenticated can read franchises" ON public.franchises;

CREATE POLICY "Admins can read all franchises"
ON public.franchises
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can read own franchise"
ON public.franchises
FOR SELECT
TO authenticated
USING (id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Viewer can read own franchise"
ON public.franchises
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'visualizador'::app_role)
  AND id = get_user_franquia_id(auth.uid())
);

-- =============================================
-- FIX 3: Restrict notification inserts
-- =============================================
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

CREATE POLICY "Service can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'franquia'::app_role)
);