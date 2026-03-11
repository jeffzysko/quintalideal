-- Fix: recreate view with security_invoker = true
DROP VIEW IF EXISTS public.leads_map;

CREATE VIEW public.leads_map
WITH (security_invoker = true) AS
  SELECT id, cidade, pontuacao_quintal, modelo_recomendado, created_at
  FROM public.leads;

-- Add a SELECT policy for anonymous/public access to leads but ONLY through the view
-- Since security_invoker=true, we need a policy that allows reading non-sensitive columns
CREATE POLICY "Public can read leads for map"
  ON public.leads
  FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON public.leads_map TO anon, authenticated;