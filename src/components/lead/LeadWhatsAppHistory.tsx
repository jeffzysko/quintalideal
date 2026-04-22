import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  leadId: string;
}

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Novo lead (notificação franquia)',
  lead_welcome: 'Boas-vindas ao lead',
  lead_negotiation: 'Follow-up em negociação',
  proposal_sent: 'Proposta enviada',
  proposal_viewed_followup: 'Lembrete: proposta visualizada',
  proposal_expiring: 'Lembrete: proposta vencendo',
  proposal_accepted: 'Proposta aceita',
};

function statusBadge(status: string) {
  if (status === 'sent') return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs px-1.5">Enviada</Badge>;
  if (status === 'failed') return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs px-1.5">Falha</Badge>;
  return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs px-1.5">Pendente</Badge>;
}

export function LeadWhatsAppHistory({ leadId }: Props) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['lead-whatsapp-messages', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, created_at, status, template_key, message_text, phone')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-3 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-foreground">Histórico de WhatsApp</h2>
          </div>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-16 bg-muted/40 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-foreground">Histórico de WhatsApp</h2>
          </div>
          {messages.length > 0 && (
            <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium">
              {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
            </span>
          )}
        </div>

        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhuma mensagem enviada ainda para este lead.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const preview = msg.message_text.length > 80
                ? msg.message_text.slice(0, 80) + '...'
                : msg.message_text;
              const eventLabel = EVENT_LABELS[msg.template_key || ''] || msg.template_key || 'Manual';
              const date = format(new Date(msg.created_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR });

              return (
                <div key={msg.id} className="flex gap-3 bg-muted/30 rounded-xl p-3 hover:bg-muted/50 transition-colors">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-foreground">{eventLabel}</span>
                      {statusBadge(msg.status)}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{preview}</p>
                    <span className="text-xs text-muted-foreground/70 mt-1 block">{date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
