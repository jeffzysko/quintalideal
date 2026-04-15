CREATE POLICY "Super admins can delete error logs"
ON public.error_logs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));