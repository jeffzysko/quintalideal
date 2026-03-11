import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, Building2, MapPin, Eye, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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

const CHART_COLORS = ['#e80685', '#08a1d6', '#9bcdeb', '#b1cbb0', '#f59e0b'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterFranquia, setFilterFranquia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCidade, setFilterCidade] = useState('');
  const [filterModelo, setFilterModelo] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [leadsRes, franchisesRes] = await Promise.all([
      supabase.from('leads').select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email').order('created_at', { ascending: false }),
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

  // Chart data: leads per franchise
  const leadsPerFranchise = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const name = l.franquia_id ? (franchiseMap[l.franquia_id] || 'Sem franquia') : 'Sem franquia';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [leads, franchiseMap]);

  // Chart data: leads per month
  const leadsPerMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort().map(([month, count]) => ({ month, count }));
  }, [leads]);

  // Models list
  const models = useMemo(() => {
    const set = new Set(leads.map(l => l.modelo_recomendado).filter(Boolean));
    return Array.from(set) as string[];
  }, [leads]);

  const exportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Cidade', 'Franquia', 'Pontuação', 'Modelo', 'Status', 'Data'];
    const rows = filteredLeads.map(l => [
      l.nome || '', l.telefone || '', l.email || '', l.cidade || '',
      l.franquia_id ? (franchiseMap[l.franquia_id] || '') : '',
      String(l.pontuacao_quintal || 0), l.modelo_recomendado || '',
      statusLabels[l.status_lead] || l.status_lead,
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat' }}>Painel da Fábrica</h1>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-2xl font-bold">{newLeads}</p>
              <p className="text-xs text-muted-foreground">Novos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{franchises.length}</p>
              <p className="text-xs text-muted-foreground">Franquias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{cities}</p>
              <p className="text-xs text-muted-foreground">Cidades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base">Leads por Franquia</CardTitle></CardHeader>
          <CardContent>
            {leadsPerFranchise.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px]">
                <BarChart data={leadsPerFranchise}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(322, 95%, 47%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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
            <Input
              placeholder="Filtrar cidade..."
              value={filterCidade}
              onChange={e => setFilterCidade(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Todos os Leads ({filteredLeads.length})
          </CardTitle>
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
    </div>
  );
}
