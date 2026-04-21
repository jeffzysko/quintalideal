import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, FileText, ArrowRightLeft, MessageCircle, Thermometer, Send, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnifiedEvent {
  id: string;
  type: 'activity' | 'whatsapp' | 'followup';
  subtype: string;
  content: string;
  date: string;
  metadata?: Record<string, unknown> | null;
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string; dotColor: string; emoji: string }> = {
  note: { label: 'Anotacao', icon: FileText, color: 'text-primary', dotColor: 'bg-primary', emoji: '📝' },
  call: { label: 'Ligacao', icon: Phone, color: 'text-emerald-600', dotColor: 'bg-emerald-500', emoji: '📞' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', dotColor: 'bg-green-500', emoji: '💬' },
  status_change: { label: 'Mudanca de estagio', icon: ArrowRightLeft, color: 'text-amber-600', dotColor: 'bg-amber-500', emoji: '🔄' },
  temperature_change: { label: 'Temperatura', icon: Thermometer, color: 'text-orange-600', dotColor: 'bg-orange-500', emoji: '🌡️' },
  whatsapp_msg: { label: 'WhatsApp enviado', icon: MessageCircle, color: 'text-success', dotColor: 'bg-success', emoji: '💬' },
  followup: { label: 'Follow-up', icon: CalendarClock, color: 'text-violet-600', dotColor: 'bg-violet-500', emoji: '📝' },
  proposal: { label: 'Proposta', icon: FileText, color: 'text-primary', dotColor: 'bg-primary', emoji: '📋' },
};

const ADD_TYPES = [
  { value: 'note', label: '📝 Nota' },
  { value: 'call', label: '📞 Ligacao' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
];

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Novo lead (notificacao franquia)',
  lead_welcome: 'Boas-vindas ao lead',
  lead_negotiation: 'Follow-up em negociacao',
  proposal_sent: 'Proposta enviada',
  proposal_viewed_followup: 'Lembrete: proposta visualizada',
  proposal_expiring: 'Lembrete: proposta vencendo',
  proposal_accepted: 'Proposta aceita',
};

interface Props {
  leadId: string;
  franchiseId: string | null;
  leadName?: string | null;
}

export function UnifiedConversation({ leadId }: Props) {
  const { user } = useAuth();
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('note');
  const [saving, setSaving] = useState(false);

  // Fetch activities
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ['lead-activities-unified', leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_activities')
        .select('id, activity_type, content, created_at, metadata')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!leadId,
  });

  // Fetch whatsapp messages
  const { data: whatsappMsgs = [] } = useQuery({
    queryKey: ['lead-whatsapp-unified', leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('id, created_at, status, template_key, message_text')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!leadId,
  });

  // Fetch followups
  const { data: followups = [] } = useQuery({
    queryKey: ['lead-followups-unified', leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_followups')
        .select('id, scheduled_at, note, completed, created_at')
        .eq('lead_id', leadId)
        .order('scheduled_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!leadId,
  });

  // Merge all events into a single sorted feed
  const events = useMemo<UnifiedEvent[]>(() => {
    const all: UnifiedEvent[] = [];

    for (const a of activities) {
      all.push({
        id: `act-${a.id}`,
        type: 'activity',
        subtype: a.activity_type,
        content: a.content || '',
        date: a.created_at,
        metadata: a.metadata as Record<string, unknown> | null,
      });
    }

    for (const m of whatsappMsgs) {
      const eventLabel = EVENT_LABELS[m.template_key || ''] || m.template_key || 'Manual';
      const statusLabel = m.status === 'sent' ? '✅' : m.status === 'failed' ? '❌' : '⏳';
      const preview = m.message_text.length > 120 ? m.message_text.slice(0, 120) + '...' : m.message_text;
      all.push({
        id: `wa-${m.id}`,
        type: 'whatsapp',
        subtype: 'whatsapp_msg',
        content: `${statusLabel} ${eventLabel}\n${preview}`,
        date: m.created_at,
      });
    }

    for (const f of followups) {
      const statusText = f.completed ? '✅ Concluido' : new Date(f.scheduled_at) < new Date() ? '⚠️ Atrasado' : '📅 Agendado';
      all.push({
        id: `fu-${f.id}`,
        type: 'followup',
        subtype: 'followup',
        content: `${statusText}${f.note ? ` - ${f.note}` : ''}`,
        date: f.scheduled_at,
      });
    }

    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return all;
  }, [activities, whatsappMsgs, followups]);

  const handleAdd = async () => {
    if (!newContent.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: user.id,
      activity_type: newType,
      content: newContent.trim(),
    });
    if (error) {
      toast.error('Erro ao salvar atividade');
    } else {
      toast.success('Atividade registrada');
      setNewContent('');
      setNewType('note');
      refetchActivities();
    }
    setSaving(false);
  };

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), "d 'de' MMM 'as' HH:mm", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Conversa</h2>
          {events.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">
              {events.length}
            </span>
          )}
        </div>

        {/* Add activity form */}
        {user && (
          <div className="mb-4 space-y-2 bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Descreva a atividade..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              className="min-h-[60px] text-xs resize-none"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving || !newContent.trim()}
              className="w-full gap-1.5 h-8 text-xs"
            >
              <Send className="w-3 h-3" />
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        )}

        {/* Unified Feed */}
        {events.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">
              Nenhuma atividade registrada. Adicione uma nota acima!
            </p>
          </div>
        ) : (
          <ScrollArea className={events.length > 6 ? 'h-[400px]' : ''}>
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

              <AnimatePresence initial={false}>
                {events.map((evt, i) => {
                  const config = EVENT_CONFIG[evt.subtype] || EVENT_CONFIG.note;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.1) }}
                      className="relative mb-3 last:mb-0"
                    >
                      <div className={`absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center ${config.dotColor}`}>
                        <Icon className="w-2 h-2 text-white" />
                      </div>

                      <div className="bg-muted/30 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                            {config.emoji} {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(evt.date)}</span>
                        </div>
                        {evt.content && (
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{evt.content}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
