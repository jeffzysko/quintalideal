
-- Fix user_roles INSERT policy to apply to authenticated only
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (has_role(auth.uid(), 'admin_fabrica'::app_role) AND role != 'super_admin'::app_role)
  );

-- Also fix user_roles DELETE policy to authenticated
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
