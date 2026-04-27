import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { MapPin, CheckCircle2, AlertTriangle, ShieldAlert, Loader2, Calendar } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LocationAuditSectionProps {
  franchiseMap: Record<string, string>;
  franchises: any[];
}

export function LocationAuditSection({ franchiseMap, franchises }: LocationAuditSectionProps) {
  const [periodDays, setPeriodDays] = useState('30');
  const [filterFranchise, setFilterFranchise] = useState('all');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['location-audit-leads', periodDays],
    queryFn: async () => {
      const since = subDays(new Date(), Number(periodDays));
      const { data, error } = await supabase
        .from('leads')
        .select('id, created_at, franquia_id, location_detection_status, location_detected_name, cidade')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    let filtered = leads;
    if (filterFranchise !== 'all') {
      filtered = leads.filter(l => l.franquia_id === filterFranchise);
    }

    const dailyMap = new Map<string, { date: string; match: number; fallback: number; error: number }>();
    const statusCounts = { match: 0, fallback: 0, error: 0, none: 0 };
    const failList: { raw: string; detected: string; count: number }[] = [];

    filtered.forEach(l => {
      const dateKey = format(new Date(l.created_at), 'yyyy-MM-dd');
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, match: 0, fallback: 0, error: 0 });
      }
      
      const day = dailyMap.get(dateKey)!;
      const status = l.location_detection_status as 'match' | 'fallback' | 'error' | null;

      if (status === 'match') {
        day.match++;
        statusCounts.match++;
      } else if (status === 'fallback') {
        day.fallback++;
        statusCounts.fallback++;
        // Track failing names
        const raw = l.location_detected_name || 'Desconhecido';
        const existing = failList.find(f => f.raw === raw);
        if (existing) existing.count++;
        else failList.push({ raw, detected: l.cidade || '', count: 1 });
      } else if (status === 'error') {
        day.error++;
        statusCounts.error++;
      } else {
        statusCounts.none++;
      }
    });

    const chartData = Array.from(dailyMap.values()).map(d => ({
      ...d,
      formattedDate: format(new Date(d.date), 'dd/MM', { locale: ptBR })
    }));

    return {
      chartData,
      statusCounts,
      topFails: failList.sort((a, b) => b.count - a.count).slice(0, 10)
    };
  }, [leads, filterFranchise]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalAnalyzed = stats.statusCounts.match + stats.statusCounts.fallback + stats.statusCounts.error;
  const matchRate = totalAnalyzed > 0 ? Math.round((stats.statusCounts.match / totalAnalyzed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterFranchise} onValueChange={setFilterFranchise}>
          <SelectTrigger className="w-[200px] h-9 text-xs">
            <SelectValue placeholder="Todas as franquias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as franquias</SelectItem>
            {franchises.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Match Rate</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{matchRate}%</div>
            <p className="text-[10px] text-emerald-600/70">{stats.statusCounts.match} cidades confirmadas</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Fallbacks</CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.statusCounts.fallback}</div>
            <p className="text-[10px] text-amber-600/70">Preenchimento manual sugerido</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Erros GPS</CardTitle>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.statusCounts.error}</div>
            <p className="text-[10px] text-red-600/70">Permissão negada ou falha</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Analisado</CardTitle>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="text-2xl font-bold">{totalAnalyzed}</div>
            <p className="text-[10px] text-muted-foreground">{stats.statusCounts.none} sem registro GPS</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Histórico de Detecção (Dia a Dia)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="formattedDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 20 }} />
                <Bar name="Sucesso (Match)" dataKey="match" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar name="Manual (Fallback)" dataKey="fallback" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar name="Erro GPS" dataKey="error" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Fails Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Top Cidades Não Encontradas (Fallbacks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topFails.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum registro de fallback encontrado no período.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {stats.topFails.map((fail, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/30 border border-border/50">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold">{fail.raw}</span>
                      <span className="text-[10px] text-muted-foreground italic">Usuário selecionou: {fail.detected}</span>
                    </div>
                    <div className="text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md">
                      {fail.count}x
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
