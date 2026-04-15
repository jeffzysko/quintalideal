
CREATE TABLE public.franchise_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_franquia text NOT NULL,
  cidade_base text NOT NULL,
  nome_responsavel text NOT NULL,
  whatsapp_responsavel text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL,
  reviewed_by uuid DEFAULT NULL
);

ALTER TABLE public.franchise_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (public form)
CREATE POLICY "Anyone can insert franchise applications"
ON public.franchise_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can read applications
CREATE POLICY "Admins can read franchise applications"
ON public.franchise_applications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only admins can update applications
CREATE POLICY "Admins can update franchise applications"
ON public.franchise_applications
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Index for admin panel queries
CREATE INDEX idx_franchise_applications_status_created
ON public.franchise_applications (status, created_at DESC);
