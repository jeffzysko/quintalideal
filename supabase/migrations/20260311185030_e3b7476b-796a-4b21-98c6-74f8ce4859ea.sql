-- Remove the overly permissive combined policy
DROP POLICY IF EXISTS "Authenticated can read leads for map" ON public.leads;

-- Restore proper isolated policies
CREATE POLICY "Admins can read all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica'::app_role));

CREATE POLICY "Franchise can read own leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'franquia'::app_role) AND franquia_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Anon can read leads for public features"
  ON public.leads
  FOR SELECT
  TO anon
  USING (true);