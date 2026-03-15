import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Check, Plus, Trash2, Phone, MessageCircle, Mail, Users, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const FOLLOWUP_TYPES = [
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'text-emerald-600' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'text-primary' },
  { value: 'visita', label: 'Visita presencial', icon: MapPin, color: 'text-amber-600' },
  { value: 'reuniao', label: 'Reunião online', icon: Users, color: 'text-violet-600' },
] as const;

type FollowupType = typeof FOLLOWUP_TYPES[number]['value'];

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
  const [date, setDate] = useState('');
  const [followupType, setFollowupType] = useState<FollowupType>('ligacao');

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
  });

  const addFollowup = useMutation({
    mutationFn: async () => {
      if (!leadId || !date || !userId) return;
      const fullNote = `[${followupType}] ${note}`.trim();
      const { error } = await supabase.from('lead_followups' as any).insert({
        lead_id: leadId,
        franchise_id: franchiseId,
        user_id: userId,
        scheduled_at: new Date(date).toISOString(),
        note: fullNote,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      setShowForm(false);
      setNote('');
      setDate('');
      setFollowupType('ligacao');
      toast.success('Follow-up agendado!');
    },
    onError: () => toast.error('Erro ao agendar follow-up'),
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await supabase.from('lead_followups' as any).update({ completed }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followups'] }),
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

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            {leadId ? 'Follow-ups' : 'Próximos Follow-ups'}
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{overdueCount} atrasado{overdueCount > 1 ? 's' : ''}</Badge>
            )}
          </CardTitle>
          {leadId && (
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3 h-3" /> Agendar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {showForm && leadId && (
          <div className="flex flex-col gap-2.5 p-3 bg-muted/40 rounded-xl mb-2 border border-border/30">
            <Select value={followupType} onValueChange={(v) => setFollowupType(v as FollowupType)}>
              <SelectTrigger className="bg-background h-9 text-sm">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWUP_TYPES.map(ft => {
                  const Icon = ft.icon;
                  return (
                    <SelectItem key={ft.value} value={ft.value}>
                      <span className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${ft.color}`} />
                        {ft.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-sm h-9"
              min={new Date().toISOString().slice(0, 16)}
            />
            <Input
              placeholder={`Ex: Ligar para ${leadName || 'o lead'} sobre orçamento`}
              value={note}
              onChange={e => setNote(e.target.value)}
              className="text-sm h-9"
              maxLength={200}
            />
            <Button size="sm" onClick={() => addFollowup.mutate()} disabled={!date || addFollowup.isPending} className="text-xs gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Agendar Follow-up
            </Button>
          </div>
        )}

        {pendingFollowups.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground py-3 text-center">Nenhum follow-up pendente</p>
        )}

        {followups.map(f => {
          const isOverdue = !f.completed && new Date(f.scheduled_at) < now;
          const parsed = parseFollowupType(f.note);
          const typeConfig = FOLLOWUP_TYPES.find(ft => ft.value === parsed.type);
          const TypeIcon = typeConfig?.icon;

          return (
            <div key={f.id} className={`flex items-start gap-2 p-2.5 rounded-xl transition-colors ${f.completed ? 'bg-muted/20 opacity-60' : isOverdue ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/40'}`}>
              <button
                onClick={() => toggleComplete.mutate({ id: f.id, completed: !f.completed })}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${f.completed ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/30 hover:border-primary'}`}
              >
                {f.completed && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                {!leadId && f.lead?.nome && (
                  <p className="text-xs font-semibold text-foreground truncate">{f.lead.nome}</p>
                )}
                <div className="flex items-center gap-1.5 mb-0.5">
                  {TypeIcon && (
                    <span className="flex items-center gap-1">
                      <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${typeConfig.color}`}>{typeConfig.label}</span>
                    </span>
                  )}
                </div>
                <p className={`text-xs ${f.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {parsed.text || 'Follow-up agendado'}
                </p>
                <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {isOverdue ? '⚠️ ' : '📅 '}
                  {new Date(f.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => deleteFollowup.mutate(f.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
