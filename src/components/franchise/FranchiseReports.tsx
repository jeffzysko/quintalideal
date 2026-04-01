import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Zap, MapPin, Droplets, CalendarDays, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { STATUS_LABELS, STATUS_CHART_COLORS, LeadRow } from '@/lib/lead-constants';

interface FranchiseReportsProps {
  leads: LeadRow[];
}

export function FranchiseReports({ leads }: FranchiseReportsProps) {
  const totalLeads = leads.length;
  const avgScore = totalLeads > 0
    ? Math.round(leads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads)
    : 0;
  const soldCount = leads.filter(l => l.status_lead === 'vendido').length;
  const conversionRate = totalLeads > 0 ? Math.round((soldCount / totalLeads) * 100) : 0;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonthStart).length;
  const leadsLastMonth = leads.filter(l => {
    const d = new Date(l.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).length;
  const monthTrend = leadsLastMonth > 0
    ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
    : leadsThisMonth > 0 ? 100 : 0;

  const leadsPerMonth = useMemo(() => {
    const months: { month: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      months.push({ month: key, label, count: 0 });
    }
    leads.forEach(l => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = months.find(m => m.month === key);
      if (entry) entry.count++;
    });
    return months;
  }, [leads]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.status_lead] = (counts[l.status_lead] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_CHART_COLORS[status] || '#94a3b8',
    }));
  }, [leads]);

  const topCities = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { if (l.cidade) counts[l.cidade] = (counts[l.cidade] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));
  }, [leads]);

  const topModels = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { if (l.modelo_recomendado) counts[l.modelo_recomendado] = (counts[l.modelo_recomendado] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([model, count]) => ({ model, count }));
  }, [leads]);

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];
    leads.forEach(l => {
      const score = l.pontuacao_quintal || 0;
      const bucket = buckets.find(b => score >= b.min && score <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [leads]);

  const weeklyTrend = useMemo(() => {
    const weeks: { week: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const label = weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const count = leads.filter(l => {
        const d = new Date(l.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeks.push({ week: label, count });
    }
    return weeks;
  }, [leads]);

  if (totalLeads === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-16 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-1">Sem dados para relatórios</h3>
          <p className="text-sm text-muted-foreground">Os relatórios aparecerão quando os primeiros leads forem gerados.</p>
        </CardContent>
      </Card>
    );
  }

  const insights = [
    {
      icon: leadsThisMonth >= leadsLastMonth ? TrendingUp : TrendingDown,
      color: leadsThisMonth >= leadsLastMonth ? 'text-success' : 'text-destructive',
      bg: leadsThisMonth >= leadsLastMonth ? 'bg-success/10' : 'bg-destructive/10',
      text: monthTrend >= 0
        ? `${leadsThisMonth} leads este mês (+${monthTrend}% vs mês anterior)`
        : `${leadsThisMonth} leads este mês (${monthTrend}% vs mês anterior)`,
    },
    {
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10',
      text: `Média do Índice: ${avgScore}% — ${avgScore >= 70 ? 'perfil forte!' : avgScore >= 50 ? 'potencial moderado' : 'leads precisam de mais qualificação'}`,
    },
    {
      icon: Zap,
      color: 'text-info',
      bg: 'bg-info/10',
      text: `Conversão: ${conversionRate}% — ${soldCount} de ${totalLeads} leads`,
    },
  ];

  if (topCities.length > 0) {
    insights.push({
      icon: MapPin,
      color: 'text-warning',
      bg: 'bg-warning/10',
      text: `Top cidade: ${topCities[0].city} (${topCities[0].count} leads)`,
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Insights */}
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.06, 0.15) }}>
            <div className={`flex items-start sm:items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl ${insight.bg}`}>
              <insight.icon className={`w-4 h-4 ${insight.color} shrink-0 mt-0.5 sm:mt-0`} />
              <span className="text-xs sm:text-sm text-foreground leading-snug">{insight.text}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Leads por Mês
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Quantos leads novos chegaram em cada mês.</p>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={{}} className="h-[200px] sm:h-[220px] w-full">
              <BarChart data={leadsPerMonth} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={30} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Status dos Leads
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Como seus leads estão distribuídos entre as etapas de venda.</p>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ChartContainer config={{}} className="h-[160px] sm:h-[200px] w-[160px] sm:w-[200px] shrink-0">
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-2 justify-center sm:flex-1">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Tendência Semanal
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Evolução do número de leads semana a semana. Suba = mais interesse!</p>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={{}} className="h-[200px] sm:h-[220px] w-full">
              <LineChart data={weeklyTrend} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={1} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={30} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Distribuição do Índice
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mostra quantos leads têm quintais com boa, média ou baixa compatibilidade.</p>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ChartContainer config={{}} className="h-[200px] sm:h-[220px] w-full">
              <BarChart data={scoreDistribution} margin={{ left: -15, right: 5, top: 5, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(330, 90%, 46%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topCities.length > 0 && (
          <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Top Cidades
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cidades que mais geraram leads para sua franquia.</p>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2">
                {topCities.map((c, i) => {
                  const pct = totalLeads > 0 ? Math.round((c.count / totalLeads) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{c.city}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 ml-2">{c.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: Math.min(i * 0.1, 0.15) }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {topModels.length > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Droplets className="w-4 h-4 text-primary" /> Modelos Mais Indicados
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Quais modelos de piscina os leads mais se interessaram.</p>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="space-y-2">
                {topModels.map((m, i) => {
                  const pct = totalLeads > 0 ? Math.round((m.count / totalLeads) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{m.model}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0 ml-2">{m.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-secondary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: Math.min(i * 0.1, 0.15) }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
