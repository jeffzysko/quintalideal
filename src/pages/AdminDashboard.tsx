import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, Building2, MapPin, Eye, Download, BarChart3, Share2, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { AdminCityRanking } from '@/components/admin/AdminCityRanking';
import { AdminFranchiseRanking } from '@/components/admin/AdminFranchiseRanking';
import { AdminReferralMetrics } from '@/components/admin/AdminReferralMetrics';

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
  novo: 'bg-blue-100 text-blue-800',
  contatado: 'bg-yellow-100 text-yellow-800',
  em_negociacao: 'bg-purple-100 text-purple-800',
  vendido: 'bg-green-100 text-green-800',
  perdido: 'bg-red-100 text-red-800',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads'>('overview');

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
  const soldLeads = leads.filter(l => l.status_lead === 'vendido').length;
  const cities = new Set(leads.map(l => l.cidade).filter(Boolean)).size;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads) : 0;
  const referralCount = leads.filter(l => l.referred_by).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>Painel da Fábrica</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/mapa')}>
            <MapPin className="w-4 h-4 mr-1" /> Mapa
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
        >
          <BarChart3 className="w-4 h-4 inline mr-1" /> Inteligência
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Leads
        </button>
      </div>

      {/* KPI Cards — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold">{totalLeads}</p>
              <p className="text-[10px] text-muted-foreground">Quintais explorados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-secondary shrink-0" />
            <div>
              <p className="text-xl font-bold">{newLeads}</p>
              <p className="text-[10px] text-muted-foreground">Novos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold">{avgScore}%</p>
              <p className="text-[10px] text-muted-foreground">Média potencial</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-secondary shrink-0" />
            <div>
              <p className="text-xl font-bold">{franchises.length}</p>
              <p className="text-[10px] text-muted-foreground">Franquias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="text-xl font-bold">{cities}</p>
              <p className="text-[10px] text-muted-foreground">Cidades</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-secondary shrink-0" />
            <div>
              <p className="text-xl font-bold">{referralCount}</p>
              <p className="text-[10px] text-muted-foreground">Via convite</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Intelligence section */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <AdminCityRanking leads={leads} />
            <AdminFranchiseRanking leads={leads} franchiseMap={franchiseMap} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <AdminReferralMetrics leads={leads} />
            <Card>
              <CardHeader><CardTitle className="text-base">Leads por Mês</CardTitle></CardHeader>
              <CardContent>
                {leadsPerMonth.length > 0 ? (
                  <ChartContainer config={{}} className="h-[250px]">
                    <BarChart data={leadsPerMonth}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(196, 93%, 44%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'leads' && (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} />
                <Select value={filterFranquia} onValueChange={setFilterFranquia}>
                  <SelectTrigger><SelectValue placeholder="Franquia" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Franquias</SelectItem>
                    {franchises.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterModelo} onValueChange={setFilterModelo}>
                  <SelectTrigger><SelectValue placeholder="Modelo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Modelos</SelectItem>
                    {models.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Filtrar cidade..." value={filterCidade} onChange={e => setFilterCidade(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todos os Leads ({filteredLeads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Nome</th>
                        <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Cidade</th>
                        <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Franquia</th>
                        <th className="text-left py-3 px-2 font-medium">Pont.</th>
                        <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Modelo</th>
                        <th className="text-left py-3 px-2 font-medium">Status</th>
                        <th className="text-left py-3 px-2 font-medium hidden lg:table-cell">Ref</th>
                        <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Data</th>
                        <th className="text-left py-3 px-2 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2">{lead.nome || '—'}</td>
                          <td className="py-3 px-2 hidden md:table-cell">{lead.cidade || '—'}</td>
                          <td className="py-3 px-2 hidden lg:table-cell">
                            {lead.franquia_id ? (franchiseMap[lead.franquia_id] || '—') : '—'}
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
                          </td>
                          <td className="py-3 px-2 hidden md:table-cell">{lead.modelo_recomendado || '—'}</td>
                          <td className="py-3 px-2">
                            <Badge className={statusColors[lead.status_lead] || ''} variant="secondary">
                              {statusLabels[lead.status_lead] || lead.status_lead}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 hidden lg:table-cell">
                            {lead.referred_by ? (
                              <span className="text-xs font-mono text-secondary">{lead.referred_by}</span>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-2">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/lead/${lead.id}`)}>
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
    </div>
  );
}
