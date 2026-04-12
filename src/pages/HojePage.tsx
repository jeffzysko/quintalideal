import { useMemo, useState, useCallback } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SwipeableLeadCard } from '@/components/dashboard/SwipeableLeadCard';
import { SwipeHint } from '@/components/dashboard/SwipeHint';
import { BackButton } from '@/components/BackButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, differenceInHours, differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, AlertTriangle, Phone, MessageCircle,
  ChevronRight, Clock, Flame, Zap, CheckCircle2, Users,
  TrendingUp, ArrowRight, Target, MapPin, Rocket, Inbox,
  ListChecks, BarChart3, Lightbulb,
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, type LeadRow } from '@/lib/lead-constants';
import { classifyLead } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';
import { SmartSuggestions } from '@/components/dashboard/SmartSuggestions';
import { QuickActionBar } from '@/components/dashboard/QuickActionBar';
import { PipelineSnapshot } from '@/components/dashboard/PipelineSnapshot';

// ── Types ──
interface Followup {
  id: string;
  lead_id: string;
  note: string | null;
  scheduled_at: string;
  completed: boolean;
}

interface LeadActivity {
  lead_id: string;
  activity_type: string;
  content: string | null;
  created_at: string;
}

// ── Helpers ──
function parseFollowupType(note: string | null) {
  if (!note) return { type: null, text: '' };
  const match = note.match(/^\[(\w+)\]\s*/);
  if (match) return { type: match[1], text: note.slice(match[0].length) };
  return { type: null, text: note };
}

const FOLLOWUP_ICONS: Record<string, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Inbox,
  visita: MapPin,
  reuniao: Users,
};

const FOLLOWUP_COLORS: Record<string, string> = {
  ligacao: 'text-emerald-600',
  whatsapp: 'text-green-600',
  email: 'text-primary',
  visita: 'text-amber-600',
  reuniao: 'text-violet-600',
};

function formatScheduleLabel(dateStr: string): { label: string; urgency: 'overdue' | 'today' | 'tomorrow' | 'future' } {
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return { label: `Atrasado · ${formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}`, urgency: 'overdue' };
  if (isToday(date)) return { label: `Hoje às ${format(date, 'HH:mm')}`, urgency: 'today' };
  if (isTomorrow(date)) return { label: `Amanhã às ${format(date, 'HH:mm')}`, urgency: 'tomorrow' };
  return { label: format(date, "dd/MM 'às' HH:mm", { locale: ptBR }), urgency: 'future' };
}

const URGENCY_STYLES = {
  overdue: 'border-destructive/30 bg-destructive/5',
  today: 'border-primary/30 bg-primary/5',
  tomorrow: 'border-border/50 bg-muted/30',
  future: 'border-border/30 bg-card',
};

// ── Score bar (inline) ──
function MiniScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5 w-16">
      <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums">{score}%</span>
    </div>
  );
}

// ── Loading skeleton ──
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Followup Row (reusable) ──
function FollowupRow({
  f,
  index,
  leadName,
  basePath,
  onComplete,
  navigate,
}: {
  f: Followup;
  index: number;
  leadName: string;
  basePath: string;
  onComplete: (id: string) => void;
  navigate: (path: string) => void;
}) {
  const parsed = parseFollowupType(f.note);
  const TypeIcon = parsed.type ? FOLLOWUP_ICONS[parsed.type] || CalendarClock : CalendarClock;
  const typeColor = parsed.type ? FOLLOWUP_COLORS[parsed.type] || 'text-muted-foreground' : 'text-muted-foreground';
  const schedule = formatScheduleLabel(f.scheduled_at);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.15) }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]',
        URGENCY_STYLES[schedule.urgency]
      )}
      onClick={() => navigate(`${basePath}/${f.lead_id}`)}
    >
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        schedule.urgency === 'overdue' ? 'bg-destructive/10' : 'icon-bg-blue'
      )}>
        <TypeIcon className={cn('w-4 h-4', schedule.urgency === 'overdue' ? 'text-destructive' : typeColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{leadName}</p>
        <p className={cn('text-[11px] font-medium', schedule.urgency === 'overdue' ? 'text-destructive' : 'text-primary')}>
          {schedule.label}
        </p>
        {parsed.text && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{parsed.text}</p>}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-lg shrink-0"
        aria-label="Marcar como concluído"
        onClick={(e) => { e.stopPropagation(); onComplete(f.id); }}
      >
        <CheckCircle2 className="w-4 h-4 text-muted-foreground/60 hover:text-emerald-500" />
      </Button>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </motion.div>
  );
}

// ── Lead Row (reusable for stale/new/hot) ──
function LeadRow_({
  lead,
  index,
  basePath,
  navigate,
  variant,
  now,
}: {
  lead: LeadRow & { respostas_questionario?: Record<string, string> | null };
  index: number;
  basePath: string;
  navigate: (path: string) => void;
  variant: 'stale' | 'new' | 'hot';
  now: Date;
}) {
  const temp = classifyLead((lead as any).respostas_questionario || null, lead.pontuacao_quintal);

  const subtitle = (() => {
    if (variant === 'stale') {
      const daysWaiting = differenceInDays(now, new Date(lead.created_at));
      const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
      const waitLabel = daysWaiting > 0 ? `${daysWaiting}d` : `${hoursWaiting}h`;
      return <span className="text-amber-600 font-bold">⏱ {waitLabel} esperando</span>;
    }
    if (variant === 'new') {
      return <span>{formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true })}</span>;
    }
    return (
      <Badge className={`${STATUS_COLORS[lead.status_lead]} border text-[9px] px-1 py-0`} variant="secondary">
        {STATUS_LABELS[lead.status_lead]}
      </Badge>
    );
  })();

  const avatarBg = variant === 'stale'
    ? 'from-amber-500/15 to-amber-500/5'
    : variant === 'new'
      ? 'from-emerald-500/15 to-emerald-500/5'
      : 'from-primary/20 to-primary/5';
  const avatarColor = variant === 'stale' ? 'text-amber-600' : variant === 'new' ? 'text-emerald-600' : 'text-primary';

  return (
    <SwipeableLeadCard leadPhone={lead.telefone} leadName={lead.nome}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(index * 0.03, 0.15) }}
        className={cn(
          'flex items-center gap-2.5 p-3 cursor-pointer hover:bg-muted/40 transition-colors active:scale-[0.98] border-l-[3px]',
          temp.borderAccent
        )}
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', avatarBg)}>
          <span className={cn('text-xs font-bold', avatarColor)}>
            {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            {lead.cidade && <span className="truncate max-w-[100px]">{lead.cidade}</span>}
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={cn(temp.bgColor, temp.color, 'border text-[9px] font-semibold px-1.5 py-0')} variant="outline">
            {temp.emoji} {temp.label}
          </Badge>
          <MiniScoreBar score={lead.pontuacao_quintal || 0} />
        </div>
      </motion.div>
    </SwipeableLeadCard>
  );
}

// ── Greeting (simplified) ──
function Greeting({ name }: { name: string | null }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = name?.split(' ')[0] || '';

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
        {greeting}{firstName ? `, ${firstName}` : ''} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>
    </motion.div>
  );
}

// ── Main Page ──
export default function HojePage() {
  const navigate = useNavigate();
  const { user, role, franchiseId, loading: authLoading } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const basePath = isAdmin ? '/admin/lead' : '/painel/lead';
  const queryClient = useQueryClient();

  // ── Profile ──
  const { data: profile } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // ── Leads ──
  const { data: leads = [], isLoading: loadingLeads, isError: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ['hoje-leads', franchiseId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, respostas_questionario, lead_origin')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!isAdmin && franchiseId) query = query.eq('franquia_id', franchiseId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as (LeadRow & { respostas_questionario?: Record<string, string> | null })[];
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  // ── Follow-ups ──
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

  // ── Recent activities ──
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['hoje-activities', franchiseId, isAdmin],
    queryFn: async () => {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('lead_activities')
        .select('lead_id, activity_type, content, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(30);
      return (data || []) as LeadActivity[];
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  // ── Derived data ──
  const leadNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    leads.forEach(l => { if (l.nome) map[l.id] = l.nome; });
    return map;
  }, [leads]);

  const now = useMemo(() => new Date(), []);
  const nowMs = now.getTime();

  const overdueFollowups = useMemo(() =>
    followups.filter(f => isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at))),
    [followups]);

  const todayFollowups = useMemo(() =>
    followups.filter(f => isToday(new Date(f.scheduled_at))),
    [followups]);

  const upcomingFollowups = useMemo(() =>
    followups.filter(f => !isPast(new Date(f.scheduled_at)) && !isToday(new Date(f.scheduled_at))).slice(0, 5),
    [followups]);

  const newLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) < 24 * 60 * 60 * 1000),
    [leads, nowMs]);

  const staleLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) > 48 * 60 * 60 * 1000),
    [leads, nowMs]);

  const hotLeads = useMemo(() =>
    leads
      .filter(l => ['novo', 'contatado', 'em_negociacao'].includes(l.status_lead) && (l.pontuacao_quintal || 0) >= 70)
      .sort((a, b) => (b.pontuacao_quintal || 0) - (a.pontuacao_quintal || 0))
      .slice(0, 5),
    [leads]);

  const isLoading = authLoading || loadingLeads || loadingFollowups;

  // Urgency counts for tab badges
  const urgentCount = overdueFollowups.length + todayFollowups.length + staleLeads.length;

  // ── Mutations ──
  const toggleFollowup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_followups').update({ completed: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hoje-followups'] });
    },
  });

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hoje-leads'] }),
      queryClient.invalidateQueries({ queryKey: ['hoje-followups'] }),
      queryClient.invalidateQueries({ queryKey: ['hoje-activities'] }),
    ]);
  }, [queryClient]);

  // ── Action items ──
  const allFollowups = useMemo(() => [...overdueFollowups, ...todayFollowups], [overdueFollowups, todayFollowups]);
  const [activeTab, setActiveTab] = useState('acoes');

  // ── Render ──
  return (
    <PageTransition>
      <PullToRefresh onRefresh={handlePullRefresh}>
        <div className="min-h-screen bg-background pb-bottomnav">
          <PanelHeader title="Hoje">
            <BackButton fallback={isAdmin ? '/admin' : '/franquia'} />
            <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
            <NotificationBell />
            <UserAvatarMenu />
          </PanelHeader>

          <div className="max-w-3xl mx-auto px-4 sm:px-5 md:px-6 py-5 sm:py-8">
            <Breadcrumbs className="md:hidden" items={[
              { label: isAdmin ? 'Admin' : 'Painel', href: isAdmin ? '/admin' : '/franquia' },
              { label: 'Hoje' },
            ]} />

            {isLoading ? <PageSkeleton /> : (
              <>
                {leadsError && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
                    <p className="font-medium">Erro ao carregar dados.</p>
                    <button type="button" onClick={() => refetchLeads()} className="shrink-0 underline underline-offset-2 hover:no-underline font-semibold">
                      Tentar novamente
                    </button>
                  </div>
                )}

                <Greeting name={profile?.full_name || null} />

                {/* ═══ QUICK ACTIONS ═══ */}
                <QuickActionBar
                  onNavigatePipeline={() => navigate(isAdmin ? '/admin?tab=kanban' : '/franquia?tab=funnel')}
                  leads={leads}
                  pendingFollowups={urgentCount}
                />

                {/* ═══ SUMMARY CHIPS ═══ */}
                {(urgentCount > 0 || newLeads.length > 0 || hotLeads.length > 0) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-wrap gap-2 mb-6">
                    {overdueFollowups.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg">
                        🚨 {overdueFollowups.length} atrasado{overdueFollowups.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {todayFollowups.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/30">
                        📋 {todayFollowups.length} follow-up{todayFollowups.length > 1 ? 's' : ''} hoje
                      </span>
                    )}
                    {newLeads.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/30">
                        ✨ {newLeads.length} novo{newLeads.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {hotLeads.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/30">
                        🔥 {hotLeads.length} quente{hotLeads.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {staleLeads.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        ⏰ {staleLeads.length} aguardando contato
                      </span>
                    )}
                  </motion.div>
                )}

                {/* ═══ 3 BLOCKS ═══ */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-6 h-11">
                    <TabsTrigger value="acoes" className="text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                      <ListChecks className="w-3.5 h-3.5" />
                      Ações
                      {urgentCount > 0 && (
                        <Badge variant="destructive" className="text-[9px] font-bold px-1 py-0 h-4 min-w-[16px]">
                          {urgentCount > 9 ? '9+' : urgentCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="pipeline" className="text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Pipeline
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="text-xs sm:text-sm gap-1.5 data-[state=active]:shadow-sm">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Insights
                    </TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >

                  {/* ══ TAB 1: O QUE FAZER AGORA ══ */}
                  <TabsContent value="acoes" className="space-y-6 mt-0">
                    {/* Overdue follow-ups */}
                    {overdueFollowups.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          </div>
                          <h3 className="text-sm font-bold text-foreground">Atrasados</h3>
                          <Badge variant="destructive" className="text-[10px] font-bold px-1.5 py-0">{overdueFollowups.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {overdueFollowups.map((f, i) => (
                            <FollowupRow
                              key={f.id}
                              f={f}
                              index={i}
                              leadName={leadNameMap[f.lead_id] || 'Lead'}
                              basePath={basePath}
                              onComplete={(id) => toggleFollowup.mutate(id)}
                              navigate={navigate}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Today follow-ups */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg icon-bg-blue flex items-center justify-center">
                          <CalendarClock className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Follow-ups de hoje</h3>
                        {todayFollowups.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{todayFollowups.length}</Badge>
                        )}
                      </div>
                      {todayFollowups.length === 0 ? (
                        <Card className="card-premium">
                          <CardContent className="flex items-center gap-3 py-5 px-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">Nenhum follow-up para hoje</p>
                              <p className="text-xs text-muted-foreground">Dia livre para prospectar!</p>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {todayFollowups.map((f, i) => (
                            <FollowupRow
                              key={f.id}
                              f={f}
                              index={i}
                              leadName={leadNameMap[f.lead_id] || 'Lead'}
                              basePath={basePath}
                              onComplete={(id) => toggleFollowup.mutate(id)}
                              navigate={navigate}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stale leads */}
                    {staleLeads.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg icon-bg-amber flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <h3 className="text-sm font-bold text-foreground">Aguardando contato</h3>
                          <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{staleLeads.length}</Badge>
                        </div>
                        <Card className="card-premium overflow-hidden">
                          <CardContent className="p-0 divide-y divide-border/30">
                            {staleLeads.slice(0, 6).map((lead, i) => (
                              <div key={lead.id} className="relative">
                                {i === 0 && <SwipeHint />}
                                <LeadRow_
                                  lead={lead}
                                  index={i}
                                  basePath={basePath}
                                  navigate={navigate}
                                  variant="stale"
                                  now={now}
                                />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                        {staleLeads.length > 6 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-xs text-muted-foreground gap-1.5 rounded-xl"
                            onClick={() => navigate(isAdmin ? '/admin?tab=leads' : '/franquia')}
                          >
                            Ver todos ({staleLeads.length}) <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* New leads */}
                    {newLeads.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg icon-bg-green flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <h3 className="text-sm font-bold text-foreground">Novos leads</h3>
                          <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{newLeads.length}</Badge>
                        </div>
                        <Card className="card-premium overflow-hidden">
                          <CardContent className="p-0 divide-y divide-border/30">
                            {newLeads.slice(0, 5).map((lead, i) => (
                              <LeadRow_
                                key={lead.id}
                                lead={lead}
                                index={i}
                                basePath={basePath}
                                navigate={navigate}
                                variant="new"
                                now={now}
                              />
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Upcoming follow-ups */}
                    {upcomingFollowups.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center">
                            <Target className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <h3 className="text-sm font-bold text-foreground">Próximos</h3>
                          <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{upcomingFollowups.length}</Badge>
                        </div>
                        <div className="space-y-2">
                          {upcomingFollowups.map((f, i) => (
                            <FollowupRow
                              key={f.id}
                              f={f}
                              index={i}
                              leadName={leadNameMap[f.lead_id] || 'Lead'}
                              basePath={basePath}
                              onComplete={(id) => toggleFollowup.mutate(id)}
                              navigate={navigate}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {allFollowups.length === 0 && staleLeads.length === 0 && newLeads.length === 0 && upcomingFollowups.length === 0 && (
                      <Card className="card-premium">
                        <CardContent className="flex flex-col items-center py-12 text-center">
                          <div className="w-14 h-14 rounded-2xl icon-bg-blue flex items-center justify-center mb-4">
                            <Rocket className="w-7 h-7 text-primary/60" />
                          </div>
                          <h3 className="text-base font-semibold text-foreground mb-1">Tudo em dia!</h3>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            Nenhuma ação pendente. Compartilhe seu link para receber novos leads.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* ══ TAB 2: PIPELINE ══ */}
                  <TabsContent value="pipeline" className="space-y-6 mt-0">
                    {leads.length > 0 ? (
                      <>
                        <PipelineSnapshot leads={leads} />

                        {/* Hot leads preview */}
                        {hotLeads.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-7 h-7 rounded-lg icon-bg-amber flex items-center justify-center">
                                <Flame className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                              <h3 className="text-sm font-bold text-foreground">Leads quentes</h3>
                              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{hotLeads.length}</Badge>
                            </div>
                            <Card className="card-premium overflow-hidden">
                              <CardContent className="p-0 divide-y divide-border/30">
                                {hotLeads.map((lead, i) => (
                                  <LeadRow_
                                    key={lead.id}
                                    lead={lead}
                                    index={i}
                                    basePath={basePath}
                                    navigate={navigate}
                                    variant="hot"
                                    now={now}
                                  />
                                ))}
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          className="w-full rounded-xl gap-2"
                          onClick={() => navigate(isAdmin ? '/admin?tab=kanban' : '/franquia?tab=funnel')}
                        >
                          <TrendingUp className="w-4 h-4" />
                          Ver funil completo
                        </Button>
                      </>
                    ) : (
                      <Card className="card-premium">
                        <CardContent className="flex flex-col items-center py-12 text-center">
                          <div className="w-14 h-14 rounded-2xl icon-bg-blue flex items-center justify-center mb-4">
                            <BarChart3 className="w-7 h-7 text-primary/60" />
                          </div>
                          <h3 className="text-base font-semibold text-foreground mb-1">Pipeline vazio</h3>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            Seus leads aparecerão aqui quando chegarem.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* ══ TAB 3: INSIGHTS ══ */}
                  <TabsContent value="insights" className="space-y-6 mt-0">
                    <SmartSuggestions
                      leads={leads}
                      followups={followups}
                      activities={recentActivities}
                      basePath={basePath}
                    />

                    {leads.length === 0 && followups.length === 0 && (
                      <Card className="card-premium">
                        <CardContent className="flex flex-col items-center py-12 text-center">
                          <div className="w-14 h-14 rounded-2xl icon-bg-violet flex items-center justify-center mb-4">
                            <Lightbulb className="w-7 h-7 text-violet-500/60" />
                          </div>
                          <h3 className="text-base font-semibold text-foreground mb-1">Insights chegando</h3>
                          <p className="text-sm text-muted-foreground max-w-xs">
                            Conforme seus leads avançam, sugestões inteligentes aparecerão aqui.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                    </motion.div>
                  </AnimatePresence>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}
