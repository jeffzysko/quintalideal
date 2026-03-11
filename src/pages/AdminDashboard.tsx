import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, Building2, MapPin, Eye, Download, BarChart3, Share2, Target, Activity, LogOut, Mail } from 'lucide-react';
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
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';

interface LeadRow {
  id: string;
  nome: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  status_lead: string;
  created_at: string;
  franquia_id: string | null;
  telefone: string | null;
  email: string | null;
  ref_code: string | null;
  referred_by: string | null;
}

interface Franchise {
  id: string;
  nome_franquia: string;
}

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  em_negociacao: 'Em Negociação',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

const statusColors: Record<string, string> = {
  novo: 'bg-primary/10 text-primary border-primary/20',
  contatado: 'bg-amber-50 text-amber-700 border-amber-200',
  em_negociacao: 'bg-violet-50 text-violet-700 border-violet-200',
  vendido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perdido: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'analytics' | 'franchises' | 'emails'>('overview');

  const [filterFranquia, setFilterFranquia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterModelo, setFilterModelo] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [leadsRes, franchisesRes] = await Promise.all([
      supabase.from('leads').select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by').order('created_at', { ascending: false }),
      supabase.from('franchises').select('id, nome_franquia'),
    ]);
    setLeads(leadsRes.data || []);
    setFranchises(franchisesRes.data || []);
    setLoading(false);
  };

  const franchiseMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach(f => { map[f.id] = f.nome_franquia; });
    return map;
  }, [franchises]);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filterFranquia !== 'all' && l.franquia_id !== filterFranquia) return false;
      if (filterStatus !== 'all' && l.status_lead !== filterStatus) return false;
      if (filterCidade && !l.cidade?.toLowerCase().includes(filterCidade.toLowerCase())) return false;
      if (filterModelo !== 'all' && l.modelo_recomendado !== filterModelo) return false;
      if (search && !l.nome?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [leads, filterFranquia, filterStatus, filterCidade, filterModelo, search]);

  const leadsPerMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort().map(([month, count]) => ({ month, count }));
  }, [leads]);

  const models = useMemo(() => {
    const set = new Set(leads.map(l => l.modelo_recomendado).filter(Boolean));
    return Array.from(set) as string[];
  }, [leads]);

  const exportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Cidade', 'Franquia', 'Pontuação', 'Modelo', 'Status', 'Referência', 'Data'];
    const rows = filteredLeads.map(l => [
      l.nome || '', l.telefone || '', l.email || '', l.cidade || '',
      l.franquia_id ? (franchiseMap[l.franquia_id] || '') : '',
      String(l.pontuacao_quintal || 0), l.modelo_recomendado || '',
      statusLabels[l.status_lead] || l.status_lead,
      l.referred_by || '',
      new Date(l.created_at).toLocaleDateString('pt-BR'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-splash-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status_lead === 'novo').length;
  const cities = new Set(leads.map(l => l.cidade).filter(Boolean)).size;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads) : 0;
  const referralCount = leads.filter(l => l.referred_by).length;

  const kpis = [
    { icon: Users, label: 'Quintais explorados', value: totalLeads, color: 'text-primary' },
    { icon: TrendingUp, label: 'Novos leads', value: newLeads, color: 'text-emerald-600' },
    { icon: Target, label: 'Média potencial', value: `${avgScore}%`, color: 'text-primary' },
    { icon: Building2, label: 'Franquias', value: franchises.length, color: 'text-violet-600' },
    { icon: MapPin, label: 'Cidades', value: cities, color: 'text-amber-600' },
    { icon: Share2, label: 'Via convite', value: referralCount, color: 'text-secondary' },
  ];

  const { signOut } = useAuth();

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
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/radar')} className="rounded-xl gap-1.5">
              <Target className="w-4 h-4" /> Radar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/mapa')} className="rounded-xl gap-1.5">
              <MapPin className="w-4 h-4" /> Mapa
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl gap-1.5">
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="rounded-xl gap-1.5 text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 bg-muted rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" /> Inteligência
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Activity className="w-4 h-4 inline mr-1.5" /> Analytics
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'leads' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" /> Leads
          </button>
          <button
            onClick={() => setActiveTab('franchises')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'franchises' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Building2 className="w-4 h-4 inline mr-1.5" /> Franquias
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'emails' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Mail className="w-4 h-4 inline mr-1.5" /> E-mails
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                  <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <AdminCityRanking leads={leads} />
              <AdminFranchiseRanking leads={leads} franchiseMap={franchiseMap} />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <AdminReferralMetrics leads={leads} />
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
            {/* Filters */}
            <Card className="mb-6 border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl" />
                  <Select value={filterFranquia} onValueChange={setFilterFranquia}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Franquia" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Franquias</SelectItem>
                      {franchises.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      {Object.entries(statusLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterModelo} onValueChange={setFilterModelo}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Modelo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Modelos</SelectItem>
                      {models.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Filtrar cidade..." value={filterCidade} onChange={e => setFilterCidade(e.target.value)} className="rounded-xl" />
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Todos os Leads ({filteredLeads.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Franquia</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Ref</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                          <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-3 font-medium">{lead.nome || '—'}</td>
                            <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.cidade || '—'}</td>
                            <td className="py-3.5 px-3 hidden lg:table-cell text-muted-foreground">
                              {lead.franquia_id ? (franchiseMap[lead.franquia_id] || '—') : '—'}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
                            </td>
                            <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.modelo_recomendado || '—'}</td>
                            <td className="py-3.5 px-3">
                              <Badge className={`${statusColors[lead.status_lead] || ''} border text-xs font-medium`} variant="secondary">
                                {statusLabels[lead.status_lead] || lead.status_lead}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-3 hidden lg:table-cell">
                              {lead.referred_by ? (
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">{lead.referred_by}</span>
                              ) : '—'}
                            </td>
                            <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-3.5 px-3">
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/lead/${lead.id}`)} className="rounded-lg">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'franchises' && (
          <AdminFranchiseManager />
        )}
        {activeTab === 'emails' && (
          <AdminEmailTemplates />
        )}
      </div>
    </div>
  );
}
