-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read leads for map and rankings" ON public.leads;

-- Create a view for the public map that only exposes non-sensitive data
CREATE VIEW public.leads_map
WITH (security_invoker = false) AS
  SELECT id, cidade, pontuacao_quintal, modelo_recomendado, created_at
  FROM public.leads;

-- Grant access to the view
GRANT SELECT ON public.leads_map TO anon, authenticated;