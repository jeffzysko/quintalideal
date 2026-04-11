
-- Fix 1: Restrict webhook_logs INSERT - edge functions use service_role which bypasses RLS
-- So we can safely restrict client-side inserts
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "Service can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Fix 2: Hide webhook_secret from franchise users by using column-level approach
-- Create a secure view for franchise reads that excludes webhook_secret
CREATE OR REPLACE VIEW public.franchise_safe AS
SELECT
  id, nome_franquia, slug_url, cidade_base, cidades_atendidas,
  responsavel, whatsapp, email, ativa, created_at,
  last_accessed_at, last_lead_activity_at, meta_pixel_id,
  webhook_url
  -- webhook_secret is intentionally excluded
FROM public.franchises;

-- Grant access to the view
GRANT SELECT ON public.franchise_safe TO authenticated;
GRANT SELECT ON public.franchise_safe TO anon;
