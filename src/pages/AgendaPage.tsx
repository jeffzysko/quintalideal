import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/PageTransition';
import { PullToRefresh } from '@/components/PullToRefresh';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  startOfWeek, endOfWeek, addWeeks, format, isToday, isPast,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays, CalendarClock, ChevronLeft, ChevronRight, CheckCircle2,
  Phone, MessageCircle, Inbox, MapPin, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmptyState } from '@/components/ui/empty-state';

// Reuse from HojePage pattern
function parseFollowupType(note: string | null) {
  if (!note) return { type: null, text: '' };
  const match = note.match(/^\[(\w+)\]\s*/);
  if (match) return { type: match[1], text: note.slice(match[0].length) };
  return { type: null, text: note };
}

const FOLLOWUP_ICONS: Record<string, typeof Phone> = {
  ligacao: Phone, whatsapp: MessageCircle, email: Inbox, visita: MapPin, reuniao: Users,
};
const FOLLOWUP_COLORS: Record<string, string> = {
  ligacao: 'text-emerald-600', whatsapp: 'text-green-600', email: 'text-primary', visita: 'text-amber-600', reuniao: 'text-violet-600',
};

interface FollowupRow {
  id: string;
  lead_id: string;
  note: string | null;
  scheduled_at: string;
  completed: boolean;
  leads: { nome: string | null } | null;
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const { role, franchiseId, loading: authLoading } = useAuth();
  const isAdmin = role === 'super_admin';
  const basePath = isAdmin ? '/admin/lead' : '/painel/lead';
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [weekOffset, setWeekOffset] = useState(0);
  const currentMonday = useMemo(() => {
    const base = addWeeks(new Date(), weekOffset);
    return startOfWeek(base, { weekStartsOn: 0 });
  }, [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(currentMonday, { weekStartsOn: 0 }), [currentMonday]);
  const days = useMemo(() => eachDayOfInterval({ start: currentMonday, end: weekEnd }), [currentMonday, weekEnd]);

  const weekLabel = useMemo(() => {
    const s = format(currentMonday, "dd", { locale: ptBR });
    const e = format(weekEnd, "dd 'de' MMMM", { locale: ptBR });
    return `${s} a ${e}`;
  }, [currentMonday, weekEnd]);

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ['agenda-followups', franchiseId, isAdmin, weekOffset],
    queryFn: async () => {
      const from = currentMonday.toISOString();
      const to = weekEnd.toISOString();
      let query = supabase
        .from('lead_followups')
        .select('id, lead_id, note, scheduled_at, completed, leads(nome)')
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .order('scheduled_at', { ascending: true });
      if (!isAdmin && franchiseId) query = query.eq('franchise_id', franchiseId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FollowupRow[];
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  const pendingCount = followups.filter(f => !f.completed).length;

  const toggleFollowup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_followups').update({ completed: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-followups'] });
      queryClient.invalidateQueries({ queryKey: ['hoje-followups'] });
    },
  });

  const groupedByDay = useMemo(() => {
    const map = new Map<string, FollowupRow[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    followups.forEach(f => {
      const key = format(new Date(f.scheduled_at), 'yyyy-MM-dd');
      map.get(key)?.push(f);
    });
    return map;
  }, [followups, days]);

  const renderFollowupItem = (f: FollowupRow, compact = false) => {
    const parsed = parseFollowupType(f.note);
    const TypeIcon = parsed.type ? FOLLOWUP_ICONS[parsed.type] || CalendarClock : CalendarClock;
    const typeColor = parsed.type ? FOLLOWUP_COLORS[parsed.type] || 'text-muted-foreground' : 'text-muted-foreground';
    const date = new Date(f.scheduled_at);
    const overdue = isPast(date) && !isToday(date) && !f.completed;
    const today = isToday(date) && !f.completed;
    const leadName = f.leads?.nome || 'Lead sem nome';

    return (
      <motion.div
        key={f.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border p-2.5 transition-all hover:shadow-sm cursor-pointer',
          f.completed && 'opacity-50',
          overdue && 'border-destructive/30 bg-destructive/5',
          today && !overdue && 'border-primary/20 bg-primary/5',
          !overdue && !today && 'border-border/40 bg-card',
        )}
        onClick={() => navigate(`${basePath}/${f.lead_id}`)}
      >
        <motion.button
          whileTap={{ scale: 0.8 }}
          className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 hover:bg-muted/60 transition-colors"
          aria-label="Marcar como concluido"
          onClick={(e) => { e.stopPropagation(); toggleFollowup.mutate(f.id); }}
        >
          <CheckCircle2 className={cn('w-4 h-4 transition-colors', f.completed ? 'text-emerald-500' : 'text-muted-foreground/40 hover:text-emerald-500')} />
        </motion.button>

        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', overdue ? 'bg-destructive/10' : 'bg-primary/10')}>
          <TypeIcon className={cn('w-3.5 h-3.5', overdue ? 'text-destructive' : typeColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold text-foreground truncate', f.completed && 'line-through')}>{leadName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-[10px] font-medium', overdue ? 'text-destructive' : 'text-muted-foreground')}>
              {format(date, 'HH:mm')}
            </span>
            {overdue && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 rounded-full">Atrasado</Badge>}
            {today && !overdue && <Badge className="text-[9px] px-1 py-0 h-3.5 rounded-full bg-emerald-500/15 text-emerald-700 border-0">Hoje</Badge>}
          </div>
          {!compact && parsed.text && <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">{parsed.text}</p>}
        </div>
      </motion.div>
    );
  };

  const renderDesktopView = () => (
    <div className="grid grid-cols-7 gap-2 min-h-[400px]">
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const items = groupedByDay.get(key) || [];
        const today = isToday(day);
        return (
          <div key={key} className={cn('rounded-xl border p-2 min-h-[120px]', today ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-card/50')}>
            <div className={cn('text-center mb-2 pb-1.5 border-b', today ? 'border-primary/20' : 'border-border/30')}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
              <p className={cn('text-lg font-bold', today ? 'text-primary' : 'text-foreground')}>{format(day, 'dd')}</p>
            </div>
            <div className="space-y-1.5">
              {items.length === 0 && (
                <p className="text-[10px] text-muted-foreground/40 text-center pt-4">-</p>
              )}
              {items.map(f => renderFollowupItem(f, true))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const items = groupedByDay.get(key) || [];
        if (items.length === 0 && !isToday(day)) return null;
        const today = isToday(day);
        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2">
              <p className={cn('text-sm font-bold', today ? 'text-primary' : 'text-foreground')}>
                {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              {items.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">{items.length}</Badge>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 pl-1">Nenhum follow-up agendado</p>
            ) : (
              <div className="space-y-2">
                {items.map(f => renderFollowupItem(f))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const loading = authLoading || isLoading;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['agenda-followups'] });
  };

  return (
    <PageTransition>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-24 md:pb-12">
        <PageHeader
          title="Agenda"
          rightSlot={
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserAvatarMenu />
            </div>
          }
        />
        <div className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6">

        {/* Week navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-4 mb-6">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setWeekOffset(0)}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm font-semibold text-foreground capitalize">{weekLabel}</p>
          <Badge variant="secondary" className="text-xs ml-auto">
            {pendingCount} follow-up{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : followups.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Semana livre de agendamentos"
            description="Você não tem follow-ups programados para esta semana. Que tal agendar contatos com seus leads em negociação?"
            action={{ label: 'Ver leads', onClick: () => navigate('/franquia') }}
          />
        ) : isMobile ? renderMobileView() : renderDesktopView()}
      </div>
      </PullToRefresh>
    </PageTransition>
  );
}
