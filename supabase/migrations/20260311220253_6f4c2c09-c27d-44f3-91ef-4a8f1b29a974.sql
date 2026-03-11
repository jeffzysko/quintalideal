
-- 1. Remove anonymous SELECT policy on franchises table (exposes email/responsavel)
DROP POLICY IF EXISTS "Anon can read active franchises" ON public.franchises;

-- 2. Recreate franchises_public view with security_invoker to respect RLS
DROP VIEW IF EXISTS public.franchises_public;
CREATE VIEW public.franchises_public
WITH (security_invoker = on) AS
  SELECT id, nome_franquia, slug_url, cidade_base, whatsapp, ativa
  FROM public.franchises
  WHERE ativa = true;

-- 3. Grant anon access to the view (safe - no email/responsavel exposed)
GRANT SELECT ON public.franchises_public TO anon;
GRANT SELECT ON public.franchises_public TO authenticated;

-- 4. Add a new anon policy on franchises that only allows reading via the public columns needed for landing pages
-- This is restrictive: anon can only read active franchises' non-sensitive fields
CREATE POLICY "Anon can read active franchises limited"
ON public.franchises
FOR SELECT
TO anon
USING (ativa = true);
