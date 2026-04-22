import { useMemo, useCallback, useState, useEffect } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SwipeableLeadCard } from '@/components/dashboard/SwipeableLeadCard';
import { SwipeHint } from '@/components/dashboard/SwipeHint';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isPast, differenceInDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, AlertTriangle, Phone, MessageCircle,
  ChevronRight, Clock, CheckCircle2,
  MapPin, Rocket, Inbox, Users, Sparkles,
  PhoneCall, FileText, Trophy,
} from 'lucide-react';
import { type LeadRow } from '@/lib/lead-constants';
import { cn } from '@/lib/utils';
import { toWhatsAppPhone } from '@/lib/phone-utils';

// ── Types ──
interface Followup {
  id: string;
  lead_id: string;
  note: string | null;
  scheduled_at: string;
  completed: boolean;
}

// ── Helpers ──
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

function formatScheduleLabel(dateStr: string): { label: string; urgency: 'overdue' | 'today' | 'tomorrow' | 'future' } {
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return { label: `Atrasado · ${formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}`, urgency: 'overdue' };
  if (isToday(date)) return { label: `Hoje às ${format(date, 'HH:mm')}`, urgency: 'today' };
  return { label: format(date, "dd/MM 'às' HH:mm", { locale: ptBR }), urgency: 'future' };
}

const URGENCY_STYLES = {
  overdue: 'border-destructive/30 bg-destructive/5',
  today: 'border-primary/20 bg-primary/5',
  tomorrow: 'border-border/50 bg-muted/30',
  future: 'border-border/30 bg-card',
};

// ── Progress Ring ──
function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((completed / total) * 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-[72px] h-[72px] shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none"
          stroke={pct === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{pct}%</span>
      </div>
    </div>
  );
}

// ── Loading skeleton ──
function PageSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-4">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
    </div>
  );
}

// ── Followup Row ──
function FollowupRow({
  f, index, leadName, basePath, onComplete, navigate,
}: {
  f: Followup; index: number; leadName: string; basePath: string;
  onComplete: (id: string) => void; navigate: (path: string) => void;
}) {
  const parsed = parseFollowupType(f.note);
  const TypeIcon = parsed.type ? FOLLOWUP_ICONS[parsed.type] || CalendarClock : CalendarClock;
  const typeColor = parsed.type ? FOLLOWUP_COLORS[parsed.type] || 'text-muted-foreground' : 'text-muted-foreground';
  const schedule = formatScheduleLabel(f.scheduled_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3), type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-2xl border backdrop-blur-sm cursor-pointer',
        'transition-all duration-200 hover:shadow-md active:scale-[0.97]',
        URGENCY_STYLES[schedule.urgency]
      )}
      onClick={() => navigate(`${basePath}/${f.lead_id}`)}
    >
      <motion.button
        whileTap={{ scale: 0.8 }}
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-muted/60 transition-colors"
        aria-label="Marcar como concluído"
        onClick={(e) => { e.stopPropagation(); onComplete(f.id); }}
      >
        <CheckCircle2 className="w-5 h-5 text-muted-foreground/40 hover:text-emerald-500 transition-colors" />
      </motion.button>

      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        schedule.urgency === 'overdue' ? 'bg-destructive/10' : 'bg-primary/10'
      )}>
        <TypeIcon className={cn('w-4.5 h-4.5', schedule.urgency === 'overdue' ? 'text-destructive' : typeColor)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate">{leadName}</p>
        <p className={cn('text-xs font-medium mt-1', schedule.urgency === 'overdue' ? 'text-destructive' : 'text-muted-foreground')}>
          {schedule.label}
        </p>
        {parsed.text && <p className="text-xs text-muted-foreground/60 truncate mt-1">{parsed.text}</p>}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
    </motion.div>
  );
}

// ── Lead Row ──
function LeadRow({
  lead, index, basePath, navigate, now, variant = 'stale',
}: {
  lead: LeadRow; index: number; basePath: string;
  navigate: (path: string) => void; now: Date; variant?: 'stale' | 'new';
}) {
  const daysWaiting = differenceInDays(now, new Date(lead.created_at));
  const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
  const waitLabel = daysWaiting > 0 ? `${daysWaiting}d` : `${hoursWaiting}h`;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) return;
    window.open(`https://wa.me/${toWhatsAppPhone(lead.telefone)}?text=${encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem?`)}`, '_blank');
  };
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) return;
    window.open(`tel:+55${lead.telefone.replace(/\D/g, '')}`, '_self');
  };

  const isNew = variant === 'new';
  const gradientFrom = isNew ? 'from-primary/15' : 'from-amber-500/15';
  const gradientTo = isNew ? 'to-primary/5' : 'to-amber-500/5';
  const initialColor = isNew ? 'text-primary' : 'text-amber-600';

  return (
    <SwipeableLeadCard leadPhone={lead.telefone} leadName={lead.nome}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.25), type: 'spring', stiffness: 300, damping: 30 }}
        className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-muted/30 transition-all duration-200 active:scale-[0.97]"
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', gradientFrom, gradientTo)}>
          <span className={cn('text-sm font-bold', initialColor)}>
            {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
          {isNew ? (
            <p className="text-xs text-primary font-medium mt-0.5">✨ Novo · {waitLabel}</p>
          ) : (
            <p className="text-xs text-amber-600 font-semibold mt-0.5">⏱ {waitLabel} sem contato</p>
          )}
        </div>
        {lead.telefone && (
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.div whileTap={{ scale: 0.85 }}>
              <Button size="icon" variant="ghost" className="h-11 w-11 rounded-xl" onClick={handleWhatsApp} aria-label="WhatsApp">
                <MessageCircle className="w-4 h-4 text-green-600" />
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.85 }}>
              <Button size="icon" variant="ghost" className="h-11 w-11 rounded-xl" onClick={handleCall} aria-label="Ligar">
                <Phone className="w-4 h-4 text-emerald-600" />
              </Button>
            </motion.div>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
      </motion.div>
    </SwipeableLeadCard>
  );
}

// ── Hero Greeting ──
function HeroGreeting({
  name, totalTasks, completedFollowupsToday, totalFollowupsToday, overdueCount, newTodayCount,
}: {
  name: string | null; totalTasks: number;
  completedFollowupsToday: number; totalFollowupsToday: number;
  overdueCount: number; newTodayCount: number;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = name?.split(' ')[0] || '';

  const pct = totalFollowupsToday === 0 ? 100 : Math.round((completedFollowupsToday / totalFollowupsToday) * 100);
  const progressTone = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-destructive';

  let subtitle = 'Tudo em dia por hoje. Continue assim! 🎯';
  if (overdueCount > 0) {
    subtitle = `Você tem ${overdueCount} follow-up${overdueCount > 1 ? 's' : ''} atrasado${overdueCount > 1 ? 's' : ''}. Vamos resolver?`;
  } else if (newTodayCount > 0) {
    subtitle = `${newTodayCount} novo${newTodayCount > 1 ? 's' : ''} lead${newTodayCount > 1 ? 's' : ''} chegaram hoje.`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-5 mb-6"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center gap-4 mb-4">
        <ProgressRing completed={completedFollowupsToday} total={totalFollowupsToday} />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="text-xs text-foreground/80 mt-2 font-medium">{subtitle}</p>
        </div>
      </div>

      {totalFollowupsToday > 0 && (
        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progresso do dia</span>
            <span className="text-xs font-bold text-foreground">
              {completedFollowupsToday} de {totalFollowupsToday} follow-ups
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', progressTone)}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </div>
      )}

      {totalTasks === 0 && totalFollowupsToday === 0 && (
        <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Tudo em dia!
        </p>
      )}
    </motion.div>
  );
}

// ── Section Header ──
function SectionHeader({ icon: Icon, title, count, variant = 'default', delay = 0 }: {
  icon: typeof AlertTriangle; title: string; count?: number;
  variant?: 'default' | 'danger' | 'warning'; delay?: number;
}) {
  const bgMap = { default: 'bg-primary/10', danger: 'bg-destructive/10', warning: 'bg-amber-500/10' };
  const colorMap = { default: 'text-primary', danger: 'text-destructive', warning: 'text-amber-600' };
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 30 }}
      className="flex items-center gap-2.5 mb-4"
    >
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', bgMap[variant])}>
        <Icon className={cn('w-4 h-4', colorMap[variant])} />
      </div>
      <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
      {count !== undefined && count > 0 && (
        <Badge variant={variant === 'danger' ? 'destructive' : 'secondary'} className="text-xs font-bold px-1.5 py-0 rounded-full">
          {count}
        </Badge>
      )}
    </motion.div>
  );
}

// ── Main Page ──
export default function HojePage() {
  const navigate = useNavigate();
  const { user, role, franchiseId, loading: authLoading } = useAuth();
  const isAdmin = role === 'super_admin';
  const basePath = isAdmin ? '/admin/lead' : '/painel/lead';
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: leads = [], isLoading: loadingLeads, isError: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ['hoje-leads', franchiseId, isAdmin],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, lead_origin')
        .in('status_lead', ['novo', 'contatado', 'em_negociacao'])
        .order('created_at', { ascending: false });
      if (!isAdmin && franchiseId) query = query.eq('franquia_id', franchiseId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LeadRow[];
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  const { data: followups = [], isLoading: loadingFollowups } = useQuery({
    queryKey: ['hoje-followups', franchiseId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('lead_followups')
        .select('id, lead_id, note, scheduled_at, completed')
        .eq('completed', false)
        .order('scheduled_at', { ascending: true })
        .limit(50);
      if (!isAdmin && franchiseId) query = query.eq('franchise_id', franchiseId);
      const { data } = await query;
      return (data || []) as Followup[];
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  // Completed follow-ups for today (for progress bar)
  const { data: todayCompletedFollowups = 0 } = useQuery({
    queryKey: ['hoje-completed-followups', franchiseId, isAdmin],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      let q = supabase
        .from('lead_followups')
        .select('id', { count: 'exact', head: true })
        .eq('completed', true)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString());
      if (!isAdmin && franchiseId) q = q.eq('franchise_id', franchiseId);
      const { count } = await q;
      return count || 0;
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  // Open proposals & closed-this-month (for stat cards)
  const { data: metrics } = useQuery({
    queryKey: ['hoje-metrics', franchiseId, isAdmin],
    queryFn: async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      let propQ = supabase.from('proposals').select('id', { count: 'exact', head: true }).in('status', ['enviada', 'em_negociacao']);
      let soldQ = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status_lead', 'vendido').gte('updated_at', monthStart.toISOString());
      if (!isAdmin && franchiseId) {
        propQ = propQ.eq('franchise_id', franchiseId);
        soldQ = soldQ.eq('franquia_id', franchiseId);
      }
      const [{ count: openProposals }, { count: closedThisMonth }] = await Promise.all([propQ, soldQ]);
      return { openProposals: openProposals || 0, closedThisMonth: closedThisMonth || 0 };
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  const leadNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    leads.forEach(l => { if (l.nome) map[l.id] = l.nome; });
    return map;
  }, [leads]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);
  const nowMs = now.getTime();

  const overdueFollowups = useMemo(() =>
    followups.filter(f => isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at))),
    [followups]);
  const todayFollowups = useMemo(() =>
    followups.filter(f => isToday(new Date(f.scheduled_at))),
    [followups]);
  const staleLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) > 48 * 60 * 60 * 1000),
    [leads, nowMs]);
  const newLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) < 48 * 60 * 60 * 1000),
    [leads, nowMs]);

  const isLoading = authLoading || loadingLeads || loadingFollowups;
  const totalTasks = overdueFollowups.length + todayFollowups.length + staleLeads.length + newLeads.length;

  const toggleFollowup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_followups').update({ completed: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hoje-followups'] }),
  });

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hoje-leads'] }),
      queryClient.invalidateQueries({ queryKey: ['hoje-followups'] }),
    ]);
  }, [queryClient]);

  // Section delay offsets for staggered entrance
  let sectionDelay = 0.15;
  const nextDelay = () => { sectionDelay += 0.1; return sectionDelay; };

  return (
    <PageTransition>
      <PullToRefresh onRefresh={handlePullRefresh}>
        <div className="min-h-screen bg-background pb-[var(--bottom-nav-height)] md:pb-12">
          <PageHeader
            title="Hoje"
            rightSlot={
              <div className="flex items-center gap-1">
                <NotificationBell />
                <UserAvatarMenu />
              </div>
            }
          />

          <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
            <Breadcrumbs className="md:hidden" items={[
              { label: isAdmin ? 'Admin' : 'Painel', href: isAdmin ? '/admin' : '/franquia' },
              { label: 'Hoje' },
            ]} />

            {isLoading ? <PageSkeleton /> : (
              <AnimatePresence mode="wait">
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {leadsError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4"
                    >
                      <p className="font-medium">Erro ao carregar dados.</p>
                      <button type="button" onClick={() => refetchLeads()} className="shrink-0 underline underline-offset-2 hover:no-underline font-semibold">
                        Tentar novamente
                      </button>
                    </motion.div>
                  )}

                  <HeroGreeting
                    name={profile?.full_name || null}
                    totalTasks={totalTasks}
                    completedFollowupsToday={todayCompletedFollowups}
                    totalFollowupsToday={todayFollowups.length + todayCompletedFollowups}
                    overdueCount={overdueFollowups.length}
                    newTodayCount={newLeads.length}
                  />

                  {/* ── Quick metrics row ── */}
                  <div className="relative -mx-4 sm:mx-0 mb-6">
                    <div className="flex gap-3 overflow-x-auto pb-2 px-4 sm:px-0 sm:grid sm:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                      <div className="min-w-[160px] sm:min-w-0">
                        <StatCard title="Novos hoje" value={newLeads.length} icon={Inbox} onClick={() => navigate(isAdmin ? '/admin?tab=leads' : '/franquia?tab=funnel')} />
                      </div>
                      <div className="min-w-[160px] sm:min-w-0">
                        <StatCard title="Para contatar" value={staleLeads.length} icon={PhoneCall} iconColor="text-amber-600" onClick={() => navigate('/franquia?tab=funnel')} />
                      </div>
                      <div className="min-w-[160px] sm:min-w-0">
                        <StatCard title="Propostas abertas" value={metrics?.openProposals ?? 0} icon={FileText} iconColor="text-violet-600" onClick={() => navigate('/propostas')} />
                      </div>
                      <div className="min-w-[160px] sm:min-w-0">
                        <StatCard title="Fechados no mês" value={metrics?.closedThisMonth ?? 0} icon={Trophy} iconColor="text-emerald-600" onClick={() => navigate('/relatorio-crm')} />
                      </div>
                    </div>
                    {/* Fade indicator (mobile only) */}
                    <div className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
                  </div>

                  {/* ── Urgent now ── */}
                  {(overdueFollowups.length > 0 || staleLeads.filter(l => differenceInDays(now, new Date(l.created_at)) > 5).length > 0) && (() => {
                    const veryStale = staleLeads.filter(l => differenceInDays(now, new Date(l.created_at)) > 5);
                    const urgentItems: Array<{ id: string; label: string; sub: string; onClick: () => void }> = [
                      ...overdueFollowups.map(f => ({
                        id: `f-${f.id}`,
                        label: leadNameMap[f.lead_id] || 'Lead',
                        sub: `Follow-up ${formatDistanceToNow(new Date(f.scheduled_at), { locale: ptBR, addSuffix: true })}`,
                        onClick: () => navigate(`${basePath}/${f.lead_id}`),
                      })),
                      ...veryStale.map(l => ({
                        id: `l-${l.id}`,
                        label: l.nome || 'Lead sem nome',
                        sub: `${differenceInDays(now, new Date(l.created_at))} dias sem contato`,
                        onClick: () => navigate(`${basePath}/${l.id}`),
                      })),
                    ];
                    return (
                      <div className="rounded-2xl border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Urgente agora · {urgentItems.length} item{urgentItems.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {urgentItems.slice(0, 2).map(item => (
                            <button
                              key={item.id}
                              onClick={item.onClick}
                              className="w-full text-left flex items-center justify-between gap-2 rounded-xl bg-background/60 hover:bg-background px-3 py-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                            </button>
                          ))}
                        </div>
                        {urgentItems.length > 2 && (
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium">
                            +{urgentItems.length - 2} outro{urgentItems.length - 2 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-10 sm:space-y-12">
                    {/* ── 1. Overdue follow-ups ── */}
                    {overdueFollowups.length > 0 && (
                      <div>
                        <SectionHeader icon={AlertTriangle} title="Atrasados" count={overdueFollowups.length} variant="danger" delay={nextDelay()} />
                        <div className="space-y-2">
                          {overdueFollowups.map((f, i) => (
                            <FollowupRow key={f.id} f={f} index={i} leadName={leadNameMap[f.lead_id] || 'Lead'} basePath={basePath} onComplete={(id) => toggleFollowup.mutate(id)} navigate={navigate} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── 2. Today follow-ups ── */}
                    <div>
                      <SectionHeader icon={CalendarClock} title="Follow-ups de hoje" count={todayFollowups.length} delay={nextDelay()} />
                      {todayFollowups.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          <Card className="border-dashed rounded-2xl">
                            <CardContent className="flex items-center gap-3 py-4 px-4">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              </div>
                              <p className="text-sm text-muted-foreground">Nenhum follow-up para hoje</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ) : (
                        <div className="space-y-2">
                          {todayFollowups.map((f, i) => (
                            <FollowupRow key={f.id} f={f} index={i} leadName={leadNameMap[f.lead_id] || 'Lead'} basePath={basePath} onComplete={(id) => toggleFollowup.mutate(id)} navigate={navigate} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── 3. Stale leads ── */}
                    {staleLeads.length > 0 && (
                      <div>
                        <SectionHeader icon={Clock} title="Sem contato" count={staleLeads.length} variant="warning" delay={nextDelay()} />
                        <Card className="overflow-hidden rounded-2xl border-amber-200/30">
                          <CardContent className="p-0 divide-y divide-border/20">
                            {staleLeads.slice(0, 8).map((lead, i) => (
                              <div key={lead.id} className="relative">
                                {i === 0 && <SwipeHint />}
                                <LeadRow lead={lead} index={i} basePath={basePath} navigate={navigate} now={now} variant="stale" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                        {staleLeads.length > 8 && (
                          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground gap-1 rounded-xl" onClick={() => navigate(isAdmin ? '/admin?tab=leads' : '/franquia')}>
                            Ver todos ({staleLeads.length})
                          </Button>
                        )}
                      </div>
                    )}

                    {/* ── 4. New leads ── */}
                    {newLeads.length > 0 && (
                      <div>
                        <SectionHeader icon={Rocket} title="Novos leads" count={newLeads.length} delay={nextDelay()} />
                        <Card className="overflow-hidden rounded-2xl">
                          <CardContent className="p-0 divide-y divide-border/20">
                            {newLeads.slice(0, 5).map((lead, i) => (
                              <LeadRow key={lead.id} lead={lead} index={i} basePath={basePath} navigate={navigate} now={now} variant="new" />
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>

                  {/* ── Empty state ── */}
                  {totalTasks === 0 && todayFollowups.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                    >
                      <Card className="border-dashed rounded-2xl">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="text-4xl mb-3">🎉</div>
                          <p className="text-base font-semibold text-foreground">Agenda limpa por hoje!</p>
                          <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Que tal entrar em contato com alguns leads em negociação?
                          </p>
                          <Button variant="outline" size="sm" onClick={() => navigate(isAdmin ? '/admin?tab=leads' : '/franquia')}>
                            Ver leads
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}
