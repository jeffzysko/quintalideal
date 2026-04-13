
-- Log de mensagens WhatsApp enviadas
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  phone text NOT NULL,
  template_key text,
  message_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  zapi_message_id text,
  error_message text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_whatsapp_messages_franchise ON public.whatsapp_messages(franchise_id);
CREATE INDEX idx_whatsapp_messages_lead ON public.whatsapp_messages(lead_id);
CREATE INDEX idx_whatsapp_messages_status ON public.whatsapp_messages(status);

CREATE POLICY "Admins can read all whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Franchise can read own whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can insert own whatsapp messages"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()) AND sent_by = auth.uid())
    OR has_role(auth.uid(), 'admin_fabrica')
    OR has_role(auth.uid(), 'super_admin')
  );

-- Configuração Z-API por franquia (Fase 2)
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL UNIQUE,
  instance_id text,
  token text,
  security_token text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all whatsapp config"
  ON public.whatsapp_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Franchise can read own whatsapp config"
  ON public.whatsapp_config FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can update own whatsapp config"
  ON public.whatsapp_config FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()));
