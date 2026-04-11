-- Fix 1: Restrict webhook_logs INSERT to service role only (edge functions use service role)
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "Service can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Fix 2: Restrict admin role assignment - only super_admin can assign super_admin
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT
  TO public
  WITH CHECK (
    (has_role(auth.uid(), 'super_admin'::app_role))
    OR (
      has_role(auth.uid(), 'admin_fabrica'::app_role)
      AND role != 'super_admin'::app_role
    )
  );