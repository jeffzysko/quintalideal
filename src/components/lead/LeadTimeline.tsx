import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, Send, Clock, FileText, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
};

const QUICK_TYPES = ['note', 'call', 'whatsapp'] as const;

interface LeadTimelineProps {
  leadId: string;
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
          {activities.length > 0 && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground font-medium">
              {activities.length}
            </span>
          )}
        </div>

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
                      transition={{ delay: i * 0.03 }}
                      className="relative mb-3 last:mb-0"
                    >
                      <div className={`absolute -left-5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex items-center justify-center ${config.dotColor}`}>
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
