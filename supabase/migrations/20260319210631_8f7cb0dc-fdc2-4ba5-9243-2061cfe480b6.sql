
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'novo_lead',
  url text NOT NULL,
  http_status integer,
  success boolean NOT NULL DEFAULT false,
  attempt integer NOT NULL DEFAULT 1,
  error_message text,
  response_body text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_franchise_id ON public.webhook_logs(franchise_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own webhook logs"
  ON public.webhook_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franquia'::app_role)
    AND franchise_id = get_user_franquia_id(auth.uid())
  );

CREATE POLICY "Admins can read all webhook logs"
  ON public.webhook_logs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Service can insert webhook logs"
  ON public.webhook_logs FOR INSERT TO public
  WITH CHECK (true);
