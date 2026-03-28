import { useMemo, useState } from 'react';
import { ManualLeadForm } from '@/components/franchise/ManualLeadForm';
import { CSVLeadImport } from '@/components/franchise/CSVLeadImport';
import { BackButton } from '@/components/BackButton';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toWhatsAppPhone } from '@/lib/phone-utils';
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
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, differenceInHours, differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, AlertTriangle, Inbox, Phone, MessageCircle,
  ChevronRight, Clock, Flame, Zap, CheckCircle2, Users,
  TrendingUp, ArrowRight, Sparkles, Target, MapPin,
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, type LeadRow } from '@/lib/lead-constants';
import { classifyLead } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';
import { SmartSuggestions } from '@/components/dashboard/SmartSuggestions';
import { QuickActionBar } from '@/components/dashboard/QuickActionBar';
import { PipelineSnapshot } from '@/components/dashboard/PipelineSnapshot';
import { WebhookHealthWidget } from '@/components/dashboard/WebhookHealthWidget';

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

// ── Section wrapper ──
function Section({ icon: Icon, title, count, iconBg = 'icon-bg-blue', children, action, collapsible = false, defaultOpen = true, subtitle }: {
  icon: typeof CalendarClock;
  title: string;
  count?: number;
  iconBg?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div
        className={cn("flex items-center justify-between mb-3", collapsible && "cursor-pointer select-none")}
        onClick={collapsible ? () => setOpen(v => !v) : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              {count !== undefined && count > 0 && (
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{count}</Badge>
              )}
              {collapsible && (
                <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-90")} />
              )}
            </div>
            {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={collapsible ? { height: 0, opacity: 0 } : undefined}
            className={collapsible ? 'overflow-hidden' : undefined}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ── Enhanced Greeting ──
function Greeting({ name, summaryItems }: { name: string | null; summaryItems: { emoji: string; text: string }[] }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = name?.split(' ')[0] || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
        {greeting}{firstName ? `, ${firstName}` : ''} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>
      {summaryItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 flex flex-wrap gap-2"
        >
          {summaryItems.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/30">
              <span>{item.emoji}</span> {item.text}
            </span>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Enhanced Quick Stats ──
function QuickStats({ stats }: { stats: { icon: typeof Users; label: string; value: number; color: string; ringColor?: string; description?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.min(i * 0.05, 0.15) }}
        >
          <Card className="card-premium hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.ringColor || 'bg-muted/60')}>
                  <stat.icon className={cn('w-4.5 h-4.5', stat.color)} />
                </div>
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-none">{stat.value}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">{stat.label}</p>
              {stat.description && (
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──
export default function HojePage() {
  const navigate = useNavigate();
  const { user, role, franchiseId, loading: authLoading } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const basePath = isAdmin ? '/admin/lead' : '/painel/lead';

  // ── Profile ──
  const { data: profile } = useQuery({
    queryKey: ['profile-name', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // ── Leads (lightweight) ──
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['hoje-leads', franchiseId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, respostas_questionario, lead_origin')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!isAdmin && franchiseId) {
        query = query.eq('franquia_id', franchiseId);
      }

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

      if (!isAdmin && franchiseId) {
        query = query.eq('franchise_id', franchiseId);
      }

      const { data } = await query;
      return (data || []) as Followup[];
    },
    enabled: !authLoading && (!!franchiseId || isAdmin),
  });

  // ── Recent activities (last 48h) ──
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

  // ── Lead names lookup for follow-ups ──
  const leadNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    leads.forEach(l => { if (l.nome) map[l.id] = l.nome; });
    return map;
  }, [leads]);

  // ── Computed data ──
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

  // New leads (last 24h)
  const newLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) < 24 * 60 * 60 * 1000),
  [leads, nowMs]);

  // Stale leads (novo status > 48h without contact)
  const staleLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) > 48 * 60 * 60 * 1000),
  [leads, nowMs]);

  // Hot leads (high score in active pipeline)
  const hotLeads = useMemo(() => {
    return leads
      .filter(l => ['novo', 'contatado', 'em_negociacao'].includes(l.status_lead) && (l.pontuacao_quintal || 0) >= 70)
      .sort((a, b) => (b.pontuacao_quintal || 0) - (a.pontuacao_quintal || 0))
      .slice(0, 5);
  }, [leads]);

  // Recent pipeline activity
  const activityFeed = useMemo(() => {
    return recentActivities.filter(a => a.activity_type === 'status_change').slice(0, 8);
  }, [recentActivities]);

  const isLoading = authLoading || loadingLeads || loadingFollowups;

  // ── Greeting summary items ──
  const summaryItems = useMemo(() => {
    const items: { emoji: string; text: string }[] = [];
    const totalPending = todayFollowups.length + overdueFollowups.length;
    if (totalPending > 0) items.push({ emoji: '📋', text: `${totalPending} follow-up${totalPending > 1 ? 's' : ''} pendente${totalPending > 1 ? 's' : ''}` });
    if (newLeads.length > 0) items.push({ emoji: '✨', text: `${newLeads.length} lead${newLeads.length > 1 ? 's' : ''} novo${newLeads.length > 1 ? 's' : ''}` });
    if (hotLeads.length > 0) items.push({ emoji: '🔥', text: `${hotLeads.length} lead${hotLeads.length > 1 ? 's' : ''} quente${hotLeads.length > 1 ? 's' : ''}` });
    if (staleLeads.length > 0) items.push({ emoji: '⏰', text: `${staleLeads.length} aguardando contato` });
    return items;
  }, [todayFollowups, overdueFollowups, newLeads, hotLeads, staleLeads]);

  // Quick stats
  const quickStats = useMemo(() => [
    { icon: CalendarClock, label: 'Follow-ups hoje', value: todayFollowups.length, color: 'text-primary', ringColor: 'icon-bg-blue', description: todayFollowups.length === 0 ? 'Dia livre!' : undefined },
    { icon: AlertTriangle, label: 'Atrasados', value: overdueFollowups.length, color: overdueFollowups.length > 0 ? 'text-destructive' : 'text-muted-foreground', ringColor: overdueFollowups.length > 0 ? 'bg-destructive/10' : 'bg-muted/60', description: overdueFollowups.length > 0 ? 'Precisam de atenção' : 'Tudo em dia' },
    { icon: Zap, label: 'Novos (24h)', value: newLeads.length, color: 'text-emerald-600', ringColor: 'icon-bg-green' },
    { icon: Flame, label: 'Leads quentes', value: hotLeads.length, color: 'text-amber-600', ringColor: 'icon-bg-amber', description: 'Score ≥ 70%' },
  ], [todayFollowups, overdueFollowups, newLeads, hotLeads]);

  // ── Handlers ──
  const handleWhatsApp = (lead: LeadRow) => {
    if (!lead.telefone) return;
    const fullPhone = toWhatsAppPhone(lead.telefone);
    const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem?`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  // ── Render ──
  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-bottomnav">
        <PanelHeader title="Hoje">
          <BackButton fallback={isAdmin ? '/admin' : '/franquia'} />
          <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
          <NotificationBell />
          <UserAvatarMenu />
        </PanelHeader>

        <div className="max-w-3xl mx-auto px-4 sm:px-5 md:px-6 py-5 sm:py-8">
          <Breadcrumbs items={[
            { label: isAdmin ? 'Admin' : 'Painel', href: isAdmin ? '/admin' : '/franquia' },
            { label: 'Hoje' },
          ]} />

          {isLoading ? <PageSkeleton /> : (
            <>
               <Greeting name={profile?.full_name || null} summaryItems={summaryItems} />
               <QuickActionBar
                 onNavigatePipeline={() => navigate(isAdmin ? '/admin?tab=kanban' : '/franquia?tab=funnel')}
                 leads={leads}
                 pendingFollowups={todayFollowups.length + overdueFollowups.length}
               />
               {franchiseId && (
                 <div className="mb-6 flex items-center gap-2.5">
                    <ManualLeadForm franchiseId={franchiseId} />
                    <CSVLeadImport franchiseId={franchiseId} />
                 </div>
               )}
               <QuickStats stats={quickStats} />

               {/* ═══ WEBHOOK HEALTH ═══ */}
               {franchiseId && <WebhookHealthWidget franchiseId={franchiseId} />}

               {/* ═══ PIPELINE SNAPSHOT ═══ */}
               {leads.length > 0 && <PipelineSnapshot leads={leads} />}

               {/* ═══ SMART SUGGESTIONS ═══ */}
               <SmartSuggestions
                 leads={leads}
                 followups={followups}
                 activities={recentActivities}
                 basePath={basePath}
               />

              {/* ═══ URGENT: Overdue Follow-ups ═══ */}
              {overdueFollowups.length > 0 && (
                <Section icon={AlertTriangle} title="Atrasados" count={overdueFollowups.length} iconBg="bg-destructive/10" subtitle="Follow-ups que já passaram do prazo">
                  <div className="space-y-2.5">
                    {overdueFollowups.map((f, i) => {
                      const parsed = parseFollowupType(f.note);
                      const TypeIcon = parsed.type ? FOLLOWUP_ICONS[parsed.type] || CalendarClock : CalendarClock;
                      const typeColor = parsed.type ? FOLLOWUP_COLORS[parsed.type] || 'text-muted-foreground' : 'text-muted-foreground';
                      const schedule = formatScheduleLabel(f.scheduled_at);
                      const leadName = leadNameMap[f.lead_id];

                      return (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.15) }}
                          className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]', URGENCY_STYLES.overdue)}
                          onClick={() => navigate(`${basePath}/${f.lead_id}`)}
                        >
                          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <TypeIcon className={cn('w-4 h-4', typeColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{leadName || 'Lead'}</p>
                            <p className="text-[11px] text-destructive font-medium">{schedule.label}</p>
                            {parsed.text && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{parsed.text}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </motion.div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ═══ TODAY'S FOLLOW-UPS ═══ */}
              <Section
                icon={CalendarClock}
                title="Follow-ups de hoje"
                count={todayFollowups.length}
                subtitle={todayFollowups.length > 0 ? 'Compromissos agendados para hoje' : undefined}
                action={
                  todayFollowups.length === 0 ? undefined : (
                    <Badge variant="outline" className="text-[10px] border-primary/20 text-primary font-medium">
                      <Clock className="w-3 h-3 mr-1" />
                      {todayFollowups.length} agendado{todayFollowups.length !== 1 ? 's' : ''}
                    </Badge>
                  )
                }
              >
                {todayFollowups.length === 0 ? (
                  <Card className="card-premium">
                    <CardContent className="flex flex-col items-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Nenhum follow-up para hoje!</p>
                      <p className="text-xs text-muted-foreground mt-1">Seu dia está livre. Aproveite para prospectar novos leads.</p>
                    </CardContent>
                  </Card>
                ) : (
                   <div className="space-y-2.5">
                    {todayFollowups.map((f, i) => {
                      const parsed = parseFollowupType(f.note);
                      const TypeIcon = parsed.type ? FOLLOWUP_ICONS[parsed.type] || CalendarClock : CalendarClock;
                      const typeColor = parsed.type ? FOLLOWUP_COLORS[parsed.type] || 'text-primary' : 'text-primary';
                      const schedule = formatScheduleLabel(f.scheduled_at);
                      const leadName = leadNameMap[f.lead_id];

                      return (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.15) }}
                          className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]', URGENCY_STYLES.today)}
                          onClick={() => navigate(`${basePath}/${f.lead_id}`)}
                        >
                          <div className="w-9 h-9 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
                            <TypeIcon className={cn('w-4 h-4', typeColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{leadName || 'Lead'}</p>
                            <p className="text-[11px] text-primary font-medium">{schedule.label}</p>
                            {parsed.text && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{parsed.text}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* ═══ STALE LEADS (needs attention) ═══ */}
              {staleLeads.length > 0 && (
                <Section icon={Clock} title="Aguardando contato" count={staleLeads.length} iconBg="icon-bg-amber" subtitle="Leads novos há mais de 48h sem resposta">
                  <Card className="card-premium overflow-hidden">
                    <CardContent className="p-0 divide-y divide-border/30">
                      {staleLeads.slice(0, 8).map((lead, i) => {
                        const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
                        const daysWaiting = differenceInDays(now, new Date(lead.created_at));
                        const waitLabel = daysWaiting > 0 ? `${daysWaiting}d` : `${hoursWaiting}h`;
                        const temp = classifyLead((lead as any).respostas_questionario || null, lead.pontuacao_quintal);
                        const borderAccent = temp.borderAccent;

                        return (
                          <motion.div
                            key={lead.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(i * 0.03, 0.15) }}
                            className={cn('flex items-center gap-2.5 p-3 cursor-pointer hover:bg-muted/40 transition-colors border-l-[3px]', borderAccent)}
                            onClick={() => navigate(`${basePath}/${lead.id}`)}
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-amber-600">
                                {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                {lead.cidade && <span className="truncate max-w-[100px]">{lead.cidade}</span>}
                                <span className="text-amber-600 font-bold">⏱ {waitLabel} esperando</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge className={cn(temp.bgColor, temp.color, 'border text-[9px] font-semibold px-1.5 py-0')} variant="outline">
                                {temp.emoji} {temp.label}
                              </Badge>
                              <MiniScoreBar score={lead.pontuacao_quintal || 0} />
                              {lead.telefone && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); handleWhatsApp(lead); }}
                                  aria-label="WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>
                  {staleLeads.length > 8 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-muted-foreground gap-1.5 rounded-xl"
                      onClick={() => navigate(isAdmin ? '/admin?tab=leads' : '/franquia')}
                    >
                      Ver todos ({staleLeads.length})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </Section>
              )}

              {/* ═══ NEW LEADS (24h) ═══ */}
              {newLeads.length > 0 && (
                <Section icon={Zap} title="Novos leads" count={newLeads.length} iconBg="icon-bg-green" subtitle="Chegaram nas últimas 24 horas" collapsible defaultOpen={newLeads.length <= 4}>
                  <div className="space-y-2.5">
                    {newLeads.slice(0, 6).map((lead, i) => {
                      const temp = classifyLead((lead as any).respostas_questionario || null, lead.pontuacao_quintal);
                      const timeAgo = formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true });
                      const borderAccent = temp.borderAccent;

                      return (
                        <motion.div
                          key={lead.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.15) }}
                          className={cn('flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:shadow-sm transition-all active:scale-[0.98] border-l-[3px]', borderAccent)}
                          onClick={() => navigate(`${basePath}/${lead.id}`)}
                        >
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-emerald-600">
                              {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{timeAgo} · {lead.cidade || 'Sem cidade'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge className={cn(temp.bgColor, temp.color, 'border text-[9px] font-semibold px-1.5 py-0')} variant="outline">
                              {temp.emoji} {temp.label}
                            </Badge>
                            <MiniScoreBar score={lead.pontuacao_quintal || 0} />
                            {lead.telefone && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg"
                                onClick={(e) => { e.stopPropagation(); handleWhatsApp(lead); }}
                                aria-label="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ═══ HOT LEADS ═══ */}
              {hotLeads.length > 0 && (
                <Section icon={Flame} title="Leads quentes" count={hotLeads.length} iconBg="icon-bg-amber" subtitle="Maior potencial de conversão" collapsible defaultOpen={hotLeads.length <= 3}>
                  <Card className="card-premium overflow-hidden">
                    <CardContent className="p-0 divide-y divide-border/30">
                      {hotLeads.map((lead, i) => (
                          <motion.div
                            key={lead.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(i * 0.03, 0.15) }}
                            className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-muted/40 transition-colors active:scale-[0.98] border-l-[3px] border-l-emerald-500"
                            onClick={() => navigate(`${basePath}/${lead.id}`)}
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                                <Badge className={`${STATUS_COLORS[lead.status_lead]} border text-[9px] px-1 py-0`} variant="secondary">
                                  {STATUS_LABELS[lead.status_lead]}
                                </Badge>
                                {lead.modelo_recomendado && <span className="truncate">{lead.modelo_recomendado}</span>}
                                {lead.cidade && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />{lead.cidade}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <MiniScoreBar score={lead.pontuacao_quintal || 0} />
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </motion.div>
                        ))}
                    </CardContent>
                  </Card>
                </Section>
              )}

              {/* ═══ UPCOMING FOLLOW-UPS ═══ */}
              {upcomingFollowups.length > 0 && (
                <Section icon={Target} title="Próximos follow-ups" count={upcomingFollowups.length} subtitle="Agendamentos dos próximos dias" collapsible defaultOpen={false}>
                  <div className="space-y-2.5">
                    {upcomingFollowups.map((f, i) => {
                      const parsed = parseFollowupType(f.note);
                      const TypeIcon = parsed.type ? FOLLOWUP_ICONS[parsed.type] || CalendarClock : CalendarClock;
                      const schedule = formatScheduleLabel(f.scheduled_at);
                      const leadName = leadNameMap[f.lead_id];

                      return (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.15) }}
                          className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]', URGENCY_STYLES[schedule.urgency])}
                          onClick={() => navigate(`${basePath}/${f.lead_id}`)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{leadName || 'Lead'}</p>
                            <p className="text-[11px] text-muted-foreground">{schedule.label}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </motion.div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* ═══ RECENT ACTIVITY FEED ═══ */}
              {activityFeed.length > 0 && (
                <Section icon={TrendingUp} title="Atividade recente" count={activityFeed.length} subtitle="Últimas 48 horas" collapsible defaultOpen={false}>
                  <Card className="card-premium">
                    <CardContent className="p-3 space-y-1">
                      {activityFeed.map((a, i) => {
                        const leadName = leadNameMap[a.lead_id] || 'Lead';
                        const timeAgo = formatDistanceToNow(new Date(a.created_at), { locale: ptBR, addSuffix: true });

                        return (
                          <motion.div
                            key={`${a.lead_id}-${a.created_at}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(i * 0.03, 0.15) }}
                            className="flex items-start gap-2.5 py-2.5 cursor-pointer hover:bg-muted/30 rounded-lg px-2 transition-colors active:scale-[0.98]"
                            onClick={() => navigate(`${basePath}/${a.lead_id}`)}
                          >
                            <div className="w-2 h-2 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground">
                                <span className="font-semibold">{leadName}</span>{' '}
                                <span className="text-muted-foreground">{a.content || 'mudança de status'}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </Section>
              )}

              {/* ═══ EMPTY STATE ═══ */}
              {!isLoading && leads.length === 0 && followups.length === 0 && (
                <Card className="card-premium">
                  <CardContent className="flex flex-col items-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl icon-bg-blue flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-primary/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Tudo em dia!</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Sua central de ações aparecerá aqui quando houver leads, follow-ups e atividades para gerenciar.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
