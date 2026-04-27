import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, Building2, MapPin, BarChart3, Target, Activity, Mail, Eye, Globe, Kanban, MessageCircle, FileText, ShieldAlert, Gauge, BarChart2, ShieldCheck as GPSIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/PageHeader';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AdminLeadFilters } from '@/components/admin/AdminLeadFilters';
import { AdminLeadsTable } from '@/components/admin/AdminLeadsTable';
import { AdminInactiveAlerts } from '@/components/admin/AdminInactiveAlerts';
import { AdminPerformanceComparison } from '@/components/admin/AdminPerformanceComparison';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { LeadRow } from '@/lib/lead-constants';
import { classifyLead } from '@/lib/leadScoring';
import { MetricGrid } from '@/components/dashboard/MetricGrid';
import { TimeRangeSelector, filterByTimeRange, type TimeRange } from '@/components/dashboard/TimeRangeSelector';
import { SectionHeader, SectionHeader as PageSectionHeader } from '@/components/SectionHeader';
import type { MetricCardProps } from '@/components/dashboard/MetricCard';
import { InsightCards } from '@/components/dashboard/InsightCards';
import { ExecutiveSummary } from '@/components/admin/ExecutiveSummary';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';
import { AdminWelcomeWizard } from '@/components/admin/AdminWelcomeWizard';
// Lazy load heavy tab components
// AdminCityRanking moved to Performance QI tab
const AdminFranchiseRanking = lazy(() => import('@/components/admin/AdminFranchiseRanking').then(m => ({ default: m.AdminFranchiseRanking })));
const AdminAchievementRanking = lazy(() => import('@/components/admin/AdminAchievementRanking').then(m => ({ default: m.AdminAchievementRanking })));
// AdminReferralMetrics removed — referral system no longer active
const AdminAnalytics = lazy(() => import('@/components/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminFranchiseManager = lazy(() => import('@/components/admin/AdminFranchiseManager').then(m => ({ default: m.AdminFranchiseManager })));
const AdminEmailTemplates = lazy(() => import('@/components/admin/AdminEmailTemplates').then(m => ({ default: m.AdminEmailTemplates })));
const AdminWhatsAppTemplates = lazy(() => import('@/components/admin/AdminWhatsAppTemplates').then(m => ({ default: m.AdminWhatsAppTemplates })));
const AdminUserManager = lazy(() => import('@/components/admin/AdminUserManager').then(m => ({ default: m.AdminUserManager })));
const AdminCityManager = lazy(() => import('@/components/admin/AdminCityManager').then(m => ({ default: m.AdminCityManager })));
const KanbanBoard = lazy(() => import('@/components/franchise/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
// AdminProfileDistribution moved to Performance QI tab
const FranchiseDashboard = lazy(() => import('@/pages/FranchiseDashboard'));
const PerformanceQI = lazy(() => import('@/components/admin/PerformanceQI').then(m => ({ default: m.PerformanceQI })));
const AdminLeadsReadOnly = lazy(() => import('@/components/admin/AdminLeadsReadOnly').then(m => ({ default: m.AdminLeadsReadOnly })));
const AdminApplications = lazy(() => import('@/components/admin/AdminApplications').then(m => ({ default: m.AdminApplications })));
const AdminErrorLogs = lazy(() => import('@/components/admin/AdminErrorLogs').then(m => ({ default: m.AdminErrorLogs })));
const AdminCronJobs = lazy(() => import('@/components/admin/AdminCronJobs').then(m => ({ default: m.AdminCronJobs })));
const PerformanceAuditPage = lazy(() => import('@/pages/PerformanceAudit'));
const RelatorioCRMPage = lazy(() => import('@/pages/RelatorioCRM'));
const LocationAuditSection = lazy(() => import('@/components/admin/LocationAuditSection').then(m => ({ default: m.LocationAuditSection })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

const PAGE_SIZE = 25;

const getAdminTabFromSearch = (search: string): 'overview' | 'leads' | 'kanban' | 'analytics' | 'performance-qi' | 'franchises' | 'cities' | 'users' | 'emails' | 'whatsapp' | 'franchise-view' | 'candidaturas' | 'errors' | 'location-audit' => {
  const urlTab = new URLSearchParams(search).get('tab');
  if (urlTab === 'leads') return 'leads';
  if (urlTab === 'kanban') return 'kanban';
  if (urlTab === 'analytics') return 'analytics';
  if (urlTab === 'performance-qi') return 'performance-qi';
  if (urlTab === 'franchises') return 'franchises';
  if (urlTab === 'cities') return 'cities';
  if (urlTab === 'users') return 'users';
  if (urlTab === 'emails') return 'emails';
  if (urlTab === 'whatsapp') return 'whatsapp';
  if (urlTab === 'franchise-view') return 'franchise-view';
  if (urlTab === 'candidaturas') return 'candidaturas';
  if (urlTab === 'errors') return 'errors';
  if (urlTab === 'location-audit') return 'location-audit';
  return 'overview';
};

const getLeadListPageFromSearch = (search: string) => {
  const rawPage = Number(new URLSearchParams(search).get('page') || '1');
  return Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Live updates: invalidates queries when leads change in the DB
  useLeadsRealtime();
  const { signOut: _signOut, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'kanban' | 'analytics' | 'performance-qi' | 'franchises' | 'cities' | 'users' | 'emails' | 'whatsapp' | 'franchise-view' | 'candidaturas' | 'errors' | 'location-audit'>(() => getAdminTabFromSearch(location.search));

  // Sync activeTab when URL changes externally (e.g. sidebar navigation)
  useEffect(() => {
    const tabFromUrl = getAdminTabFromSearch(location.search);
    setActiveTab(tabFromUrl);
  }, [location.search]);
  const [viewFranchiseId, setViewFranchiseId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  // Org filter (used inside the Relatórios sub-tab of Analytics only)
  const [orgFilter, setOrgFilter] = useState<string | null>(null);

  // Active sub-tab inside Analytics (controls PageHeader title)
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'analytics' | 'performance-qi' | 'relatorios' | 'audit'>('analytics');

  const [filterFranquia, setFilterFranquia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModelo, setFilterModelo] = useState('all');
  const [filterTemperatura, setFilterTemperatura] = useState('all');
  const [page, setPage] = useState(() => getLeadListPageFromSearch(location.search));
  const didInitSearch = useRef(false);
  const didInitCity = useRef(false);
  const didInitFilters = useRef(false);

  const updateLeadListPage = (nextPage: number) => {
    const safePage = Math.max(1, nextPage);
    setPage(safePage);

    if (activeTab !== 'leads') return;

    const params = new URLSearchParams(location.search);
    params.set('tab', 'leads');
    params.set('page', String(safePage));
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const handleAdminTabChange = (nextTab: typeof activeTab) => {
    setActiveTab(nextTab);

    const params = new URLSearchParams(location.search);
    if (nextTab === 'overview') {
      params.delete('tab');
      params.delete('page');
    } else {
      params.set('tab', nextTab);
      if (nextTab === 'leads') {
        params.set('page', String(page));
      } else {
        params.delete('page');
      }
    }

    const nextSearch = params.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
  };

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cidadeInput, setCidadeInput] = useState('');
  const [filterCidade, setFilterCidade] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!didInitSearch.current) {
        didInitSearch.current = true;
        return;
      }
      setSearch(searchInput);
      updateLeadListPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!didInitCity.current) {
        didInitCity.current = true;
        return;
      }
      setFilterCidade(cidadeInput);
      updateLeadListPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [cidadeInput]);

  useEffect(() => {
    if (!didInitFilters.current) {
      didInitFilters.current = true;
      return;
    }
    updateLeadListPage(1);
  }, [filterFranquia, filterStatus, filterModelo, filterTemperatura]);

  // ── Franchises ──
  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises-full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('franchises').select('id, nome_franquia, ativa, last_accessed_at, last_lead_activity_at');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // ── Lead activities (limited to last 6 months, max 2000) ──
  const { data: leadActivities = [] } = useQuery({
    queryKey: ['lead-activities-all'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data, error } = await supabase
        .from('lead_activities')
        .select('lead_id, activity_type, created_at')
        .eq('activity_type', 'status_change')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── All leads (last 12 months — batched loading for >1000 rows) ──
  const { data: allLeads = [], isLoading: loadingKpis, isError: kpisError, refetch: refetchKpis } = useQuery({
    queryKey: ['admin-leads-all'],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const BATCH = 1000;
      const allData: LeadRow[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, status_lead, created_at, updated_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin, respostas_questionario, activity_count:lead_activities(count)')
          .gte('created_at', twelveMonthsAgo.toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...(data as LeadRow[]));
        if (data.length < BATCH) break;
        from += BATCH;
      }
      return allData;
    },
    staleTime: 3 * 60 * 1000,
  });

  // ── Paginated leads for table ──
  const { data: paginatedData, isLoading: loadingTable, isFetching: fetchingTable, isError: tableError, refetch: refetchTable } = useQuery({
    queryKey: ['admin-leads-table', page, search, filterFranquia, filterStatus, filterModelo, filterCidade, filterTemperatura],
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    queryFn: async () => {
      // Temperature is computed client-side, so when filtering by temperature
      // we fetch a larger batch and filter in JS to maintain correct pagination
      const isTemperatureFiltered = filterTemperatura !== 'all';
      const from = (page - 1) * PAGE_SIZE;
      const to = isTemperatureFiltered ? from + PAGE_SIZE * 10 - 1 : from + PAGE_SIZE - 1;

      let query: any = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin, respostas_questionario', { count: 'exact' });

      if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
      if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus);
      if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
      if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
      if (search) query = query.ilike('nome', `%${search}%`);

      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      let filteredLeads = (data || []) as LeadRow[];
      let filteredTotal = count || 0;

      if (isTemperatureFiltered) {
        filteredLeads = filteredLeads.filter(l => {
          const temp = classifyLead((l as any).respostas_questionario || null, l.pontuacao_quintal);
          return temp.temperature === filterTemperatura;
        });
        filteredTotal = filteredLeads.length;
        filteredLeads = filteredLeads.slice(0, PAGE_SIZE);
      }

      return { leads: filteredLeads, total: isTemperatureFiltered ? filteredTotal : (count || 0), temperatureFiltered: isTemperatureFiltered };
    },
  });

  const leads = paginatedData?.leads || [];
  const totalCount = paginatedData?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    if (activeTab !== 'leads' || totalPages === 0 || page <= totalPages) return;
    updateLeadListPage(totalPages);
  }, [activeTab, page, totalPages]);

  // Prefetch next page so pagination feels instant
  useEffect(() => {
    if (page >= totalPages) return;
    const nextPage = page + 1;
    queryClient.prefetchQuery({
      queryKey: ['admin-leads-table', nextPage, search, filterFranquia, filterStatus, filterModelo, filterCidade, filterTemperatura],
      staleTime: 60 * 1000,
      queryFn: async () => {
        const isTemperatureFiltered = filterTemperatura !== 'all';
        const from = (nextPage - 1) * PAGE_SIZE;
        const to = isTemperatureFiltered ? from + PAGE_SIZE * 10 - 1 : from + PAGE_SIZE - 1;
        let query: any = supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin, respostas_questionario', { count: 'exact' });
        if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
        if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus);
        if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
        if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
        if (search) query = query.ilike('nome', `%${search}%`);
        const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
        if (error) throw error;
        let filteredLeads = (data || []) as LeadRow[];
        let filteredTotal = count || 0;
        if (isTemperatureFiltered) {
          filteredLeads = filteredLeads.filter(l => {
            const temp = classifyLead((l as any).respostas_questionario || null, l.pontuacao_quintal);
            return temp.temperature === filterTemperatura;
          });
          filteredTotal = filteredLeads.length;
          filteredLeads = filteredLeads.slice(0, PAGE_SIZE);
        }
        return { leads: filteredLeads, total: isTemperatureFiltered ? filteredTotal : (count || 0) };
      },
    });
  }, [page, totalPages, search, filterFranquia, filterStatus, filterModelo, filterCidade, filterTemperatura, queryClient]);

  const franchiseMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach(f => { map[f.id] = f.nome_franquia; });
    return map;
  }, [franchises]);

  // ── Org-filtered leads (global switcher) ──
  const orgFilteredLeads = useMemo(
    () => orgFilter ? allLeads.filter(l => l.franquia_id === orgFilter) : allLeads,
    [allLeads, orgFilter],
  );

  const orgFilteredActivities = useMemo(
    () => {
      if (!orgFilter) return leadActivities;
      const leadIds = new Set(orgFilteredLeads.map(l => l.id));
      return leadActivities.filter(a => leadIds.has(a.lead_id));
    },
    [leadActivities, orgFilteredLeads, orgFilter],
  );

  const orgFilteredFranchises = useMemo(
    () => orgFilter ? franchises.filter(f => f.id === orgFilter) : franchises,
    [franchises, orgFilter],
  );

  // ── Time-filtered KPIs with comparison ──
  const { current: currentLeads, previous: previousLeads } = useMemo(
    () => filterByTimeRange(orgFilteredLeads, timeRange),
    [orgFilteredLeads, timeRange],
  );

  const leadsPerMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    orgFilteredLeads.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort().map(([month, count]) => ({ month, count }));
  }, [orgFilteredLeads]);

  const models = useMemo(() => {
    const set = new Set(orgFilteredLeads.map(l => l.modelo_recomendado).filter(Boolean));
    return Array.from(set) as string[];
  }, [orgFilteredLeads]);


  const totalLeads = currentLeads.length;
  const newLeads = currentLeads.filter(l => l.status_lead === 'novo').length;
  const cities = new Set(currentLeads.map(l => l.cidade).filter(Boolean)).size;
  const avgScore = totalLeads > 0 ? Math.round(currentLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads) : 0;

  const prevTotal = previousLeads.length || undefined;
  const prevNew = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'novo').length : undefined;
  const prevCities = previousLeads.length > 0 ? new Set(previousLeads.map(l => l.cidade).filter(Boolean)).size : undefined;
  const prevAvg = previousLeads.length > 0 ? Math.round(previousLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / previousLeads.length) : undefined;

  const kpis: MetricCardProps[] = [
    { icon: Users, label: 'Quintais explorados', value: totalLeads, previousValue: prevTotal, color: 'text-primary', tooltip: 'Total de leads gerados pelo quiz no período selecionado.' },
    { icon: TrendingUp, label: 'Novos leads', value: newLeads, previousValue: prevNew, color: 'text-emerald-600', tooltip: 'Leads com status "Novo" que ainda não foram contatados.' },
    { icon: Target, label: 'Média potencial', value: `${avgScore}%`, previousValue: prevAvg, color: 'text-primary', tooltip: 'Média da pontuação do Índice do Quintal de todos os leads no período.' },
    { icon: Building2, label: 'Franquias', value: orgFilteredFranchises.length, color: 'text-violet-600', tooltip: 'Quantidade de franquias ativas no sistema.' },
    { icon: MapPin, label: 'Cidades', value: cities, previousValue: prevCities, color: 'text-amber-600', tooltip: 'Número de cidades distintas de onde vieram leads no período.' },
  ];

  const isSuperAdmin = role === 'super_admin';

  // Pending applications count for badge
  const { data: pendingAppCount = 0 } = useQuery({
    queryKey: ['pending-applications-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('franchise_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
    staleTime: 30_000,
  });

  const TABS = [
    { key: 'overview' as const, icon: BarChart3, label: 'Inteligência' },
    { key: 'analytics' as const, icon: Activity, label: 'Analytics' },
    { key: 'leads' as const, icon: Users, label: 'Leads' },
    ...(isSuperAdmin ? [
      { key: 'kanban' as const, icon: Kanban, label: 'Funil Geral' },
    ] : []),
    { key: 'franchises' as const, icon: Building2, label: 'Franquias' },
    { key: 'cities' as const, icon: Globe, label: 'Territórios' },
    ...(isSuperAdmin ? [
      { key: 'candidaturas' as const, icon: FileText, label: pendingAppCount > 0 ? `Candidaturas (${pendingAppCount})` : 'Candidaturas' },
      { key: 'users' as const, icon: Users, label: 'Usuários' },
      { key: 'emails' as const, icon: Mail, label: 'E-mails' },
      { key: 'whatsapp' as const, icon: MessageCircle, label: 'WhatsApp' },
      { key: 'errors' as const, icon: ShieldAlert, label: 'Erros' },
      { key: 'location-audit' as const, icon: GPSIcon, label: 'Auditoria GPS' },
      { key: 'franchise-view' as const, icon: Eye, label: 'Visão Franquia' },
    ] : []),
  ];

  const ANALYTICS_SUB_HEADER: Record<typeof analyticsSubTab, { title: string; subtitle: string }> = {
    analytics: { title: 'Analytics', subtitle: 'Métricas de produto e funil de conversão' },
    'performance-qi': { title: 'Performance QI', subtitle: 'Análise de qualidade e indicadores' },
    relatorios: { title: 'Relatórios', subtitle: 'KPIs e gráficos do período' },
    audit: { title: 'Performance Audit', subtitle: 'Auditoria técnica de performance' },
  };

  const HEADER_BY_TAB: Record<typeof activeTab, { title: string; subtitle: string }> = {
    overview: { title: 'Dashboard', subtitle: 'Visão geral da plataforma' },
    analytics: ANALYTICS_SUB_HEADER[analyticsSubTab],
    'performance-qi': { title: 'Performance QI', subtitle: 'Análise de qualidade e indicadores' },
    leads: {
      title: 'Leads',
      subtitle: isSuperAdmin ? 'Todos os leads da plataforma' : 'Leads atribuídos à sua operação',
    },
    kanban: { title: 'Funil', subtitle: 'Pipeline visual de leads em andamento' },
    franchises: { title: 'Franquias', subtitle: 'Gerencie todas as unidades' },
    cities: { title: 'Territórios', subtitle: 'Cobertura por cidade e atribuição de leads' },
    users: { title: 'Usuários', subtitle: 'Contas e permissões' },
    emails: { title: 'E-mails', subtitle: 'Templates de comunicação transacional' },
    whatsapp: { title: 'WhatsApp', subtitle: 'Gestão de instâncias e planos' },
    candidaturas: { title: 'Candidaturas', subtitle: 'Solicitações de novas franquias' },
    errors: { title: 'Logs de Erro', subtitle: 'Monitoramento de falhas' },
    'location-audit': { title: 'Auditoria GPS', subtitle: 'Acompanhamento de detecção automática de cidade' },
    'franchise-view': { title: 'Visão Franquia', subtitle: 'Inspecione o painel de uma unidade específica' },
  };
  const activeHeader = HEADER_BY_TAB[activeTab];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-[var(--bottom-nav-height)] md:pb-12">
      <AdminWelcomeWizard />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Page header — always first, sticky above filters and tabs */}
        {activeHeader && (
          <PageSectionHeader title={activeHeader.title} subtitle={activeHeader.subtitle} />
        )}

        <div className="md:hidden mb-3">
          <Breadcrumbs items={[{ label: 'Admin' }]} />
        </div>
        {/* Mobile: Select dropdown (desktop uses sidebar) */}
        <div className="md:hidden mb-4 relative z-10">
          <Select value={activeTab} onValueChange={(v) => handleAdminTabChange(v as typeof activeTab)}>
            <SelectTrigger className="w-full bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map(tab => (
                <SelectItem key={tab.key} value={tab.key}>
                  <span className="flex items-center gap-2">
                    <tab.icon className="w-4 h-4 text-muted-foreground" />
                    {tab.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Time range + KPIs */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <SectionHeader variant="section" icon={BarChart3} title="Métricas" subtitle={timeRange === 'all' ? 'Todo o período' : `Últimos ${timeRange} dias vs período anterior`} />
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            <div data-tour="admin-kpis"><MetricGrid metrics={kpis} loading={loadingKpis} columns={kpis.length} /></div>

            {/* Executive Summary */}
            {!loadingKpis && currentLeads.length > 0 && (
              <ExecutiveSummary
                currentLeads={currentLeads}
                previousLeads={previousLeads}
                franchiseCount={orgFilteredFranchises.length}
                cityCount={cities}
                franchises={orgFilteredFranchises as any}
              />
            )}

            {/* Insight Surfacing */}
            {!loadingKpis && currentLeads.length > 0 && (
              <InsightCards leads={currentLeads} previousLeads={previousLeads} maxCards={3} />
            )}

            {/* Inactive Alerts */}
            <div className="mb-4 sm:mb-6">
              <AdminInactiveAlerts
                franchises={orgFilteredFranchises as any}
                leads={orgFilteredLeads as any}
              />
            </div>

            {/* Performance Comparison */}
            <div className="mb-4 sm:mb-6">
              <AdminPerformanceComparison
                leads={orgFilteredLeads as any}
                activities={orgFilteredActivities}
                franchiseMap={franchiseMap}
              />
            </div>

            <Suspense fallback={<TabFallback />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <AdminFranchiseRanking leads={orgFilteredLeads} franchiseMap={franchiseMap} />
                <AdminAchievementRanking leads={orgFilteredLeads} franchiseMap={franchiseMap} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Card className="card-premium">
                <CardHeader className="px-3 sm:px-6"><CardTitle className="text-sm font-bold">Leads por Mês</CardTitle></CardHeader>
                <CardContent className="px-2 sm:px-6">
                  {leadsPerMonth.length > 0 ? (
                    <ChartContainer config={{}} className="h-[200px] sm:h-[250px] w-full">
                      <BarChart data={leadsPerMonth} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(207, 90%, 42%)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 text-sm">Sem dados</p>
                  )}
                </CardContent>
              </Card>
            </div>
            </Suspense>

            {/* Cron jobs panel - super admin only */}
            {isSuperAdmin && (
              <div className="mb-4 sm:mb-6">
                <Suspense fallback={<TabFallback />}>
                  <AdminCronJobs />
                </Suspense>
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <>
            <Tabs value={analyticsSubTab} onValueChange={(v) => setAnalyticsSubTab(v as typeof analyticsSubTab)} className="w-full">
            <TabsList className="w-full h-auto rounded-xl bg-muted/50 border border-border/40 p-1 gap-0.5 overflow-x-auto scrollbar-hide flex flex-nowrap justify-start mb-4">
              <TabsTrigger value="analytics" className="shrink-0 gap-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2.5 whitespace-nowrap">
                <Activity className="w-3.5 h-3.5 shrink-0" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="performance-qi" className="shrink-0 gap-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2.5 whitespace-nowrap">
                <Target className="w-3.5 h-3.5 shrink-0" /> Performance QI
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="shrink-0 gap-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2.5 whitespace-nowrap">
                <BarChart2 className="w-3.5 h-3.5 shrink-0" /> Relatórios
              </TabsTrigger>
              <TabsTrigger value="audit" className="shrink-0 gap-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2.5 whitespace-nowrap">
                <Gauge className="w-3.5 h-3.5 shrink-0" /> Performance Audit
              </TabsTrigger>
            </TabsList>
            <TabsContent value="analytics">
              <Suspense fallback={<TabFallback />}>
                <AdminAnalytics franchiseMap={franchiseMap} role={role} />
              </Suspense>
            </TabsContent>
            <TabsContent value="performance-qi">
              <Suspense fallback={<TabFallback />}>
                <PerformanceQI franchiseMap={franchiseMap} franchises={franchises as any} />
              </Suspense>
            </TabsContent>
            <TabsContent value="relatorios">
              <div className="flex items-center justify-end mb-4">
                <OrganizationSwitcher
                  activeFranchiseId={orgFilter}
                  onSwitch={setOrgFilter}
                  compact
                />
              </div>
              <Suspense fallback={<TabFallback />}>
                <RelatorioCRMPage embedded franchiseIdOverride={orgFilter} />
              </Suspense>
            </TabsContent>
            <TabsContent value="audit">
              <Suspense fallback={<TabFallback />}>
                <PerformanceAuditPage />
              </Suspense>
            </TabsContent>
          </Tabs>
          </>
        )}

        {activeTab === 'performance-qi' && (
          <>
            <Suspense fallback={<TabFallback />}>
              <PerformanceQI franchiseMap={franchiseMap} franchises={franchises as any} />
            </Suspense>
          </>
        )}

        {activeTab === 'leads' && isSuperAdmin && (
          <>
            {(kpisError || tableError) && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <p className="font-medium">Erro ao carregar dados. Verifique sua conexão.</p>
                <button
                  type="button"
                  onClick={() => { refetchKpis(); refetchTable(); }}
                  className="shrink-0 underline underline-offset-2 hover:no-underline font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            <AdminLeadFilters
              searchInput={searchInput} onSearchChange={setSearchInput}
              cidadeInput={cidadeInput} onCidadeChange={setCidadeInput}
              filterFranquia={filterFranquia} onFranquiaChange={setFilterFranquia}
              filterStatus={filterStatus} onStatusChange={setFilterStatus}
              filterModelo={filterModelo} onModeloChange={setFilterModelo}
              filterTemperatura={filterTemperatura} onTemperaturaChange={setFilterTemperatura}
              franchises={franchises}
              models={models}
            />
            {loadingTable && !paginatedData ? (
              <Card className="border-border/50 shadow-sm">
                <CardHeader><CardTitle className="text-sm font-semibold">Todos os Leads</CardTitle></CardHeader>
                <CardContent><TableSkeleton rows={10} cols={8} /></CardContent>
              </Card>
            ) : (
              <AdminLeadsTable
                leads={leads}
                totalCount={totalCount}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={(nextPage) => {
                  if (nextPage !== page && !fetchingTable) updateLeadListPage(nextPage);
                }}
                isLoading={false}
                franchiseMap={franchiseMap}
                temperatureFiltered={paginatedData?.temperatureFiltered}
              />
            )}
          </>
        )}

        {activeTab === 'leads' && !isSuperAdmin && (
          <>
            <Suspense fallback={<TabFallback />}>
              <AdminLeadsReadOnly franchiseMap={franchiseMap} franchises={franchises} />
            </Suspense>
          </>
        )}

        {activeTab === 'kanban' && (
          <>
            <Suspense fallback={<TabFallback />}>
              <KanbanBoard
                leads={orgFilteredLeads as any}
                franchiseId="admin"
                basePath="/admin/lead"
                franchiseMap={franchiseMap}
              />
            </Suspense>
          </>
        )}

        {activeTab === 'franchises' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminFranchiseManager /></Suspense>
          </>
        )}
        {activeTab === 'cities' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminCityManager /></Suspense>
          </>
        )}
        {activeTab === 'users' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminUserManager /></Suspense>
          </>
        )}
        {activeTab === 'emails' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminEmailTemplates /></Suspense>
          </>
        )}
        {activeTab === 'whatsapp' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminWhatsAppTemplates /></Suspense>
          </>
        )}
        {activeTab === 'candidaturas' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminApplications /></Suspense>
          </>
        )}
        {activeTab === 'errors' && (
          <>
            <Suspense fallback={<TabFallback />}><AdminErrorLogs franchiseMap={franchiseMap} /></Suspense>
          </>
        )}
        {activeTab === 'location-audit' && (
          <Suspense fallback={<TabFallback />}>
            <LocationAuditSection franchises={franchises} />
          </Suspense>
        )}

        {activeTab === 'franchise-view' && (
          <Suspense fallback={<TabFallback />}>
            <div className="space-y-6">
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Visualizar Dashboard da Franquia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={viewFranchiseId} onValueChange={setViewFranchiseId}>
                    <SelectTrigger className="w-full sm:w-80">
                      <SelectValue placeholder="Selecione uma franquia para visualizar" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...franchises]
                        .sort((a, b) => {
                          const aTest = a.nome_franquia.toLowerCase().includes('teste');
                          const bTest = b.nome_franquia.toLowerCase().includes('teste');
                          if (aTest && !bTest) return -1;
                          if (!aTest && bTest) return 1;
                          return a.nome_franquia.localeCompare(b.nome_franquia, 'pt-BR');
                        })
                        .map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {viewFranchiseId && (
                <FranchiseDashboard overrideFranchiseId={viewFranchiseId} embedded />
              )}
            </div>
          </Suspense>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
