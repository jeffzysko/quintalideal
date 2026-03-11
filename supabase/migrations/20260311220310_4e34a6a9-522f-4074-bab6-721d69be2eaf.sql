
-- Remove the anon policy on base franchises table entirely
-- Anon users should only use franchises_public view
DROP POLICY IF EXISTS "Anon can read active franchises limited" ON public.franchises;
