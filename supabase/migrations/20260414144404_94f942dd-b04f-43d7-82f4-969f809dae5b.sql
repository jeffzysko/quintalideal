-- Drop the anon-only policy and recreate for public (both anon and authenticated)
DROP POLICY IF EXISTS "Anyone can read active franchises via public view" ON public.franchises;

CREATE POLICY "Anyone can read active franchises via public view"
ON public.franchises
FOR SELECT
TO anon, authenticated
USING (ativa = true);
