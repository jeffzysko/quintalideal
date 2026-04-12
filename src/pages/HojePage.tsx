import { useMemo, useCallback } from 'react';
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
import { motion } from 'framer-motion';
import { format, isToday, isPast, differenceInDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, AlertTriangle, Phone, MessageCircle,
  ChevronRight, Clock, CheckCircle2,
  MapPin, Rocket, Inbox, Users,
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
  return { label: format(date, "dd/MM 'às' HH:mm", { locale: ptBR }), urgency: 'future' };
}

const URGENCY_STYLES = {
  overdue: 'border-destructive/30 bg-destructive/5',
  today: 'border-primary/30 bg-primary/5',
  tomorrow: 'border-border/50 bg-muted/30',
  future: 'border-border/30 bg-card',
};

// ── Loading skeleton ──
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-32" />
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
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
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.12) }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]',
        URGENCY_STYLES[schedule.urgency]
      )}
      onClick={() => navigate(`${basePath}/${f.lead_id}`)}
    >
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-lg shrink-0"
        aria-label="Marcar como concluído"
        onClick={(e) => { e.stopPropagation(); onComplete(f.id); }}
      >
        <CheckCircle2 className="w-4.5 h-4.5 text-muted-foreground/50 hover:text-emerald-500 transition-colors" />
      </Button>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        schedule.urgency === 'overdue' ? 'bg-destructive/10' : 'icon-bg-blue'
      )}>
        <TypeIcon className={cn('w-4 h-4', schedule.urgency === 'overdue' ? 'text-destructive' : typeColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{leadName}</p>
        <p className={cn('text-[11px] font-medium', schedule.urgency === 'overdue' ? 'text-destructive' : 'text-muted-foreground')}>
          {schedule.label}
        </p>
        {parsed.text && <p className="text-[11px] text-muted-foreground/70 truncate">{parsed.text}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
    </motion.div>
  );
}

// ── Stale Lead Row (simplified) ──
function StaleLeadRow({
  lead, index, basePath, navigate, now,
}: {
  lead: LeadRow; index: number; basePath: string;
  navigate: (path: string) => void; now: Date;
}) {
  const daysWaiting = differenceInDays(now, new Date(lead.created_at));
  const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
  const waitLabel = daysWaiting > 0 ? `${daysWaiting}d` : `${hoursWaiting}h`;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) return;
    const fullPhone = toWhatsAppPhone(lead.telefone);
    const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem?`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) return;
    const phone = lead.telefone.replace(/\D/g, '');
    window.open(`tel:+55${phone}`, '_self');
  };

  return (
    <SwipeableLeadCard leadPhone={lead.telefone} leadName={lead.nome}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(index * 0.03, 0.12) }}
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors active:scale-[0.98]"
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-amber-600">
            {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
          <p className="text-[11px] text-amber-600 font-semibold">⏱ {waitLabel} sem contato</p>
        </div>
        {lead.telefone && (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={handleWhatsApp} aria-label="WhatsApp">
              <MessageCircle className="w-3.5 h-3.5 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={handleCall} aria-label="Ligar">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
            </Button>
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      </motion.div>
    </SwipeableLeadCard>
  );
}

// ── Greeting ──
function Greeting({ name }: { name: string | null }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = name?.split(' ')[0] || '';

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        {greeting}{firstName ? `, ${firstName}` : ''} 👋
      </h1>
      <p className="text-sm text-muted-foreground mt-0.5">
        {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </p>
    </motion.div>
  );
}

// ── Section Header ──
function SectionHeader({ icon: Icon, title, count, variant = 'default' }: {
  icon: typeof AlertTriangle; title: string; count?: number;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const bgMap = { default: 'icon-bg-blue', danger: 'bg-destructive/10', warning: 'icon-bg-amber' };
  const colorMap = { default: 'text-primary', danger: 'text-destructive', warning: 'text-amber-600' };
  return (
    <div className="flex items-center gap-2 mb-2.5 mt-6 first:mt-0">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', bgMap[variant])}>
        <Icon className={cn('w-3.5 h-3.5', colorMap[variant])} />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {count !== undefined && count > 0 && (
        <Badge variant={variant === 'danger' ? 'destructive' : 'secondary'} className="text-[10px] font-bold px-1.5 py-0">
          {count}
        </Badge>
      )}
    </div>
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
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, lead_origin')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!isAdmin && franchiseId) query = query.eq('franquia_id', franchiseId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LeadRow[];
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

  const staleLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) > 48 * 60 * 60 * 1000),
    [leads, nowMs]);

  const newLeads = useMemo(() =>
    leads.filter(l => l.status_lead === 'novo' && (nowMs - new Date(l.created_at).getTime()) < 48 * 60 * 60 * 1000),
    [leads, nowMs]);

  const isLoading = authLoading || loadingLeads || loadingFollowups;

  const totalTasks = overdueFollowups.length + todayFollowups.length + staleLeads.length + newLeads.length;

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
    ]);
  }, [queryClient]);

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

          <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
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

                {/* ── Summary ── */}
                {totalTasks > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground mb-5 -mt-3"
                  >
                    Você tem <span className="font-semibold text-foreground">{totalTasks}</span> tarefa{totalTasks > 1 ? 's' : ''} pendente{totalTasks > 1 ? 's' : ''}
                  </motion.p>
                )}

                {/* ── 1. Overdue follow-ups ── */}
                {overdueFollowups.length > 0 && (
                  <div>
                    <SectionHeader icon={AlertTriangle} title="Atrasados" count={overdueFollowups.length} variant="danger" />
                    <div className="space-y-2">
                      {overdueFollowups.map((f, i) => (
                        <FollowupRow
                          key={f.id} f={f} index={i}
                          leadName={leadNameMap[f.lead_id] || 'Lead'}
                          basePath={basePath}
                          onComplete={(id) => toggleFollowup.mutate(id)}
                          navigate={navigate}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 2. Today follow-ups ── */}
                <div>
                  <SectionHeader icon={CalendarClock} title="Follow-ups de hoje" count={todayFollowups.length} />
                  {todayFollowups.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex items-center gap-3 py-4 px-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm text-muted-foreground">Nenhum follow-up para hoje</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {todayFollowups.map((f, i) => (
                        <FollowupRow
                          key={f.id} f={f} index={i}
                          leadName={leadNameMap[f.lead_id] || 'Lead'}
                          basePath={basePath}
                          onComplete={(id) => toggleFollowup.mutate(id)}
                          navigate={navigate}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── 3. Stale leads (sem contato há 48h+) ── */}
                {staleLeads.length > 0 && (
                  <div>
                    <SectionHeader icon={Clock} title="Sem contato" count={staleLeads.length} variant="warning" />
                    <Card className="overflow-hidden">
                      <CardContent className="p-0 divide-y divide-border/30">
                        {staleLeads.slice(0, 8).map((lead, i) => (
                          <div key={lead.id} className="relative">
                            {i === 0 && <SwipeHint />}
                            <StaleLeadRow lead={lead} index={i} basePath={basePath} navigate={navigate} now={now} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    {staleLeads.length > 8 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-xs text-muted-foreground gap-1"
                        onClick={() => navigate(isAdmin ? '/admin?tab=leads' : '/franquia')}
                      >
                        Ver todos ({staleLeads.length})
                      </Button>
                    )}
                  </div>
                )}

                {/* ── 4. New leads (< 48h) ── */}
                {newLeads.length > 0 && (
                  <div>
                    <SectionHeader icon={Rocket} title="Novos leads" count={newLeads.length} />
                    <Card className="overflow-hidden">
                      <CardContent className="p-0 divide-y divide-border/30">
                        {newLeads.slice(0, 5).map((lead, i) => (
                          <StaleLeadRow key={lead.id} lead={lead} index={i} basePath={basePath} navigate={navigate} now={now} />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ── Empty state ── */}
                {totalTasks === 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl icon-bg-blue flex items-center justify-center mb-3">
                          <Rocket className="w-6 h-6 text-primary/60" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">Tudo em dia!</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Nenhuma tarefa pendente. Compartilhe seu link para receber novos leads.
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </PullToRefresh>
    </PageTransition>
  );
}
