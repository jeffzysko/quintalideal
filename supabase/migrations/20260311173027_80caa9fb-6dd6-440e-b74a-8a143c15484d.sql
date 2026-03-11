
CREATE POLICY "Franchise can update own franchise"
ON public.franchises
FOR UPDATE
TO authenticated
USING (id = get_user_franquia_id(auth.uid()))
WITH CHECK (id = get_user_franquia_id(auth.uid()));
