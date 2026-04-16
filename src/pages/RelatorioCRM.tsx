import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { PanelHeader } from '@/components/PanelHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportRelatorioCRMPdf, exportLeadsCsv } from '@/lib/exportRelatorioCRM';

import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, CalendarIcon, Users, TrendingUp, Clock, DollarSign, Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes anterior' },
  { value: 'custom', label: 'Personalizado' },
];

const FUNNEL_ORDER = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'];

function getDateRange(period: string, customRange?: DateRange): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case '7': return { from: subDays(now, 7), to: now };
    case '30': return { from: subDays(now, 30), to: now };
    case '90': return { from: subDays(now, 90), to: now };
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case 'custom':
      return {
        from: customRange?.from || subDays(now, 30),
        to: customRange?.to || now,
      };
    default: return { from: subDays(now, 30), to: now };
  }
}

export default function RelatorioCRM() {
  const { user, franchiseId } = useAuth();
  const [period, setPeriod] = useState('30');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const { from, to } = getDateRange(period, customRange);

  const { data: franchise } = useQuery({
    queryKey: ['crm-report-franchise', franchiseId],
    queryFn: async () => {
      if (!franchiseId) return null;
      const { data } = await supabase.from('franchises').select('nome_franquia').eq('id', franchiseId).maybeSingle();
      return data;
    },
    enabled: !!franchiseId,
  });

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['crm-report-leads', franchiseId, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!franchiseId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, cidade, status_lead, created_at, updated_at, loss_reason, assigned_to, franquia_id')
        .eq('franquia_id', franchiseId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseId,
  });

  // Fetch proposals for ticket medio
  const { data: proposals = [] } = useQuery({
    queryKey: ['crm-report-proposals', franchiseId, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      if (!franchiseId) return [];
      const { data, error } = await supabase
        .from('proposals')
        .select('id, total, status, lead_id, created_at')
        .eq('franchise_id', franchiseId)
        .in('status', ['aceita'])
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseId,
  });

  // Fetch profiles for assigned_to names
  const { data: profiles = [] } = useQuery({
    queryKey: ['crm-report-profiles', franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('franquia_id', franchiseId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseId,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach(p => { if (p.user_id && p.full_name) map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  const filteredLeads = useMemo(() => {
    if (assignedFilter === 'all') return leads;
    if (assignedFilter === 'mine') return leads.filter(l => l.assigned_to === user?.id);
    return leads.filter(l => l.assigned_to === assignedFilter);
  }, [leads, assignedFilter, user?.id]);

  // Metrics
  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => l.status_lead === 'vendido').length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0';

  const avgFunnelDays = useMemo(() => {
    const closed = filteredLeads.filter(l => l.status_lead === 'vendido' && l.updated_at);
    if (!closed.length) return 0;
    const total = closed.reduce((sum, l) => sum + differenceInDays(new Date(l.updated_at), new Date(l.created_at)), 0);
    return Math.round(total / closed.length);
  }, [filteredLeads]);

  const avgTicket = useMemo(() => {
    if (!proposals.length) return 0;
    const total = proposals.reduce((sum, p) => sum + (p.total || 0), 0);
    return total / proposals.length;
  }, [proposals]);

  // Funnel chart data
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach(l => { counts[l.status_lead] = (counts[l.status_lead] || 0) + 1; });
    return FUNNEL_ORDER.map(status => ({
      name: STATUS_LABELS[status] || status,
      value: counts[status] || 0,
      fill: STATUS_CHART_COLORS[status] || 'hsl(var(--primary))',
    }));
  }, [filteredLeads]);

  // Weekly line chart (last 60 days from "to")
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    const start60 = subDays(to, 60);
    filteredLeads
      .filter(l => new Date(l.created_at) >= start60)
      .forEach(l => {
        const w = format(startOfWeek(new Date(l.created_at), { locale: ptBR }), 'dd/MM');
        weeks[w] = (weeks[w] || 0) + 1;
      });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ semana: week, leads: count }));
  }, [filteredLeads, to]);

  // Loss reasons
  const lossReasons = useMemo(() => {
    const lost = filteredLeads.filter(l => l.status_lead === 'perdido');
    if (!lost.length) return [];
    const counts: Record<string, number> = {};
    lost.forEach(l => {
      const reason = l.loss_reason || 'Nao informado';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count, pct: ((count / lost.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  // Performance by assignee
  const performanceByAssignee = useMemo(() => {
    const assigned = filteredLeads.filter(l => l.assigned_to);
    if (!assigned.length) return [];
    const map: Record<string, { active: number; closed: number }> = {};
    assigned.forEach(l => {
      const uid = l.assigned_to!;
      if (!map[uid]) map[uid] = { active: 0, closed: 0 };
      if (l.status_lead === 'vendido') map[uid].closed++;
      else if (l.status_lead !== 'perdido') map[uid].active++;
    });
    return Object.entries(map).map(([uid, stats]) => ({
      name: profileMap[uid] || 'Sem nome',
      uid,
      ...stats,
      rate: stats.active + stats.closed > 0
        ? ((stats.closed / (stats.active + stats.closed)) * 100).toFixed(1)
        : '0',
    }));
  }, [filteredLeads, profileMap]);

  // Unique assignees for filter
  const assignees = useMemo(() => {
    const set = new Set(leads.filter(l => l.assigned_to).map(l => l.assigned_to!));
    return Array.from(set).map(uid => ({ uid, name: profileMap[uid] || uid.slice(0, 8) }));
  }, [leads, profileMap]);

  const periodLabel = useMemo(() => {
    const opt = PERIOD_OPTIONS.find(o => o.value === period);
    if (period === 'custom' && customRange?.from && customRange?.to) {
      return `${format(customRange.from, 'dd/MM/yyyy')} a ${format(customRange.to, 'dd/MM/yyyy')}`;
    }
    return opt?.label || '';
  }, [period, customRange]);

  const partnerName = franchise?.nome_franquia || 'Parceiro';

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      exportLeadsCsv(filteredLeads.map(l => ({
        nome: l.nome || '',
        telefone: l.telefone || '',
        cidade: l.cidade || '',
        estagio: STATUS_LABELS[l.status_lead] || l.status_lead,
        responsavel: l.assigned_to ? (profileMap[l.assigned_to] || '') : '',
        data_criacao: format(new Date(l.created_at), 'dd/MM/yyyy'),
        motivo_perda: l.loss_reason || '',
      })));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const totalFunnel = funnelData.reduce((s, f) => s + f.value, 0);
      exportRelatorioCRMPdf({
        partnerName,
        periodLabel,
        summary: {
          totalLeads,
          conversionRate: `${conversionRate}%`,
          avgFunnelDays,
          avgTicket: avgTicket > 0
            ? `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : '-',
        },
        funnel: funnelData.map(f => ({
          name: f.name,
          value: f.value,
          pct: totalFunnel > 0 ? `${((f.value / totalFunnel) * 100).toFixed(1)}%` : '0%',
        })),
        lossReasons: lossReasons.map(r => ({ reason: r.reason, count: r.count, pct: r.pct })),
        performance: performanceByAssignee.length
          ? performanceByAssignee.map(p => ({ name: p.name, active: p.active, closed: p.closed, rate: p.rate }))
          : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportDisabled = isLoading || isExporting || filteredLeads.length === 0;

  // legacy CSV columns retained via dropdown handler above

  return (
    <div className="min-h-screen bg-background">
      <PanelHeader title="Relatorio de Conversao">
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserAvatarMenu />
        </div>
      </PanelHeader>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {customRange?.from ? format(customRange.from, 'dd/MM') : '...'} - {customRange?.to ? format(customRange.to, 'dd/MM') : '...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {assignees.length > 0 && (
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsavel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mine">Meus leads</SelectItem>
                {assignees.map(a => (
                  <SelectItem key={a.uid} value={a.uid}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="ml-auto gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard icon={Users} label="Total de leads" value={totalLeads.toString()} />
            <SummaryCard icon={TrendingUp} label="Taxa de conversao" value={`${conversionRate}%`} />
            <SummaryCard icon={Clock} label="Tempo medio no funil" value={`${avgFunnelDays} dias`} />
            <SummaryCard icon={DollarSign} label="Ticket medio" value={avgTicket > 0 ? `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'} />
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Funil de conversao</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, i) => (
                        <Bar key={i} dataKey="value" fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Leads por semana</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-64" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Loss reasons */}
        <Card>
          <CardHeader><CardTitle className="text-base">Principais motivos de perda</CardTitle></CardHeader>
          <CardContent>
            {lossReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum lead perdido no periodo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Motivo</th>
                      <th className="pb-2 font-medium text-right">Qtd</th>
                      <th className="pb-2 font-medium text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossReasons.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{r.reason}</td>
                        <td className="py-2 text-right">{r.count}</td>
                        <td className="py-2 text-right">{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance by assignee */}
        {performanceByAssignee.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Performance por responsavel</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Responsavel</th>
                      <th className="pb-2 font-medium text-right">Ativos</th>
                      <th className="pb-2 font-medium text-right">Fechados</th>
                      <th className="pb-2 font-medium text-right">Conversao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceByAssignee.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{p.name}</td>
                        <td className="py-2 text-right">{p.active}</td>
                        <td className="py-2 text-right">{p.closed}</td>
                        <td className="py-2 text-right">
                          <Badge variant="secondary">{p.rate}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
