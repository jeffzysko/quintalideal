import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, Send, Clock, FileText, ArrowRightLeft, Plus } from 'lucide-react';
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

const ACTIVITY_TYPES: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  note: { label: 'Nota', icon: FileText, color: 'text-primary' },
  call: { label: 'Ligação', icon: Phone, color: 'text-emerald-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  status_change: { label: 'Mudança de status', icon: ArrowRightLeft, color: 'text-amber-600' },
};

interface LeadTimelineProps {
  leadId: string;
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('note');
  const [newContent, setNewContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [leadId]);

  const loadActivities = async () => {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setActivities(data as Activity[]);
    setLoading(false);
  };

  const addActivity = async () => {
    if (!newContent.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: leadId,
      user_id: user.id,
      activity_type: newType,
      content: newContent.trim(),
    });
    setSending(false);
    if (error) {
      toast.error('Erro ao registrar atividade.');
      return;
    }
    toast.success('Atividade registrada!');
    setNewContent('');
    setShowForm(false);
    loadActivities();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Timeline de Follow-up</h2>
            {activities.length > 0 && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">
                {activities.length}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant={showForm ? 'secondary' : 'default'}
            className="h-7 text-xs gap-1"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-3 h-3" /> {showForm ? 'Cancelar' : 'Registrar'}
          </Button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 mb-4 p-3 rounded-xl bg-muted/40 border border-border/30">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="bg-background h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPES)
                      .filter(([k]) => k !== 'status_change')
                      .map(([val, cfg]) => (
                        <SelectItem key={val} value={val}>
                          <span className="flex items-center gap-1.5">
                            <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Descreva a interação..."
                  rows={2}
                  maxLength={500}
                  className="bg-background resize-none text-sm"
                />
                <Button
                  size="sm"
                  onClick={addActivity}
                  disabled={sending || !newContent.trim()}
                  className="w-full gap-1.5 h-8 text-xs"
                >
                  {sending ? (
                    <div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Registrar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma atividade registrada ainda.
          </p>
        ) : (
          <ScrollArea className={activities.length > 5 ? 'h-[320px]' : ''}>
            <div className="relative pl-5">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

              {activities.map((act, i) => {
                const config = ACTIVITY_TYPES[act.activity_type] || ACTIVITY_TYPES.note;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative mb-3 last:mb-0"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center ${
                      act.activity_type === 'status_change' ? 'bg-amber-500' :
                      act.activity_type === 'call' ? 'bg-emerald-500' :
                      act.activity_type === 'whatsapp' ? 'bg-green-500' :
                      'bg-primary'
                    }`}>
                      <Icon className="w-2 h-2 text-white" />
                    </div>

                    <div className="bg-muted/30 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(act.created_at)}</span>
                      </div>
                      {act.content && (
                        <p className="text-xs text-foreground leading-relaxed">{act.content}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
