-- Allow admins to delete leads
CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin_fabrica'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow franchise to delete own leads
CREATE POLICY "Franchise can delete own leads"
ON public.leads FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'franquia'::app_role) 
  AND franquia_id = get_user_franquia_id(auth.uid())
);