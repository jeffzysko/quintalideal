
-- Create whatsapp_templates table
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'lead',
  message_text TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can read all whatsapp templates"
  ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert whatsapp templates"
  ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update whatsapp templates"
  ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete whatsapp templates"
  ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.whatsapp_templates (template_key, label, description, category, message_text, variables) VALUES
('lead_created', 'Novo lead (para franquia)', 'Alerta enviado à franquia quando um novo lead é gerado.', 'lead',
 E'Novo lead recebido! 🏊\n*Nome:* {{nome}}\n*Telefone:* {{telefone}}\n*Origem:* {{origem}}\nAcesse o painel para iniciar o atendimento.',
 ARRAY['nome', 'telefone', 'origem']),

('lead_welcome', 'Boas-vindas ao lead', 'Mensagem automática enviada ao lead após preencher o quiz.', 'lead',
 E'Olá, {{nome}}! 😊\nRecebemos seu interesse em um projeto de piscina e em breve um consultor da *{{franquia}}* vai entrar em contato.\nSe preferir falar agora, é só clicar aqui:\n👉 {{link_whatsapp}}',
 ARRAY['nome', 'franquia', 'link_whatsapp']),

('lead_negotiation', 'Lead em negociação', 'Mensagem enviada ao lead quando muda para "Em Negociação".', 'followup',
 E'Olá, {{nome}}!\nEstamos à disposição para tirar qualquer dúvida sobre sua proposta ou ajustar algum detalhe do projeto.\n👉 {{link_whatsapp}}\n— *{{franquia}}*',
 ARRAY['nome', 'franquia', 'link_whatsapp']),

('proposal_sent', 'Proposta enviada', 'Mensagem enviada ao cliente quando a proposta é criada.', 'proposal',
 E'Olá, {{nome}}!\nSua proposta personalizada está pronta. Acesse o link para visualizar:\n👉 {{link_proposta}}\nVálida até *{{validade}}*.',
 ARRAY['nome', 'link_proposta', 'validade']),

('proposal_accepted', 'Proposta aceita', 'Mensagem de confirmação enviada ao cliente após aceitar.', 'proposal',
 E'Olá, {{nome}}! 🎉\nSua proposta foi aceita! Estamos muito felizes em ter você como cliente.\nNossa equipe entrará em contato em breve para os próximos passos.\n— *{{franquia}}*',
 ARRAY['nome', 'franquia']),

('proposal_viewed_followup', 'Follow-up após visualização', 'Enviada 24h após o cliente visualizar a proposta sem responder.', 'followup',
 E'Olá, {{nome}}!\nVimos que você conferiu sua proposta. Ficou com alguma dúvida ou quer conversar sobre o projeto?\n👉 {{link_whatsapp}}\n— *{{franquia}}*',
 ARRAY['nome', 'franquia', 'link_whatsapp']),

('proposal_expiring', 'Proposta vencendo', 'Lembrete enviado 2 dias antes da validade da proposta.', 'followup',
 E'Olá, {{nome}}!\nSua proposta vence em *2 dias*, no dia *{{validade}}*. Após essa data os valores podem ser alterados.\nPara garantir, fale com a gente:\n👉 {{link_whatsapp}}\n— *{{franquia}}*',
 ARRAY['nome', 'validade', 'franquia', 'link_whatsapp']);
