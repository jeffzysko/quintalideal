
CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_usage_logs_franchise_event_date
  ON public.usage_logs (franchise_id, event_type, created_at);

-- Franchise can read own logs
CREATE POLICY "Franchise can read own usage logs"
  ON public.usage_logs FOR SELECT
  TO authenticated
  USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  );

-- Admins can read all logs
CREATE POLICY "Admins can read all usage logs"
  ON public.usage_logs FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Service role insert (edge functions use service role key, bypasses RLS)
-- But also allow admins to insert for flexibility
CREATE POLICY "Admins can insert usage logs"
  ON public.usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );
