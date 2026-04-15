CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  function_name text DEFAULT NULL,
  message text NOT NULL,
  stack text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  franchise_id uuid REFERENCES public.franchises(id) ON DELETE SET NULL DEFAULT NULL,
  user_id uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert (frontend error reporting)
CREATE POLICY "Authenticated users can insert error logs"
ON public.error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can read all error logs
CREATE POLICY "Admins can read error logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Admins can update error logs
CREATE POLICY "Admins can update error logs"
ON public.error_logs FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE INDEX idx_error_logs_severity_created ON public.error_logs (severity, created_at DESC);
CREATE INDEX idx_error_logs_source_created ON public.error_logs (source, created_at DESC);