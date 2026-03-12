-- Revert view to security_invoker=on to avoid SECURITY DEFINER view risk
ALTER VIEW public.franchises_public SET (security_invoker = on);

-- Safe public accessor for franchise landing pages
CREATE OR REPLACE FUNCTION public.get_public_franchise_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  nome_franquia text,
  slug_url text,
  whatsapp text,
  ativa boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.nome_franquia, f.slug_url, f.whatsapp, f.ativa
  FROM public.franchises f
  WHERE f.slug_url = _slug
    AND f.ativa = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_franchise_by_slug(text) TO anon, authenticated;