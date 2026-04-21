import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Droplets, BarChart3, Link2, Copy, Check, Workflow, CalendarClock, FileText, Package } from 'lucide-react';
import { ConversionFunnel } from '@/components/franchise/ConversionFunnel';
import { SLAIndicator } from '@/components/franchise/SLAIndicator';
import { MonthlyGoals } from '@/components/franchise/MonthlyGoals';
import { LeadFollowups } from '@/components/franchise/LeadFollowups';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLeadCard } from '@/components/admin/MobileLeadCard';
import { MobileLeadSkeleton } from '@/components/dashboard/MobileLeadSkeleton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { FranchiseReports } from '@/components/franchise/FranchiseReports';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { classifyLead } from '@/lib/leadScoring';
import { KanbanBoard } from '@/components/franchise/KanbanBoard';
import { WelcomeWizard } from '@/components/franchise/WelcomeWizard';
import { AchievementsDashboard } from '@/components/franchise/AchievementsDashboard';
import { MetricGrid } from '@/components/dashboard/MetricGrid';
import { TimeRangeSelector, filterByTimeRange, type TimeRange } from '@/components/dashboard/TimeRangeSelector';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import type { MetricCardProps } from '@/components/dashboard/MetricCard';
import { InsightCards } from '@/components/dashboard/InsightCards';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';
import { OnboardingChecklist } from '@/components/franchise/OnboardingChecklist';
import { FirstAccessModal } from '@/components/franchise/FirstAccessModal';
import { PostSaleDashboard } from '@/components/franchise/PostSaleDashboard';

const PAGE_SIZE = 20;

function FranchiseLinkBanner({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div data-tour="franchise-link" className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 card-glow-blue">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl icon-bg-blue flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground mb-0.5 uppercase tracking-wider">Seu link exclusivo</p>
          <p className="text-[11px] text-muted-foreground mb-0.5">Compartilhe para receber leads</p>
          <p className="text-sm text-primary font-mono truncate">{url}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2 rounded-xl border-primary/30 hover:bg-primary/10 shrink-0">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copiado!' : 'Copiar link'}
      </Button>
    </div>
  );
}

interface FranchiseDashboardProps {
  overrideFranchiseId?: string;
  embedded?: boolean;
}

export default function FranchiseDashboard({ overrideFranchiseId, embedded }: FranchiseDashboardProps = {}) {
  const { franchiseId: authFranchiseId, loading: authLoading, role } = useAuth();
  const franchiseId = overrideFranchiseId || authFranchiseId;
  const showOnboarding = role === 'franquia' && !overrideFranchiseId;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Live updates: invalidates queries when leads for this franchise change
  useLeadsRealtime(franchiseId);
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  
  // Read tab from URL params (or local state when embedded)
  type FranchiseTab = 'leads' | 'funnel' | 'reports' | 'achievements' | 'pos-venda';
  const getTabFromSearch = (search: string): FranchiseTab => {
    const urlTab = new URLSearchParams(search).get('tab');
    if (urlTab === 'funnel') return 'funnel';
    if (urlTab === 'reports') return 'reports';
    if (urlTab === 'achievements') return 'achievements';
    if (urlTab === 'pos-venda') return 'pos-venda';
    return 'leads';
  };

  const [localTab, setLocalTab] = useState<FranchiseTab>('leads');
  const activeTab = embedded ? localTab : getTabFromSearch(location.search);
  const setActiveTab = (tab: FranchiseTab) => {
    if (embedded) {
      setLocalTab(tab);
      return;
    }
    const params = new URLSearchParams(location.search);
    if (tab === 'leads') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
  };
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  // ── Franchise info ──
  const { data: franchiseInfo } = useQuery({
    queryKey: ['franchise-info', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchises')
        .select('slug_url, nome_franquia')
        .eq('id', franchiseId!)
        .maybeSingle();
      return data;
    },
    enabled: !!franchiseId,
  });

  // ── Lightweight KPI query (minimal columns for metrics, funnel, SLA, insights) ──
  type KpiLead = { id: string; status_lead: string; created_at: string; updated_at: string; pontuacao_quintal: number | null; respostas_questionario: Record<string, string> | null };
  const { data: kpiLeads = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['franchise-leads-kpi', franchiseId],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const BATCH = 1000;
      const allData: KpiLead[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, status_lead, created_at, updated_at, pontuacao_quintal, respostas_questionario')
          .eq('franquia_id', franchiseId!)
          .gte('created_at', twelveMonthsAgo.toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as KpiLead[]));
        if (data.length < BATCH) break;
        from += BATCH;
      }
      return allData;
    },
    enabled: !!franchiseId,
    staleTime: 3 * 60 * 1000,
  });

  // ── Full leads query (for Kanban, Reports, Achievements — deferred until tab is active) ──
  const needsFullLeads = activeTab === 'leads' || activeTab === 'funnel' || activeTab === 'reports' || activeTab === 'achievements';
  const { data: allLeads = [], isError: franchiseError, refetch: refetchFranchise } = useQuery({
    queryKey: ['franchise-leads-all', franchiseId],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const BATCH = 1000;
      const allData: (LeadRow & { respostas_questionario?: Record<string, string> | null })[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, status_lead, created_at, updated_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin, respostas_questionario, utm_source, utm_medium, utm_campaign')
          .eq('franquia_id', franchiseId!)
          .gte('created_at', twelveMonthsAgo.toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as typeof allData));
        if (data.length < BATCH) break;
        from += BATCH;
      }
      return allData;
    },
    enabled: !!franchiseId && needsFullLeads,
    staleTime: 3 * 60 * 1000,
  });

  // ── Lead IDs for server-side filtering of activities ──
  const kpiLeadIds = useMemo(() => kpiLeads.map(l => l.id), [kpiLeads]);

  // ── Lead activities for SLA (filtered by lead_ids on server) ──
  const { data: leadActivities = [] } = useQuery({
    queryKey: ['franchise-lead-activities', franchiseId, kpiLeadIds.length],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Filter by lead_ids in batches to avoid URL length limits
      const BATCH_SIZE = 200;
      const allActivities: { lead_id: string; activity_type: string; created_at: string; content: string | null }[] = [];
      
      for (let i = 0; i < kpiLeadIds.length; i += BATCH_SIZE) {
        const batch = kpiLeadIds.slice(i, i + BATCH_SIZE);
        const { data } = await supabase
          .from('lead_activities')
          .select('lead_id, activity_type, created_at')
          .eq('activity_type', 'status_change')
          .in('lead_id', batch)
          .gte('created_at', sixMonthsAgo.toISOString())
          .order('created_at', { ascending: true });
        if (data) allActivities.push(...(data as typeof allActivities));
      }
      
      return allActivities;
    },
    enabled: !!franchiseId && kpiLeadIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ── Paginated leads for table ──
  const { data: paginatedData, isLoading: loadingTable } = useQuery({
    queryKey: ['franchise-leads-table', franchiseId, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin, respostas_questionario, utm_source, utm_medium, utm_campaign', { count: 'exact' })
        .eq('franquia_id', franchiseId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { leads: (data || []) as (LeadRow & { respostas_questionario?: Record<string, string> | null })[], total: count || 0 };
    },
    enabled: !!franchiseId,
    staleTime: 60 * 1000,
  });

  // Prefetch next page so pagination feels instant
  useEffect(() => {
    if (!franchiseId || page >= Math.ceil((paginatedData?.total || 0) / PAGE_SIZE)) return;
    const nextPage = page + 1;
    const from = (nextPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    queryClient.prefetchQuery({
      queryKey: ['franchise-leads-table', franchiseId, nextPage],
      staleTime: 60 * 1000,
      queryFn: async () => {
        const { data, count, error } = await supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin', { count: 'exact' })
          .eq('franquia_id', franchiseId)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (error) throw error;
        return { leads: (data || []) as LeadRow[], total: count || 0 };
      },
    });
  }, [page, paginatedData?.total, franchiseId, queryClient]);

  // Sort leads by temperature priority
  const sortedLeads = useMemo(() => {
    const leads = paginatedData?.leads || [];
    return [...leads].sort((a, b) => {
      const scoreA = classifyLead(a.respostas_questionario || null, a.pontuacao_quintal);
      const scoreB = classifyLead(b.respostas_questionario || null, b.pontuacao_quintal);
      return scoreA.sortOrder - scoreB.sortOrder;
    });
  }, [paginatedData?.leads]);

  const totalCount = paginatedData?.total || 0;
  const franchiseSlug = franchiseInfo?.slug_url || null;
  const franchiseName = franchiseInfo?.nome_franquia || '';

  // ── Time-filtered KPIs with comparison (use lightweight kpiLeads) ──
  const { current: currentLeads, previous: previousLeads } = useMemo(
    () => filterByTimeRange(kpiLeads as any[], timeRange),
    [kpiLeads, timeRange],
  );

  const totalLeads = currentLeads.length;
  const newLeads = currentLeads.filter(l => l.status_lead === 'novo').length;
  const inNegotiation = currentLeads.filter(l => l.status_lead === 'em_negociacao').length;
  const sold = currentLeads.filter(l => l.status_lead === 'vendido').length;

  const prevTotal = previousLeads.length || undefined;
  const prevNew = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'novo').length : undefined;
  const prevNeg = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'em_negociacao').length : undefined;
  const prevSold = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'vendido').length : undefined;

  const now = new Date();
  const soldThisMonth = kpiLeads.filter(l => {
    if (l.status_lead !== 'vendido') return false;
    const d = new Date(l.updated_at || l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Overdue leads alert (use kpiLeads)
  const overdueLeads = useMemo(() => {
    const nowMs = Date.now();
    return kpiLeads.filter(l => {
      if (l.status_lead !== 'novo') return false;
      return (nowMs - new Date(l.created_at).getTime()) > 48 * 60 * 60 * 1000;
    });
  }, [kpiLeads]);

  const metrics: MetricCardProps[] = [
    { icon: Users, label: 'Total de Leads', value: totalLeads, previousValue: prevTotal, color: 'text-primary' },
    { icon: Clock, label: 'Novos', value: newLeads, previousValue: prevNew, color: 'text-secondary' },
    { icon: TrendingUp, label: 'Em Negociação', value: inNegotiation, previousValue: prevNeg, color: 'text-violet-600' },
    { icon: Droplets, label: 'Vendidos', value: sold, previousValue: prevSold, color: 'text-emerald-600' },
  ];

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isLoading = authLoading || loadingTable;

  const leadDetailPath = embedded ? '/admin/lead' : '/painel/lead';

  const content = (
    <>
      <WelcomeWizard franchiseName={franchiseName || undefined} />
      {franchiseSlug && <FranchiseLinkBanner slug={franchiseSlug} />}

      {/* Time Range + KPIs */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <SectionHeader icon={BarChart3} title="Visão Geral" subtitle={timeRange === 'all' ? 'Todo o período' : `Últimos ${timeRange} dias`} />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div data-tour="kpi-grid"><MetricGrid metrics={metrics} loading={loadingKpis} columns={4} /></div>

      {/* Insight Surfacing */}
      {!loadingKpis && currentLeads.length > 0 && (
        <InsightCards leads={currentLeads} previousLeads={previousLeads} maxCards={3} />
      )}

      {/* Alerts */}
      {overdueLeads.length > 0 && (
        <div className="mb-4 sm:mb-6">
           <AlertBanner
            level="warning"
            title={`${overdueLeads.length} lead${overdueLeads.length > 1 ? 's' : ''} sem contato há mais de 48h`}
            description="Quanto mais rápido você responder, maior a chance de fechar. Ligue ou mande WhatsApp agora!"
            action={
              <Button variant="outline" size="sm" className="rounded-xl text-xs shrink-0" onClick={() => setActiveTab('leads')}>
                Ver leads
              </Button>
            }
          />
        </div>
      )}

      {/* Onboarding Checklist for new franchisees */}
      {showOnboarding && franchiseId && <OnboardingChecklist franchiseId={franchiseId} />}
      {showOnboarding && franchiseId && franchiseInfo?.nome_franquia && (
        <FirstAccessModal franchiseId={franchiseId} franchiseName={franchiseInfo.nome_franquia} />
      )}


      {loadingKpis ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-10 h-10 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-3 w-24 rounded-full" />
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                </div>
                <div className="skeleton h-2 w-full rounded-full" />
                <div className="skeleton h-3 w-32 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : franchiseId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SLAIndicator leads={kpiLeads as any[]} activities={leadActivities} />
          <MonthlyGoals franchiseId={franchiseId} soldThisMonth={soldThisMonth} />
          <LeadFollowups franchiseId={franchiseId} />
        </div>
      )}

      {/* Conversion Funnel */}
      {loadingKpis ? (
        <Card className="border-border/50 mb-6">
          <CardContent className="p-5 space-y-4">
            <div className="skeleton h-4 w-32 rounded-full" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-3 w-20 rounded-full" />
                  <div className="skeleton h-8 rounded-lg flex-1" style={{ maxWidth: `${100 - i * 20}%` }} />
                  <div className="skeleton h-3 w-10 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : kpiLeads.length > 0 && <ConversionFunnel leads={kpiLeads as any[]} />}

      {/* Tab switcher — mobile only (desktop uses sidebar) */}
      <div className="flex gap-1 mb-6 bg-muted/60 backdrop-blur-sm rounded-2xl p-1.5 w-full overflow-x-auto scrollbar-none border border-border/30 md:hidden" role="tablist">
        {[
          { key: 'leads' as const, icon: Users, label: 'Leads', tour: 'tab-leads' },
          { key: 'funnel' as const, icon: Workflow, label: 'Funil', tour: 'tab-funnel' },
          { key: 'propostas' as const, icon: FileText, label: 'Propostas', tour: 'tab-propostas' },
          { key: 'pos-venda' as const, icon: Package, label: 'Pos-venda', tour: 'tab-pos-venda' },
          { key: 'achievements' as const, icon: TrendingUp, label: 'Metas', tour: 'tab-achievements' },
          { key: 'reports' as const, icon: BarChart3, label: 'Relatorios', tour: 'tab-reports' },
        ].map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            data-tour={tab.tour}
            onClick={() => {
              if (tab.key === 'propostas') { navigate('/propostas'); return; }
              setActiveTab(tab.key as FranchiseTab);
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 whitespace-nowrap min-h-[44px] flex items-center justify-center gap-2 active:scale-[0.97] ${activeTab === tab.key ? 'tab-active shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
          >
            <tab.icon className={`w-[18px] h-[18px] ${activeTab === tab.key ? 'text-primary' : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'leads' && (
          <motion.div
            key="leads"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {franchiseError && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
                <p className="font-medium">Erro ao carregar dados. Verifique sua conexão.</p>
                <button
                  type="button"
                  onClick={() => refetchFranchise()}
                  className="shrink-0 underline underline-offset-2 hover:no-underline font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Leads Recentes ({totalCount})</span>
                  {overdueLeads.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 animate-pulse">
                      ⚠️ {overdueLeads.length} aguardando
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  isMobile ? (
                    <MobileLeadSkeleton />
                  ) : (
                    <TableSkeleton rows={8} cols={6} />
                  )
                ) : totalCount === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-16 px-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <Inbox className="w-10 h-10 text-primary/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lead ainda</h3>
                     <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                       Seus leads aparecerão aqui assim que os primeiros clientes responderem ao quiz. Compartilhe seu link nas redes sociais e WhatsApp para começar a receber leads!
                     </p>
                    {franchiseSlug && (
                      <Button variant="outline" className="gap-2 rounded-xl" onClick={() => {
                        navigator.clipboard.writeText(`${SITE_URL}/${franchiseSlug}`);
                        toast.success('Link copiado!');
                      }}>
                        <Copy className="w-4 h-4" />
                        Copiar link
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {isMobile ? (
                      <div className="space-y-3">
                        {sortedLeads.map((lead, i) => (
                          <MobileLeadCard key={lead.id} lead={lead} index={i} basePath={leadDetailPath} />
                        ))}
                      </div>
                    ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" role="table">
                        <thead>
                          <tr className="border-b border-border/50" role="row">
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Temp.</th>
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Quintal</th>
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                            <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedLeads.map(lead => {
                            const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
                            const isOverdue = lead.status_lead === 'novo' && (Date.now() - new Date(lead.created_at).getTime()) > 48 * 60 * 60 * 1000;
                            const score = lead.pontuacao_quintal || 0;
                            const scoreEmoji = score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴';
                            const scoreLabel = score >= 70 ? 'Ótimo' : score >= 40 ? 'Bom' : 'Baixo';
                            return (
                              <tr key={lead.id} className={`border-b border-border/20 hover:bg-muted/40 transition-all cursor-pointer group ${isOverdue ? 'bg-amber-500/[0.03]' : ''}`} role="row" onClick={() => navigate(`${leadDetailPath}/${lead.id}`)}>
                                <td role="cell" className="py-3.5 px-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    {lead.nome || '—'}
                                    {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                                  </div>
                                </td>
                                <td role="cell" className="py-3.5 px-3">
                                  <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                                    {temp.emoji} {temp.label}
                                  </Badge>
                                </td>
                                <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.cidade || '—'}</td>
                                <td role="cell" className="py-3.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{scoreEmoji} {scoreLabel}</span>
                                  </div>
                                </td>
                                <td role="cell" className="py-3.5 px-3">
                                  <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-xs font-medium`} variant="secondary">
                                    {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                                  </Badge>
                                </td>
                                <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td role="cell" className="py-3.5 px-3">
                                  <Button size="sm" variant="ghost" onClick={() => navigate(`${leadDetailPath}/${lead.id}`)} className="rounded-lg" aria-label="Ver detalhes do lead">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )}

                     {totalCount > PAGE_SIZE && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border/30">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {from + 1}–{Math.min(to, totalCount)} de {totalCount}
                        </p>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl min-h-[44px] text-xs flex-1 sm:flex-none">
                            Anterior
                          </Button>
                          <span className="flex items-center justify-center text-xs text-muted-foreground px-3 min-w-[48px]">
                            {page}/{totalPages}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="rounded-xl min-h-[44px] text-xs flex-1 sm:flex-none">
                            Próximo
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'funnel' && (
          <motion.div
            key="funnel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <KanbanBoard
              leads={allLeads as (LeadRow & { respostas_questionario?: Record<string, string> | null })[]}
              franchiseId={franchiseId!}
              basePath={leadDetailPath}
            />
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {franchiseId && <AchievementsDashboard franchiseId={franchiseId} leads={allLeads} />}
          </motion.div>
        )}

        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <FranchiseReports leads={allLeads} />
          </motion.div>
        )}

        {activeTab === 'pos-venda' && franchiseId && (
          <motion.div
            key="pos-venda"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <PostSaleDashboard franchiseId={franchiseId} basePath={leadDetailPath} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Breadcrumbs className="md:hidden" items={[{ label: 'Franquia' }]} />
        {content}
      </div>
    </div>
    </PageTransition>
  );
}
