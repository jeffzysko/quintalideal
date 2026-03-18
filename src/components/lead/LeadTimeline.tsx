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

  const addActivity = useCallback(async () => {
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
    loadActivities();
    // Re-focus the textarea for rapid note-taking
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [newContent, newType, user, leadId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      addActivity();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const placeholder = newType === 'note'
    ? 'Adicionar uma nota rápida…'
    : newType === 'call'
    ? 'Resumo da ligação…'
    : 'Resumo da conversa no WhatsApp…';

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

        {/* Always-visible inline note input */}
        <div className="mb-4 rounded-xl border border-border/50 bg-muted/30 overflow-hidden focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Type quick-select tabs */}
          <div className="flex items-center gap-0.5 px-2 pt-2 pb-1">
            {QUICK_TYPES.map((type) => {
              const cfg = ACTIVITY_TYPES[type];
              const Icon = cfg.icon;
              const active = newType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setNewType(type);
                    textareaRef.current?.focus();
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                    active
                      ? `${cfg.color} bg-background shadow-sm border border-border/50`
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            maxLength={500}
            className="w-full bg-transparent border-0 px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground/60 focus:outline-none resize-none"
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[10px] text-muted-foreground/50">
              {newContent.length > 0 ? `${newContent.length}/500 · ⌘↵ para enviar` : '⌘↵ para enviar'}
            </span>
            <Button
              size="sm"
              onClick={addActivity}
              disabled={sending || !newContent.trim()}
              className="h-7 text-xs gap-1 px-3"
            >
              {sending ? (
                <div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Registrar
            </Button>
          </div>
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
