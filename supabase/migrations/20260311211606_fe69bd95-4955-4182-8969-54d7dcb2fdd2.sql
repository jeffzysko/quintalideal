-- 1. PRIVILEGE ESCALATION FIX: Prevent non-admin users from changing their own franquia_id
CREATE OR REPLACE FUNCTION public.protect_franquia_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.franquia_id IS DISTINCT FROM NEW.franquia_id THEN
    IF NOT public.has_role(auth.uid(), 'admin_fabrica') THEN
      RAISE EXCEPTION 'You are not allowed to change franquia_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_franquia_id_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_franquia_id();

-- 2. EXPOSED SENSITIVE DATA FIX: Create a public view for franchise data without sensitive columns
CREATE OR REPLACE VIEW public.franchises_public AS
SELECT id, nome_franquia, slug_url, cidade_base, whatsapp, ativa
FROM public.franchises;

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can read franchises" ON public.franchises;

-- Replace with authenticated-only read policy
CREATE POLICY "Authenticated can read franchises"
  ON public.franchises
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. LEADS_MAP VIEW FIX: Recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.leads_map;
CREATE VIEW public.leads_map
WITH (security_invoker = true)
AS
SELECT id, cidade, pontuacao_quintal, modelo_recomendado, created_at
FROM public.leads;