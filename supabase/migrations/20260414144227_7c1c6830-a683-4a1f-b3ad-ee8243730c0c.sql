-- Allow anon/public users to read active franchises through the franchises_public view
CREATE POLICY "Anyone can read active franchises via public view"
ON public.franchises
FOR SELECT
TO anon
USING (ativa = true);
