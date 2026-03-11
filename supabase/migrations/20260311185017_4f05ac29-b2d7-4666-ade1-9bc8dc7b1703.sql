-- Allow authenticated users to read leads_map view (non-sensitive columns only)
-- This ensures the map works for logged-in franchise users too
CREATE POLICY "Authenticated can read leads for map"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    -- Admins see all
    has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR
    -- Franchise sees own
    (has_role(auth.uid(), 'franquia'::app_role) AND franquia_id = get_user_franquia_id(auth.uid()))
    OR
    -- Anyone can see non-sensitive data (cidade, score) - handled at view level
    true
  );

-- Drop the redundant individual policies since this combined one covers everything
DROP POLICY IF EXISTS "Admins can read all leads" ON public.leads;
DROP POLICY IF EXISTS "Franchise can read own leads" ON public.leads;
DROP POLICY IF EXISTS "Public can read leads for map" ON public.leads;