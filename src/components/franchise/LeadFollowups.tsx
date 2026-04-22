import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarClock, Check, Plus, Trash2, Phone, MessageCircle, Mail, Users, MapPin, MoreHorizontal, CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const FOLLOWUP_TYPES = [
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-500/10' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'text-primary', bg: 'bg-primary/10' },
  { value: 'visita', label: 'Visita presencial', icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  { value: 'reuniao', label: 'Reunião online', icon: Users, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  { value: 'outro', label: 'Outro', icon: MoreHorizontal, color: 'text-muted-foreground', bg: 'bg-muted' },
] as const;

type FollowupType = typeof FOLLOWUP_TYPES[number]['value'];

const QUICK_HOURS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

interface Followup {
  id: string;
  lead_id: string;
  note: string | null;
  scheduled_at: string;
  completed: boolean;
  lead?: { nome: string | null } | null;
}

interface LeadFollowupsProps {
  franchiseId: string;
  leadId?: string;
  leadName?: string;
}

function parseFollowupType(note: string | null): { type: FollowupType | null; text: string } {
  if (!note) return { type: null, text: '' };
  const match = note.match(/^\[(\w+)\]\s*/);
  if (match) {
    const t = match[1] as FollowupType;
    if (FOLLOWUP_TYPES.some(ft => ft.value === t)) {
      return { type: t, text: note.slice(match[0].length) };
    }
  }
  return { type: null, text: note };
}

export function LeadFollowups({ franchiseId, leadId, leadName }: LeadFollowupsProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [followupType, setFollowupType] = useState<FollowupType>('ligacao');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: followups = [] } = useQuery({
    queryKey: ['followups', franchiseId, leadId],
    queryFn: async () => {
      let query = supabase
        .from('lead_followups' as any)
        .select('id, lead_id, note, scheduled_at, completed')
        .eq('franchise_id', franchiseId)
        .order('scheduled_at', { ascending: true });

      if (leadId) query = query.eq('lead_id', leadId);
      else query = query.eq('completed', false);

      const { data } = await query.limit(20);
      const rows = (data || []) as unknown as Followup[];

      if (!leadId && rows.length > 0) {
        const leadIds = [...new Set(rows.map(f => f.lead_id))];
        const { data: leads } = await supabase.from('leads').select('id, nome').in('id', leadIds);
        const nameMap: Record<string, string | null> = {};
        (leads || []).forEach((l: any) => { nameMap[l.id] = l.nome; });
        return rows.map(f => ({ ...f, lead: { nome: nameMap[f.lead_id] || null } }));
      }

      return rows;
    },
    enabled: !!franchiseId,
    staleTime: 60 * 1000,
  });

  const buildScheduledDate = (): Date | null => {
    if (!selectedDate) return null;
    const [h, m] = selectedTime.split(':').map(Number);
    const d = new Date(selectedDate);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const addFollowup = useMutation({
    mutationFn: async () => {
      const scheduledAt = buildScheduledDate();
      if (!leadId || !scheduledAt || !userId) return;
      const fullNote = `[${followupType}] ${note}`.trim();
      const { error } = await supabase.from('lead_followups' as any).insert({
        lead_id: leadId,
        franchise_id: franchiseId,
        user_id: userId,
        scheduled_at: scheduledAt.toISOString(),
        note: fullNote,
      });
      if (error) throw error;

      // Create notification for the franchise
      const typeConfig = FOLLOWUP_TYPES.find(ft => ft.value === followupType);
      const dateStr = format(scheduledAt, "dd/MM 'às' HH:mm", { locale: ptBR });
      await supabase.from('notifications').insert({
        franchise_id: franchiseId,
        title: `📅 Follow-up agendado`,
        message: `${typeConfig?.label || 'Ação'} com ${leadName || 'lead'} em ${dateStr}${note ? ': ' + note : ''}`,
        type: 'followup',
        metadata: { lead_id: leadId, scheduled_at: scheduledAt.toISOString(), followup_type: followupType },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowForm(false);
      setNote('');
      setSelectedDate(undefined);
      setSelectedTime('09:00');
      setFollowupType('ligacao');
      toast.success('Follow-up agendado com sucesso! 🎯');
    },
    onError: () => toast.error('Erro ao agendar follow-up'),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await supabase.from('lead_followups' as any).update({ completed }).eq('id', id);
    },
    onSuccess: (_, { completed }) => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success(completed ? 'Concluído ✓' : 'Reaberto');
    },
  });

  const deleteFollowup = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('lead_followups' as any).delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up removido');
    },
  });

  const now = new Date();
  const pendingFollowups = followups.filter(f => !f.completed);
  const overdueCount = pendingFollowups.filter(f => new Date(f.scheduled_at) < now).length;
  const canSubmit = !!selectedDate && !!selectedTime;

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg icon-bg-blue flex items-center justify-center">
              <CalendarClock className="w-3.5 h-3.5 text-primary" />
            </div>
            {leadId ? 'Follow-ups' : 'Próximos Follow-ups'}
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 animate-pulse">{overdueCount} atrasado{overdueCount > 1 ? 's' : ''}</Badge>
            )}
          </CardTitle>
          {leadId && (
            <Button
              size="sm"
              variant={showForm ? 'secondary' : 'default'}
              className="h-8 gap-1.5 text-xs rounded-lg"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-3.5 h-3.5" />
              {showForm ? 'Cancelar' : 'Agendar'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence>
          {showForm && leadId && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-3 p-4 bg-gradient-to-b from-primary/5 to-muted/30 rounded-xl mb-3 border border-primary/10">
                {/* Type selector as icon grid */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Tipo de ação</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FOLLOWUP_TYPES.map(ft => {
                      const Icon = ft.icon;
                      const isSelected = followupType === ft.value;
                      return (
                        <button
                          key={ft.value}
                          type="button"
                          onClick={() => setFollowupType(ft.value)}
                          className={cn(
                            'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 transition-all duration-200 text-center',
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm scale-[1.02]'
                              : 'border-transparent bg-card hover:bg-muted/60 hover:border-border'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                            isSelected ? 'bg-primary/20' : ft.bg
                          )}>
                            <Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : ft.color)} />
                          </div>
                          <span className={cn(
                            'text-xs font-semibold leading-tight',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}>
                            {ft.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date picker */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Quando</label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-10 rounded-xl bg-card border-border/60',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {selectedDate ? (
                          <span className="font-medium">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        locale={ptBR}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time selector */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Horário</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_HOURS.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedTime(h)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border',
                          selectedTime === h
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                            : 'bg-card text-foreground border-border/60 hover:bg-muted hover:border-primary/30'
                        )}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="text-sm h-8 w-28 rounded-lg bg-card"
                    />
                    <span className="text-xs text-muted-foreground">ou digite o horário</span>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Descrição (opcional)</label>
                  <Input
                    placeholder={`Ex: Apresentar orçamento para ${leadName || 'o lead'}`}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="text-sm h-10 rounded-xl bg-card"
                    maxLength={200}
                  />
                </div>

                {/* Summary + Submit */}
                {canSubmit && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/15"
                  >
                    {(() => {
                      const ft = FOLLOWUP_TYPES.find(t => t.value === followupType)!;
                      const Icon = ft.icon;
                      return <Icon className={`w-4 h-4 ${ft.color} shrink-0`} />;
                    })()}
                    <p className="text-xs text-foreground flex-1">
                      <span className="font-semibold">{FOLLOWUP_TYPES.find(t => t.value === followupType)?.label}</span>
                      {selectedDate && <> em <span className="font-semibold">{format(selectedDate, "dd/MM", { locale: ptBR })}</span></>}
                      {' às '}
                      <span className="font-semibold">{selectedTime}</span>
                    </p>
                  </motion.div>
                )}

                <Button
                  onClick={() => addFollowup.mutate()}
                  disabled={!canSubmit || addFollowup.isPending}
                  className="w-full gap-2 h-10 rounded-xl text-sm font-semibold"
                >
                  {addFollowup.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  ) : (
                    <CalendarClock className="w-4 h-4" />
                  )}
                  Agendar Follow-up
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingFollowups.length === 0 && !showForm && (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Nenhum follow-up pendente</p>
            <p className="text-xs text-muted-foreground/60">Agende o próximo contato para manter o engajamento</p>
            {leadId && (
              <Button size="sm" variant="outline" className="mt-1 h-7 text-xs rounded-lg gap-1.5" onClick={() => setShowForm(true)}>
                <Plus className="w-3 h-3" />
                Agendar follow-up
              </Button>
            )}
          </div>
        )}

        {followups.map((f, i) => {
          const isOverdue = !f.completed && new Date(f.scheduled_at) < now;
          const parsed = parseFollowupType(f.note);
          const typeConfig = FOLLOWUP_TYPES.find(ft => ft.value === parsed.type);
          const TypeIcon = typeConfig?.icon;

          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.15) }}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl transition-all duration-200',
                f.completed
                  ? 'bg-muted/20 opacity-60'
                  : isOverdue
                    ? 'bg-destructive/5 border border-destructive/20 shadow-sm'
                    : 'bg-muted/40 hover:bg-muted/60'
              )}
            >
              <button
                onClick={() => toggleComplete.mutate({ id: f.id, completed: !f.completed })}
                aria-label={f.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200',
                  f.completed
                    ? 'bg-emerald-500 border-emerald-500 scale-110'
                    : 'border-muted-foreground/30 hover:border-primary hover:scale-110'
                )}
              >
                {f.completed && <Check className="w-3 h-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                {!leadId && f.lead?.nome && (
                  <p className="text-xs font-semibold text-foreground truncate mb-0.5">{f.lead.nome}</p>
                )}
                {TypeIcon && typeConfig && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', typeConfig.bg)}>
                      <TypeIcon className={cn('w-3 h-3', typeConfig.color)} />
                    </div>
                    <span className={cn('text-xs font-bold uppercase tracking-wider', typeConfig.color)}>{typeConfig.label}</span>
                  </div>
                )}
                <p className={cn('text-xs leading-relaxed', f.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {parsed.text || 'Follow-up agendado'}
                </p>
                <p className={cn('text-xs mt-1 flex items-center gap-1', isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                  {isOverdue ? '⚠️' : '📅'}
                  {new Date(f.scheduled_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <button
                onClick={() => setDeleteId(f.id)}
                aria-label="Excluir follow-up"
                className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O follow-up será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteFollowup.mutate(deleteId!); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
