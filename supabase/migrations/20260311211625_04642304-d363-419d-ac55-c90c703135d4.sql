-- Fix franchises_public view to use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.franchises_public;
CREATE VIEW public.franchises_public
WITH (security_invoker = true)
AS
SELECT id, nome_franquia, slug_url, cidade_base, whatsapp, ativa
FROM public.franchises;

-- Grant public access to the view (since franchises table now requires auth, 
-- we need a permissive policy for anon access via the view for the landing page)
-- Re-add a limited anon SELECT policy on franchises for the view to work
CREATE POLICY "Anon can read active franchises"
  ON public.franchises
  FOR SELECT
  TO anon
  USING (ativa = true);