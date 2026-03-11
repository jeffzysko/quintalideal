import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Building2, MapPin, Download, BarChart3, Share2, Target, Activity, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AdminCityRanking } from '@/components/admin/AdminCityRanking';
import { AdminFranchiseRanking } from '@/components/admin/AdminFranchiseRanking';
import { AdminReferralMetrics } from '@/components/admin/AdminReferralMetrics';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminFranchiseManager } from '@/components/admin/AdminFranchiseManager';
import { AdminEmailTemplates } from '@/components/admin/AdminEmailTemplates';
import { AdminKPICards } from '@/components/admin/AdminKPICards';
import { AdminLeadFilters } from '@/components/admin/AdminLeadFilters';
import { AdminLeadsTable } from '@/components/admin/AdminLeadsTable';
import { KPISkeleton } from '@/components/ui/kpi-skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { STATUS_LABELS, LeadRow } from '@/lib/lead-constants';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import logoSplash from '@/assets/logo-splash.png';

const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut: _signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'analytics' | 'franchises' | 'emails'>('overview');

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

  // ── Franchises ──
  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: async () => {
      const { data, error } = await supabase.from('franchises').select('id, nome_franquia');
      if (error) throw error;
      return data || [];
    },
  });

  // ── All leads for KPIs/charts ──
  const { data: allLeads = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['admin-leads-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LeadRow[];
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
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by', { count: 'exact' });

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
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by');

      if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
      if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus as any);
      if (filterModelo !== 'all') query = query.eq('modelo_recomendado', filterModelo);
      if (filterCidade) query = query.ilike('cidade', `%${filterCidade}%`);
      if (search) query = query.ilike('nome', `%${search}%`);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      const exportLeads = (data || []) as LeadRow[];

      const headers = ['Nome', 'Telefone', 'Email', 'Cidade', 'Franquia', 'Pontuação', 'Modelo', 'Status', 'Referência', 'Data'];
      const rows = exportLeads.map(l => [
        l.nome || '', l.telefone || '', l.email || '', l.cidade || '',
        l.franquia_id ? (franchiseMap[l.franquia_id] || '') : '',
        String(l.pontuacao_quintal || 0), l.modelo_recomendado || '',
        STATUS_LABELS[l.status_lead] || l.status_lead,
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSplash} alt="Splash" className="w-16" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Painel da Fábrica
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Visão geral de desempenho</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/radar')} className="rounded-xl gap-1.5" aria-label="Abrir radar de mercado">
              <Target className="w-4 h-4" /> Radar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/mapa')} className="rounded-xl gap-1.5" aria-label="Abrir mapa de quintais">
              <MapPin className="w-4 h-4" /> Mapa
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl gap-1.5" aria-label="Exportar leads para CSV">
              <Download className="w-4 h-4" /> CSV
            </Button>
            <UserAvatarMenu />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 bg-muted rounded-xl p-1 w-fit" role="tablist">
          {[
            { key: 'overview' as const, icon: BarChart3, label: 'Inteligência' },
            { key: 'analytics' as const, icon: Activity, label: 'Analytics' },
            { key: 'leads' as const, icon: Users, label: 'Leads' },
            { key: 'franchises' as const, icon: Building2, label: 'Franquias' },
            { key: 'emails' as const, icon: Mail, label: 'E-mails' },
          ].map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <tab.icon className="w-4 h-4 inline mr-1.5" /> {tab.label}
            </button>
          ))}
        </div>

        {loadingKpis ? <KPISkeleton count={6} /> : <AdminKPICards kpis={kpis} />}

        {activeTab === 'overview' && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <AdminCityRanking leads={allLeads} />
              <AdminFranchiseRanking leads={allLeads} franchiseMap={franchiseMap} />
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <AdminReferralMetrics leads={allLeads} />
              <Card className="border-border/50 shadow-sm">
                <CardHeader><CardTitle className="text-sm font-semibold">Leads por Mês</CardTitle></CardHeader>
                <CardContent>
                  {leadsPerMonth.length > 0 ? (
                    <ChartContainer config={{}} className="h-[250px]">
                      <BarChart data={leadsPerMonth}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
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
          <AdminAnalytics franchiseMap={franchiseMap} />
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
        {activeTab === 'emails' && <AdminEmailTemplates />}
      </div>
    </div>
  );
}
