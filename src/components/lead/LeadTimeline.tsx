import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Clock, FileText, ArrowRightLeft, MessageCircle, Thermometer, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Activity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTIVITY_TYPES: Record<string, { label: string; icon: typeof Phone; color: string; dotColor: string }> = {
  note: { label: 'Nota', icon: FileText, color: 'text-primary', dotColor: 'bg-primary' },
  call: { label: 'Ligação', icon: Phone, color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', dotColor: 'bg-green-500' },
  status_change: { label: 'Status', icon: ArrowRightLeft, color: 'text-amber-600', dotColor: 'bg-amber-500' },
  temperature_change: { label: 'Temperatura', icon: Thermometer, color: 'text-orange-600', dotColor: 'bg-orange-500' },
};

const ADD_TYPES = [
  { value: 'note', label: '📝 Nota' },
  { value: 'call', label: '📞 Ligação' },
  { value: 'whatsapp', label: '💬 WhatsApp' },
];

interface LeadTimelineProps {
  leadId: string;
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('note');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [leadId]);

  const loadActivities = async () => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(150);
    if (data) setActivities(data as Activity[]);
    setLoading(false);
  };

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
      await loadActivities();
    }
    setSaving(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Histórico</h2>
          {activities.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">
              {activities.length}
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

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">
              Nenhuma atividade registrada. Adicione uma nota acima!
            </p>
          </div>
        ) : (
          <ScrollArea className={activities.length > 5 ? 'h-[320px]' : ''}>
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

              <AnimatePresence initial={false}>
                {activities.map((act, i) => {
                  const config = ACTIVITY_TYPES[act.activity_type] || ACTIVITY_TYPES.note;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.15) }}
                      className="relative mb-3 last:mb-0"
                    >
                      <div className={`absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center ${config.dotColor}`}>
                        <Icon className="w-2 h-2 text-white" />
                      </div>

                      <div className="bg-muted/30 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(act.created_at)}</span>
                        </div>
                        {act.content && (
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{act.content}</p>
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