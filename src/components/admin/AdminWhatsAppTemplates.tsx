import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, ChevronDown, ChevronUp, Save, RotateCcw, Zap, Users, FileText, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

interface DbTemplate {
  id: string;
  template_key: string;
  label: string;
  description: string | null;
  category: string;
  message_text: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <Users className="w-3 h-3" /> },
  proposal: { label: 'Proposta', color: 'bg-primary/10 text-primary border-primary/20', icon: <FileText className="w-3 h-3" /> },
  followup: { label: 'Follow-up', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: <Clock className="w-3 h-3" /> },
};

const iconMap: Record<string, React.ReactNode> = {
  lead_created: <Users className="w-4 h-4" />,
  lead_welcome: <MessageCircle className="w-4 h-4" />,
  lead_negotiation: <Zap className="w-4 h-4" />,
  proposal_sent: <FileText className="w-4 h-4" />,
  proposal_accepted: <FileText className="w-4 h-4" />,
  proposal_viewed_followup: <Clock className="w-4 h-4" />,
  proposal_expiring: <Clock className="w-4 h-4" />,
};

const FLOW_ORDER = ['lead_created', 'lead_welcome', 'proposal_sent', 'proposal_viewed_followup', 'proposal_expiring', 'proposal_accepted', 'lead_negotiation'];

export function AdminWhatsAppTemplates() {
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as DbTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, message_text }: { id: string; message_text: string }) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ message_text })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template salvo com sucesso!');
      setEditingKey(null);
    },
    onError: () => toast.error('Erro ao salvar template.'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  });

  const handleEdit = (key: string, currentMsg: string) => {
    if (editingKey === key) {
      setEditingKey(null);
      return;
    }
    setEditingKey(key);
    if (!editedMessages[key]) {
      setEditedMessages(prev => ({ ...prev, [key]: currentMsg }));
    }
  };

  const handleSave = (tpl: DbTemplate) => {
    const msg = editedMessages[tpl.template_key];
    if (msg) {
      updateMutation.mutate({ id: tpl.id, message_text: msg });
    }
  };

  const handleReset = (tpl: DbTemplate, defaultMsg: string) => {
    setEditedMessages(prev => ({ ...prev, [tpl.template_key]: defaultMsg }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

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
            Visualize e edite as mensagens automáticas enviadas via Z-API. As alterações são aplicadas imediatamente nos próximos disparos.
          </p>
        </div>
        <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">
          {templates.length} templates
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
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {FLOW_ORDER.map((key, i, arr) => {
              const tpl = templates.find(t => t.template_key === key);
              if (!tpl) return null;
              const cat = categoryConfig[tpl.category] || categoryConfig.lead;
              return (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${cat.color} ${!tpl.is_active ? 'opacity-40 line-through' : ''}`}>
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
        {templates.map((tpl) => {
          const cat = categoryConfig[tpl.category] || categoryConfig.lead;
          const isEditing = editingKey === tpl.template_key;
          const currentMsg = editedMessages[tpl.template_key] || tpl.message_text;

          return (
            <Card key={tpl.id} className={`border-border/50 overflow-hidden ${!tpl.is_active ? 'opacity-60' : ''}`}>
              <div className="w-full text-left px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => handleEdit(tpl.template_key, tpl.message_text)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                    {iconMap[tpl.template_key] || <MessageCircle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{tpl.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tpl.description}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <Switch
                    checked={tpl.is_active}
                    onCheckedChange={(val) => toggleMutation.mutate({ id: tpl.id, is_active: val })}
                    aria-label={`Ativar ${tpl.label}`}
                  />
                  <button onClick={() => handleEdit(tpl.template_key, tpl.message_text)}>
                    {isEditing ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

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
                        <span className="text-xs text-muted-foreground font-medium">Variáveis:</span>
                        {tpl.variables.map(v => (
                          <span key={v} className="text-xs bg-muted/60 text-foreground px-1.5 py-0.5 rounded font-mono">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>

                      <Textarea
                        value={currentMsg}
                        onChange={(e) => setEditedMessages(prev => ({ ...prev, [tpl.template_key]: e.target.value }))}
                        className="min-h-[140px] text-xs font-mono leading-relaxed resize-y"
                        placeholder="Escreva o template..."
                      />

                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => handleReset(tpl, tpl.message_text)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurar padrão
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 text-xs bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => handleSave(tpl)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                          ) : (
                            <><Save className="w-3.5 h-3.5" /> Salvar</>
                          )}
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
            <strong>Como funciona:</strong> As mensagens são disparadas automaticamente via Z-API quando o evento correspondente ocorre. 
            As variáveis entre <code className="bg-muted px-1 rounded font-mono text-xs">{`{{variavel}}`}</code> são substituídas pelos dados reais no momento do envio.
            Use o toggle para ativar/desativar templates individualmente. Para configurar as credenciais Z-API, acesse as <strong>Configurações de WhatsApp</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
