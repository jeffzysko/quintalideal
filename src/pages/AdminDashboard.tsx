import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Building2, MapPin, Download, BarChart3, Target, Activity, Mail, Eye, Share2, Globe, Kanban, CalendarClock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AdminLeadFilters } from '@/components/admin/AdminLeadFilters';
import { AdminLeadsTable } from '@/components/admin/AdminLeadsTable';
import { AdminInactiveAlerts } from '@/components/admin/AdminInactiveAlerts';
import { AdminPerformanceComparison } from '@/components/admin/AdminPerformanceComparison';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { STATUS_LABELS, LeadRow } from '@/lib/lead-constants';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { PanelHeader } from '@/components/PanelHeader';
import { MetricGrid } from '@/components/dashboard/MetricGrid';
import { TimeRangeSelector, filterByTimeRange, type TimeRange } from '@/components/dashboard/TimeRangeSelector';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import type { MetricCardProps } from '@/components/dashboard/MetricCard';
import { InsightCards } from '@/components/dashboard/InsightCards';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';

// Lazy load heavy tab components
const AdminCityRanking = lazy(() => import('@/components/admin/AdminCityRanking').then(m => ({ default: m.AdminCityRanking })));
const AdminFranchiseRanking = lazy(() => import('@/components/admin/AdminFranchiseRanking').then(m => ({ default: m.AdminFranchiseRanking })));
const AdminReferralMetrics = lazy(() => import('@/components/admin/AdminReferralMetrics').then(m => ({ default: m.AdminReferralMetrics })));
const AdminAnalytics = lazy(() => import('@/components/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminFranchiseManager = lazy(() => import('@/components/admin/AdminFranchiseManager').then(m => ({ default: m.AdminFranchiseManager })));
const AdminEmailTemplates = lazy(() => import('@/components/admin/AdminEmailTemplates').then(m => ({ default: m.AdminEmailTemplates })));
const AdminUserManager = lazy(() => import('@/components/admin/AdminUserManager').then(m => ({ default: m.AdminUserManager })));
const AdminCityManager = lazy(() => import('@/components/admin/AdminCityManager').then(m => ({ default: m.AdminCityManager })));
const KanbanBoard = lazy(() => import('@/components/franchise/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const FranchiseDashboard = lazy(() => import('@/pages/FranchiseDashboard'));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut: _signOut, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'kanban' | 'analytics' | 'franchises' | 'cities' | 'users' | 'emails' | 'franchise-view'>(() => {
    const urlTab = new URLSearchParams(location.search).get('tab');
    if (urlTab === 'leads') return 'leads';
    if (urlTab === 'kanban') return 'kanban';
    return 'overview';
  });
  const [viewFranchiseId, setViewFranchiseId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

  // Global org filter from Organization Switcher
  const [orgFilter, setOrgFilter] = useState<string | null>(null);

  const [filterFranquia, setFilterFranquia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModelo, setFilterModelo] = useState('all');
  const [filterTemperatura, setFilterTemperatura] = useState('all');
  const [page, setPage] = useState(1);

  // Sync leads tab franchise filter when org switcher changes
  useEffect(() => {
    setFilterFranquia(orgFilter || 'all');
    setPage(1);
  }, [orgFilter]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cidadeInput, setCidadeInput] = useState('');
  const [filterCidade, setFilterCidade] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => { setFilterCidade(cidadeInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [cidadeInput]);

  useEffect(() => { setPage(1); }, [filterFranquia, filterStatus, filterModelo, filterTemperatura]);

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

  // ── All leads (last 12 months — bounded, replaces unlimited waterfall) ──
  const { data: allLeads = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['admin-leads-all'],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, updated_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, respostas_questionario, lead_origin')
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as LeadRow[];
    },
    staleTime: 3 * 60 * 1000,
  });

  // ── Paginated leads for table ──
  const { data: paginatedData, isLoading: loadingTable } = useQuery({
    queryKey: ['admin-leads-table', page, search, filterFranquia, filterStatus, filterModelo, filterCidade, filterTemperatura],
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, lead_origin, respostas_questionario', { count: 'exact' });

      if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
      if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus as any);
      if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
      if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
      if (search) query = query.ilike('nome', `%${search}%`);
      // Server-side temperature filter using the computed column
      if (filterTemperatura !== 'all') query = query.eq('temperatura', filterTemperatura);

      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      return { leads: (data || []) as LeadRow[], total: count || 0 };
    },
  });

  const leads = paginatedData?.leads || [];
  const totalCount = paginatedData?.total || 0;

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

  const exportCSV = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, lead_origin');

      if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
      if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus as any);
      if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
      if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
      if (search) query = query.ilike('nome', `%${search}%`);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      const exportLeads = (data || []) as LeadRow[];

      const headers = ['Nome', 'Telefone', 'Email', 'Cidade', 'Franquia Atribuída', 'Franquia Origem', 'Pontuação', 'Modelo', 'Status', 'Territorial', 'Referência', 'Data'];
      const rows = exportLeads.map(l => [
        l.nome || '', l.telefone || '', l.email || '', l.cidade || '',
        l.franquia_id ? (franchiseMap[l.franquia_id] || '') : '',
        l.origin_franchise_id ? (franchiseMap[l.origin_franchise_id] || '') : '',
        String(l.pontuacao_quintal || 0), l.modelo_recomendado || '',
        STATUS_LABELS[l.status_lead] || l.status_lead,
        l.territory_match_status || '',
        l.referred_by || '',
        new Date(l.created_at).toLocaleDateString('pt-BR'),
      ]);
      const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-splash-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      toast.error('Erro ao exportar CSV.');
    }
  };

  const totalLeads = currentLeads.length;
  const newLeads = currentLeads.filter(l => l.status_lead === 'novo').length;
  const cities = new Set(currentLeads.map(l => l.cidade).filter(Boolean)).size;
  const avgScore = totalLeads > 0 ? Math.round(currentLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads) : 0;
  const referralCount = currentLeads.filter(l => l.referred_by).length;

  const prevTotal = previousLeads.length || undefined;
  const prevNew = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'novo').length : undefined;
  const prevCities = previousLeads.length > 0 ? new Set(previousLeads.map(l => l.cidade).filter(Boolean)).size : undefined;
  const prevAvg = previousLeads.length > 0 ? Math.round(previousLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / previousLeads.length) : undefined;
  const prevRef = previousLeads.length > 0 ? previousLeads.filter(l => l.referred_by).length : undefined;

  const kpis: MetricCardProps[] = [
    { icon: Users, label: 'Quintais explorados', value: totalLeads, previousValue: prevTotal, color: 'text-primary' },
    { icon: TrendingUp, label: 'Novos leads', value: newLeads, previousValue: prevNew, color: 'text-emerald-600' },
    { icon: Target, label: 'Média potencial', value: `${avgScore}%`, previousValue: prevAvg, color: 'text-primary' },
    { icon: Building2, label: 'Franquias', value: orgFilteredFranchises.length, color: 'text-violet-600' },
    { icon: MapPin, label: 'Cidades', value: cities, previousValue: prevCities, color: 'text-amber-600' },
    { icon: Share2, label: 'Via convite', value: referralCount, previousValue: prevRef, color: 'text-secondary' },
  ];

  const TABS = [
    { key: 'overview' as const, icon: BarChart3, label: 'Inteligência' },
    { key: 'analytics' as const, icon: Activity, label: 'Analytics' },
    { key: 'leads' as const, icon: Users, label: 'Leads' },
    { key: 'kanban' as const, icon: Kanban, label: 'Funil Geral' },
    { key: 'franchises' as const, icon: Building2, label: 'Franquias' },
    { key: 'cities' as const, icon: Globe, label: 'Territórios' },
    { key: 'users' as const, icon: Users, label: 'Usuários' },
    ...(role === 'super_admin' ? [
      { key: 'emails' as const, icon: Mail, label: 'E-mails' },
      { key: 'franchise-view' as const, icon: Eye, label: 'Visão Franquia' },
    ] : []),
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-bottomnav">
      <PanelHeader title="Fábrica">
        {[
          { icon: CalendarClock, label: 'Hoje', action: () => navigate('/hoje') },
          { icon: Target, label: 'Radar', action: () => navigate('/admin/radar') },
          { icon: MapPin, label: 'Mapa', action: () => navigate('/mapa') },
          { icon: Download, label: 'CSV', action: exportCSV },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={item.label}
          >
            <item.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
        
        <div className="h-5 w-px bg-border/40 mx-0.5 sm:mx-1" />
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-between gap-3 mb-2">
          <Breadcrumbs items={[{ label: 'Admin' }]} />
          {['overview', 'leads', 'kanban'].includes(activeTab) && (
            <OrganizationSwitcher
              activeFranchiseId={orgFilter}
              onSwitch={(id) => {
                setOrgFilter(id);
                setFilterFranquia(id || 'all');
                setPage(1);
              }}
              compact
            />
          )}
        </div>
        {/* Mobile: Select dropdown */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
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

        {/* Desktop: Scrollable tab bar */}
        <div className="hidden md:block mb-8">
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-1 bg-muted/60 backdrop-blur-sm rounded-2xl p-1.5 w-fit border border-border/30" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.key ? 'tab-active' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
                >
                  <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.key ? 'text-primary' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Time range + KPIs */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <SectionHeader icon={BarChart3} title="Métricas" subtitle={timeRange === 'all' ? 'Todo o período' : `Últimos ${timeRange} dias vs período anterior`} />
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>

            <MetricGrid metrics={kpis} loading={loadingKpis} columns={6} />

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
                <AdminCityRanking leads={orgFilteredLeads} />
                <AdminFranchiseRanking leads={orgFilteredLeads} franchiseMap={franchiseMap} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <AdminReferralMetrics leads={orgFilteredLeads} />
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
          </>
        )}

        {activeTab === 'analytics' && (
          <Suspense fallback={<TabFallback />}>
            <AdminAnalytics franchiseMap={franchiseMap} role={role} />
          </Suspense>
        )}

        {activeTab === 'leads' && (
          <>
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
            {loadingTable ? (
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
                onPageChange={setPage}
                isLoading={false}
                franchiseMap={franchiseMap}
              />
            )}
          </>
        )}

        {activeTab === 'kanban' && (
          <Suspense fallback={<TabFallback />}>
            <KanbanBoard
              leads={orgFilteredLeads as any}
              franchiseId="admin"
              basePath="/admin/lead"
              franchiseMap={franchiseMap}
            />
          </Suspense>
        )}

        {activeTab === 'franchises' && <Suspense fallback={<TabFallback />}><AdminFranchiseManager /></Suspense>}
        {activeTab === 'cities' && <Suspense fallback={<TabFallback />}><AdminCityManager /></Suspense>}
        {activeTab === 'users' && <Suspense fallback={<TabFallback />}><AdminUserManager /></Suspense>}
        {activeTab === 'emails' && <Suspense fallback={<TabFallback />}><AdminEmailTemplates /></Suspense>}

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
