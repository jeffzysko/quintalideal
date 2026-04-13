import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ChevronDown, ChevronUp, Save, RotateCcw, Zap, Users, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TemplateItem {
  key: string;
  label: string;
  description: string;
  category: 'lead' | 'proposal' | 'followup';
  icon: React.ReactNode;
  defaultMessage: string;
  variables: string[];
}

const TEMPLATES: TemplateItem[] = [
  {
    key: 'lead_created',
    label: 'Novo lead (para franquia)',
    description: 'Alerta enviado à franquia quando um novo lead é gerado.',
    category: 'lead',
    icon: <Users className="w-4 h-4" />,
    defaultMessage: `Novo lead recebido! 🏊\n*Nome:* {{nome}}\n*Telefone:* {{telefone}}\n*Origem:* {{origem}}\nAcesse o painel para iniciar o atendimento.`,
    variables: ['nome', 'telefone', 'origem'],
  },
  {
    key: 'lead_welcome',
    label: 'Boas-vindas ao lead',
    description: 'Mensagem automática enviada ao lead após preencher o quiz.',
    category: 'lead',
    icon: <MessageCircle className="w-4 h-4" />,
    defaultMessage: `Olá, {{nome}}! 😊\nRecebemos seu interesse em um projeto de piscina e em breve um consultor da *{{franquia}}* vai entrar em contato.\nSe preferir falar agora, é só clicar aqui:\n👉 {{link_whatsapp}}`,
    variables: ['nome', 'franquia', 'link_whatsapp'],
  },
  {
    key: 'lead_negotiation',
    label: 'Lead em negociação',
    description: 'Mensagem enviada ao lead quando muda para "Em Negociação".',
    category: 'followup',
    icon: <Zap className="w-4 h-4" />,
    defaultMessage: `Olá, {{nome}}!\nEstamos à disposição para tirar qualquer dúvida sobre sua proposta ou ajustar algum detalhe do projeto.\n👉 {{link_whatsapp}}\n— *{{franquia}}*`,
    variables: ['nome', 'franquia', 'link_whatsapp'],
  },
  {
    key: 'proposal_sent',
    label: 'Proposta enviada',
    description: 'Mensagem enviada ao cliente quando a proposta é criada.',
    category: 'proposal',
    icon: <FileText className="w-4 h-4" />,
    defaultMessage: `Olá, {{nome}}!\nSua proposta personalizada está pronta. Acesse o link para visualizar:\n👉 {{link_proposta}}\nVálida até *{{validade}}*.`,
    variables: ['nome', 'link_proposta', 'validade'],
  },
  {
    key: 'proposal_accepted',
    label: 'Proposta aceita',
    description: 'Mensagem de confirmação enviada ao cliente após aceitar.',
    category: 'proposal',
    icon: <FileText className="w-4 h-4" />,
    defaultMessage: `Olá, {{nome}}! 🎉\nSua proposta foi aceita! Estamos muito felizes em ter você como cliente.\nNossa equipe entrará em contato em breve para os próximos passos.\n— *{{franquia}}*`,
    variables: ['nome', 'franquia'],
  },
  {
    key: 'proposal_viewed_followup',
    label: 'Follow-up após visualização',
    description: 'Enviada 24h após o cliente visualizar a proposta sem responder.',
    category: 'followup',
    icon: <Clock className="w-4 h-4" />,
    defaultMessage: `Olá, {{nome}}!\nVimos que você conferiu sua proposta. Ficou com alguma dúvida ou quer conversar sobre o projeto?\n👉 {{link_whatsapp}}\n— *{{franquia}}*`,
    variables: ['nome', 'franquia', 'link_whatsapp'],
  },
  {
    key: 'proposal_expiring',
    label: 'Proposta vencendo',
    description: 'Lembrete enviado 2 dias antes da validade da proposta.',
    category: 'followup',
    icon: <Clock className="w-4 h-4" />,
    defaultMessage: `Olá, {{nome}}!\nSua proposta vence em *2 dias*, no dia *{{validade}}*. Após essa data os valores podem ser alterados.\nPara garantir, fale com a gente:\n👉 {{link_whatsapp}}\n— *{{franquia}}*`,
    variables: ['nome', 'validade', 'franquia', 'link_whatsapp'],
  },
];

const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <Users className="w-3 h-3" /> },
  proposal: { label: 'Proposta', color: 'bg-primary/10 text-primary border-primary/20', icon: <FileText className="w-3 h-3" /> },
  followup: { label: 'Follow-up', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: <Clock className="w-3 h-3" /> },
};

export function AdminWhatsAppTemplates() {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  const handleEdit = (key: string, defaultMsg: string) => {
    if (editingKey === key) {
      setEditingKey(null);
      return;
    }
    setEditingKey(key);
    if (!editedMessages[key]) {
      setEditedMessages(prev => ({ ...prev, [key]: defaultMsg }));
    }
  };

  const handleSave = (key: string) => {
    // For now, save to localStorage as a preview. Future: save to DB.
    const msg = editedMessages[key];
    if (msg) {
      const stored = JSON.parse(localStorage.getItem('wa_template_overrides') || '{}');
      stored[key] = msg;
      localStorage.setItem('wa_template_overrides', JSON.stringify(stored));
      toast.success('Template salvo localmente! (Preview)');
    }
    setEditingKey(null);
  };

  const handleReset = (key: string, defaultMsg: string) => {
    setEditedMessages(prev => ({ ...prev, [key]: defaultMsg }));
    const stored = JSON.parse(localStorage.getItem('wa_template_overrides') || '{}');
    delete stored[key];
    localStorage.setItem('wa_template_overrides', JSON.stringify(stored));
    toast.info('Template restaurado ao padrão.');
  };

  // Load overrides from localStorage on init
  const getMessageText = (key: string, defaultMsg: string) => {
    if (editedMessages[key]) return editedMessages[key];
    try {
      const stored = JSON.parse(localStorage.getItem('wa_template_overrides') || '{}');
      if (stored[key]) return stored[key];
    } catch {}
    return defaultMsg;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-success" />
            Templates WhatsApp
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Visualize e edite as mensagens automáticas enviadas via Z-API. Ao editar, a mensagem atualizada será utilizada nos próximos disparos.
          </p>
        </div>
        <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
          {TEMPLATES.length} templates
        </span>
      </div>

      {/* Flow diagram */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Fluxo de Automações
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
            {['lead_created', 'lead_welcome', 'proposal_sent', 'proposal_viewed_followup', 'proposal_expiring', 'proposal_accepted', 'lead_negotiation'].map((key, i, arr) => {
              const tpl = TEMPLATES.find(t => t.key === key);
              if (!tpl) return null;
              const cat = categoryConfig[tpl.category];
              return (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${cat.color}`}>
                    {cat.icon}
                    {tpl.label}
                  </span>
                  {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Template cards */}
      <div className="space-y-3">
        {TEMPLATES.map((tpl) => {
          const cat = categoryConfig[tpl.category];
          const isEditing = editingKey === tpl.key;
          const currentMsg = getMessageText(tpl.key, tpl.defaultMessage);

          return (
            <Card key={tpl.key} className="border-border/50 overflow-hidden">
              <button
                onClick={() => handleEdit(tpl.key, tpl.defaultMessage)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                    {tpl.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{tpl.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{tpl.description}</p>
                  </div>
                </div>
                {isEditing ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              <AnimatePresence>
                {isEditing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                      {/* Variables hint */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Variáveis:</span>
                        {tpl.variables.map(v => (
                          <span key={v} className="text-[10px] bg-muted/60 text-foreground px-1.5 py-0.5 rounded font-mono">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>

                      {/* Preview / Edit area */}
                      <Textarea
                        value={currentMsg}
                        onChange={(e) => setEditedMessages(prev => ({ ...prev, [tpl.key]: e.target.value }))}
                        className="min-h-[140px] text-xs font-mono leading-relaxed resize-y"
                        placeholder="Escreva o template..."
                      />

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => handleReset(tpl.key, tpl.defaultMessage)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurar padrão
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 text-xs bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => handleSave(tpl.key)}
                        >
                          <Save className="w-3.5 h-3.5" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Info note */}
      <Card className="border-dashed border-border/50 bg-muted/20">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Como funciona:</strong> As mensagens são disparadas automaticamente via Z-API quando o evento correspondente ocorre (ex: novo lead, proposta enviada). 
            As variáveis entre <code className="bg-muted px-1 rounded font-mono text-[10px]">{`{{variavel}}`}</code> são substituídas pelos dados reais no momento do envio.
            Para ativar/desativar os envios, acesse as <strong>Configurações de WhatsApp</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
