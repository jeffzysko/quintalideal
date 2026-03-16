import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Building2, MapPin, Download, BarChart3, Target, Activity, Mail, Eye, Share2, Globe, Kanban } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FranchiseDashboard from '@/pages/FranchiseDashboard';
import { useNavigate, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AdminCityRanking } from '@/components/admin/AdminCityRanking';
import { AdminFranchiseRanking } from '@/components/admin/AdminFranchiseRanking';
import { AdminReferralMetrics } from '@/components/admin/AdminReferralMetrics';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminFranchiseManager } from '@/components/admin/AdminFranchiseManager';
import { AdminEmailTemplates } from '@/components/admin/AdminEmailTemplates';
import { AdminUserManager } from '@/components/admin/AdminUserManager';
import { AdminCityManager } from '@/components/admin/AdminCityManager';
import { AdminKPICards } from '@/components/admin/AdminKPICards';
import { AdminLeadFilters } from '@/components/admin/AdminLeadFilters';
import { AdminLeadsTable } from '@/components/admin/AdminLeadsTable';
import { AdminInactiveAlerts } from '@/components/admin/AdminInactiveAlerts';
import { AdminPerformanceComparison } from '@/components/admin/AdminPerformanceComparison';
import { KanbanBoard } from '@/components/franchise/KanbanBoard';


import { KPISkeleton } from '@/components/ui/kpi-skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { STATUS_LABELS, LeadRow } from '@/lib/lead-constants';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { PanelHeader } from '@/components/PanelHeader';

const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut: _signOut, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'kanban' | 'analytics' | 'franchises' | 'cities' | 'users' | 'emails' | 'franchise-view'>(() =>
    new URLSearchParams(location.search).get('tab') === 'leads' ? 'leads' : 'overview'
  );
  const [viewFranchiseId, setViewFranchiseId] = useState<string>('');

  const [filterFranquia, setFilterFranquia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModelo, setFilterModelo] = useState('all');
  const [page, setPage] = useState(1);

  // Debounced inputs
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

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterFranquia, filterStatus, filterModelo]);

  // ── Franchises (full for alerts) ──
  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises-full'],
    queryFn: async () => {
      const { data, error } = await supabase.from('franchises').select('id, nome_franquia, ativa, last_accessed_at, last_lead_activity_at');
      if (error) throw error;
      return data || [];
    },
  });


  // ── Lead activities for performance comparison ──
  const { data: leadActivities = [] } = useQuery({
    queryKey: ['lead-activities-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('lead_id, activity_type, created_at')
        .eq('activity_type', 'status_change')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // ── All leads for KPIs/charts (lightweight columns only) ──
  const { data: allLeads = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['admin-leads-all'],
    queryFn: async () => {
      // Fetch in batches to avoid the 1000-row default limit
      const PAGE = 1000;
      let all: LeadRow[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, updated_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, respostas_questionario')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat((data || []) as LeadRow[]);
        hasMore = (data?.length || 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
  });

  // ── Paginated leads for table ──
  const { data: paginatedData, isLoading: loadingTable } = useQuery({
    queryKey: ['admin-leads-table', page, search, filterFranquia, filterStatus, filterModelo, filterCidade],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used', { count: 'exact' });

      if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
      if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus as any);
      if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
      if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
      if (search) query = query.ilike('nome', `%${search}%`);

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

  const leadsPerMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort().map(([month, count]) => ({ month, count }));
  }, [allLeads]);

  const models = useMemo(() => {
    const set = new Set(allLeads.map(l => l.modelo_recomendado).filter(Boolean));
    return Array.from(set) as string[];
  }, [allLeads]);

  const exportCSV = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status');

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

  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(l => l.status_lead === 'novo').length;
  const cities = new Set(allLeads.map(l => l.cidade).filter(Boolean)).size;
  const avgScore = totalLeads > 0 ? Math.round(allLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads) : 0;
  const referralCount = allLeads.filter(l => l.referred_by).length;

  const kpis = [
    { icon: Users, label: 'Quintais explorados', value: totalLeads, color: 'text-primary' },
    { icon: TrendingUp, label: 'Novos leads', value: newLeads, color: 'text-emerald-600' },
    { icon: Target, label: 'Média potencial', value: `${avgScore}%`, color: 'text-primary' },
    { icon: Building2, label: 'Franquias', value: franchises.length, color: 'text-violet-600' },
    { icon: MapPin, label: 'Cidades', value: cities, color: 'text-amber-600' },
    { icon: Share2, label: 'Via convite', value: referralCount, color: 'text-secondary' },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PanelHeader title="Fábrica">
        {[
          { icon: Target, label: 'Radar', action: () => navigate('/admin/radar') },
          { icon: MapPin, label: 'Mapa', action: () => navigate('/mapa') },
          { icon: Download, label: 'CSV', action: exportCSV },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label={item.label}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
        
        <div className="h-5 w-px bg-border/40 mx-1" />
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Breadcrumbs items={[{ label: 'Admin' }]} />
        {/* Tab switcher */}
        {/* Mobile: Select dropdown */}
        <div className="md:hidden mb-4">
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <SelectTrigger className="w-full bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {([
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
              ]).map(tab => (
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

        {/* Desktop: Tab bar */}
        <div className="hidden md:flex gap-1 mb-8 bg-muted/60 backdrop-blur-sm rounded-2xl p-1.5 w-fit border border-border/30" role="tablist">
          {([
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
          ]).map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.key ? 'tab-active' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
            >
              <tab.icon className={`w-4 h-4 inline mr-1.5 ${activeTab === tab.key ? 'text-primary' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          loadingKpis ? <KPISkeleton count={6} /> : <AdminKPICards kpis={kpis} />
        )}

        {activeTab === 'overview' && (
          <>
            {/* Inactive Alerts */}
            <div className="mb-4 sm:mb-6">
              <AdminInactiveAlerts
                franchises={franchises as any}
                leads={allLeads as any}
              />
            </div>

            {/* Performance Comparison */}
            <div className="mb-4 sm:mb-6">
              <AdminPerformanceComparison
                leads={allLeads as any}
                activities={leadActivities}
                franchiseMap={franchiseMap}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <AdminCityRanking leads={allLeads} />
              <AdminFranchiseRanking leads={allLeads} franchiseMap={franchiseMap} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <AdminReferralMetrics leads={allLeads} />
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
          </>
        )}

        {activeTab === 'analytics' && (
          <AdminAnalytics franchiseMap={franchiseMap} role={role} />
        )}

        {activeTab === 'leads' && (
          <>
            <AdminLeadFilters
              searchInput={searchInput} onSearchChange={setSearchInput}
              cidadeInput={cidadeInput} onCidadeChange={setCidadeInput}
              filterFranquia={filterFranquia} onFranquiaChange={setFilterFranquia}
              filterStatus={filterStatus} onStatusChange={setFilterStatus}
              filterModelo={filterModelo} onModeloChange={setFilterModelo}
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

        {activeTab === 'franchises' && <AdminFranchiseManager />}
        {activeTab === 'cities' && <AdminCityManager />}
        {activeTab === 'users' && <AdminUserManager />}
        {activeTab === 'emails' && <AdminEmailTemplates />}

        {activeTab === 'franchise-view' && (
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
                    {franchises.map(f => (
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
        )}
      </div>
    </div>
    </PageTransition>
  );
}
