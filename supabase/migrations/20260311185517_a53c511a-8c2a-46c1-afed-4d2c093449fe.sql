
-- Remove anon direct access to leads table (PII exposure risk)
DROP POLICY IF EXISTS "Anon can read leads for public features" ON public.leads;

-- Recreate the view WITHOUT security_invoker so it runs as definer (bypasses RLS)
DROP VIEW IF EXISTS public.leads_map;

CREATE VIEW public.leads_map
WITH (security_invoker = false) AS
  SELECT id, cidade, pontuacao_quintal, modelo_recomendado, created_at
  FROM public.leads;

-- Grant access to the safe view for both anon and authenticated
GRANT SELECT ON public.leads_map TO anon, authenticated;
