import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import {
  TrendingUp, MapPin, Users, Building2,
  Flame, ExternalLink, ArrowRight, Download, Loader2, BarChart3, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { type LeadRow, type Franchise } from '@/lib/lead-constants';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { normalizeQuizToV2, detectCustomerProfile } from '@/lib/scoring-v2';

interface PerformanceQIProps {
  franchiseMap: Record<string, string>;
  franchises: Franchise[];
}

interface LeadWithQuiz extends LeadRow {
  respostas_questionario: Record<string, unknown> | null;
  modelo_vendido: string | null;
}

interface AnalyticsEvent {
  session_id: string;
  event_name: string;
  franchise_id: string | null;
  city: string | null;
  created_at: string;
}

const PROFILE_COLORS: Record<string, string> = {
  RELAXADOR: '#3b82f6',
  FAMÍLIA: '#10b981',
  SOCIAL: '#f59e0b',
  PREMIUM: '#8b5cf6',
  COMPACTO: '#ec4899',
};

const OBJECTIVE_COLORS: Record<string, string> = {
  relaxar: '#3b82f6',
  familia: '#10b981',
  social: '#f59e0b',
  valorizar: '#8b5cf6',
};

export function PerformanceQI({ franchiseMap, franchises }: PerformanceQIProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [periodDays, setPeriodDays] = useState('30');
  const [filterFranchise, setFilterFranchise] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterModel, setFilterModel] = useState('all');

  // ── Fetch leads with quiz data ──
  const { data: allLeads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['perf-qi-leads', periodDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - Number(periodDays));
      const allData: LeadWithQuiz[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, respostas_questionario, modelo_vendido, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, ref_code, referred_by')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        if (error) throw error;
        allData.push(...((data || []) as any[]));
        if (!data || data.length < batchSize) break;
        from += batchSize;
      }
      return allData;
    },
    staleTime: 3 * 60 * 1000,
  });

  // ── Fetch analytics events for funnel ──
  const { data: analyticsEvents = [] } = useQuery({
    queryKey: ['perf-qi-analytics', periodDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - Number(periodDays));
      const { data, error } = await supabase
        .from('analytics_events')
        .select('session_id, event_name, franchise_id, city, created_at')
        .gte('created_at', since.toISOString())
        .limit(5000);
      if (error) throw error;
      return (data || []) as AnalyticsEvent[];
    },
    staleTime: 3 * 60 * 1000,
  });

  // ── Apply filters ──
  const filteredLeads = useMemo(() => {
    let leads = allLeads;
    if (filterFranchise !== 'all') leads = leads.filter(l => l.franquia_id === filterFranchise);
    if (filterCity !== 'all') leads = leads.filter(l => l.cidade === filterCity);
    if (filterModel !== 'all') leads = leads.filter(l => l.modelo_recomendado === filterModel);
    return leads;
  }, [allLeads, filterFranchise, filterCity, filterModel]);

  const filteredEvents = useMemo(() => {
    if (filterFranchise === 'all') return analyticsEvents;
    return analyticsEvents.filter(e => e.franchise_id === filterFranchise);
  }, [analyticsEvents, filterFranchise]);

  // ── Derived data ──
  const cities = useMemo(() => [...new Set(allLeads.map(l => l.cidade).filter(Boolean))] as string[], [allLeads]);
  const models = useMemo(() => [...new Set(allLeads.map(l => l.modelo_recomendado).filter(Boolean))] as string[], [allLeads]);

  // BLOCK 1: Conversion Funnel
  const funnelData = useMemo(() => {
    const sessionEvents = new Map<string, Set<string>>();
    filteredEvents.forEach(e => {
      if (!sessionEvents.has(e.session_id)) sessionEvents.set(e.session_id, new Set());
      sessionEvents.get(e.session_id)!.add(e.event_name);
    });
    const steps = [
      { key: 'lead_created', label: 'Leads gerados' },
      { key: 'result_viewed', label: 'Resultado exibido' },
      { key: 'whatsapp_clicked', label: 'Clique WhatsApp' },
    ];
    const counts = steps.map(s => {
      const count = s.key === 'lead_created'
        ? filteredLeads.length
        : [...sessionEvents.values()].filter(set => set.has(s.key)).length;
      return { ...s, count };
    });
    // Add CRM stages from leads
    const contatados = filteredLeads.filter(l => ['contatado', 'em_negociacao', 'vendido'].includes(l.status_lead)).length;
    const vendidos = filteredLeads.filter(l => l.status_lead === 'vendido').length;
    counts.push({ key: 'contatado', label: 'Atendimento iniciado', count: contatados });
    counts.push({ key: 'vendido', label: 'Venda fechada', count: vendidos });
    return counts;
  }, [filteredLeads, filteredEvents]);

  // BLOCK 2: Model Performance
  const modelPerformance = useMemo(() => {
    const map = new Map<string, { recommended: number; sold: number; totalScore: number }>();
    filteredLeads.forEach(l => {
      const model = l.modelo_recomendado;
      if (!model) return;
      if (!map.has(model)) map.set(model, { recommended: 0, sold: 0, totalScore: 0 });
      const m = map.get(model)!;
      m.recommended++;
      m.totalScore += l.pontuacao_quintal || 0;
      if (l.status_lead === 'vendido') m.sold++;
    });
    return [...map.entries()]
      .map(([model, d]) => ({
        model,
        recommended: d.recommended,
        sold: d.sold,
        conversionRate: d.recommended > 0 ? Math.round((d.sold / d.recommended) * 100) : 0,
        avgScore: d.recommended > 0 ? Math.round(d.totalScore / d.recommended) : 0,
      }))
      .sort((a, b) => b.recommended - a.recommended);
  }, [filteredLeads]);

  // BLOCK 3: Adherence (recommended vs sold)
  const adherenceData = useMemo(() => {
    const soldLeads = filteredLeads.filter(l => l.status_lead === 'vendido');
    const withModelSold = soldLeads.filter(l => l.modelo_vendido);
    const matches = withModelSold.filter(l => l.modelo_recomendado === l.modelo_vendido);
    const adherenceRate = withModelSold.length > 0 ? Math.round((matches.length / withModelSold.length) * 100) : null;

    // Most faithful models
    const faithfulMap = new Map<string, { total: number; matched: number }>();
    withModelSold.forEach(l => {
      const model = l.modelo_recomendado || 'Outro';
      if (!faithfulMap.has(model)) faithfulMap.set(model, { total: 0, matched: 0 });
      const m = faithfulMap.get(model)!;
      m.total++;
      if (l.modelo_recomendado === l.modelo_vendido) m.matched++;
    });
    const faithful = [...faithfulMap.entries()]
      .map(([model, d]) => ({ model, rate: d.total > 0 ? Math.round((d.matched / d.total) * 100) : 0, total: d.total }))
      .filter(d => d.total >= 2)
      .sort((a, b) => b.rate - a.rate);

    // Most changed models
    const changedMap = new Map<string, number>();
    withModelSold.filter(l => l.modelo_recomendado !== l.modelo_vendido).forEach(l => {
      const key = `${l.modelo_recomendado} → ${l.modelo_vendido}`;
      changedMap.set(key, (changedMap.get(key) || 0) + 1);
    });
    const changed = [...changedMap.entries()]
      .map(([change, count]) => ({ change, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { adherenceRate, totalSold: soldLeads.length, tracked: withModelSold.length, matches: matches.length, faithful: faithful.slice(0, 5), changed };
  }, [filteredLeads]);

  // BLOCK 4: Hot Leads
  const hotLeads = useMemo(() => {
    return filteredLeads.filter(l => {
      const quiz = l.respostas_questionario as any;
      const v2 = quiz?.v2_recommendation;
      if (v2?.is_hot_lead) return true;
      if ((l.pontuacao_quintal || 0) >= 85) {
        const intent = quiz?.purchase_intent || quiz?.prazo;
        if (intent === '2026' || intent === '2025') return true;
      }
      return false;
    }).slice(0, 20);
  }, [filteredLeads]);

  // BLOCK 5: City Performance
  const cityPerformance = useMemo(() => {
    const map = new Map<string, { total: number; sold: number; totalScore: number; models: Map<string, number> }>();
    filteredLeads.forEach(l => {
      const city = l.cidade || 'Sem cidade';
      if (!map.has(city)) map.set(city, { total: 0, sold: 0, totalScore: 0, models: new Map() });
      const c = map.get(city)!;
      c.total++;
      c.totalScore += l.pontuacao_quintal || 0;
      if (l.status_lead === 'vendido') c.sold++;
      if (l.modelo_recomendado) c.models.set(l.modelo_recomendado, (c.models.get(l.modelo_recomendado) || 0) + 1);
    });
    return [...map.entries()]
      .map(([city, d]) => {
        let topModel = '';
        let topCount = 0;
        d.models.forEach((count, model) => { if (count > topCount) { topModel = model; topCount = count; } });
        return {
          city,
          total: d.total,
          sold: d.sold,
          conversionRate: d.total > 0 ? Math.round((d.sold / d.total) * 100) : 0,
          avgScore: d.total > 0 ? Math.round(d.totalScore / d.total) : 0,
          topModel,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [filteredLeads]);

  // BLOCK 6: Lead Profiles
  const profileData = useMemo(() => {
    const objectives: Record<string, number> = {};
    const profiles: Record<string, number> = {};
    filteredLeads.forEach(l => {
      const quiz = l.respostas_questionario as any;
      if (!quiz) return;
      try {
        const v2input = normalizeQuizToV2(quiz);
        const profile = detectCustomerProfile(v2input);
        profiles[profile] = (profiles[profile] || 0) + 1;
        if (v2input.objective_main) objectives[v2input.objective_main] = (objectives[v2input.objective_main] || 0) + 1;
      } catch { /* skip */ }
    });
    return {
      objectives: Object.entries(objectives).map(([name, value]) => ({ name, value, color: OBJECTIVE_COLORS[name] || '#94a3b8' })).sort((a, b) => b.value - a.value),
      profiles: Object.entries(profiles).map(([name, value]) => ({ name, value, color: PROFILE_COLORS[name] || '#94a3b8' })).sort((a, b) => b.value - a.value),
    };
  }, [filteredLeads]);

  // BLOCK 7: Franchise Performance in QI
  const franchisePerformance = useMemo(() => {
    const map = new Map<string, { total: number; hot: number; whatsapp: number; contatado: number; sold: number; adherent: number; trackedSold: number }>();
    filteredLeads.forEach(l => {
      const fid = l.franquia_id || 'sem-franquia';
      if (!map.has(fid)) map.set(fid, { total: 0, hot: 0, whatsapp: 0, contatado: 0, sold: 0, adherent: 0, trackedSold: 0 });
      const f = map.get(fid)!;
      f.total++;
      const quiz = l.respostas_questionario as any;
      if (quiz?.v2_recommendation?.is_hot_lead) f.hot++;
      if (['contatado', 'em_negociacao', 'vendido'].includes(l.status_lead)) f.contatado++;
      if (l.status_lead === 'vendido') {
        f.sold++;
        if (l.modelo_vendido) {
          f.trackedSold++;
          if (l.modelo_recomendado === l.modelo_vendido) f.adherent++;
        }
      }
    });
    // Count whatsapp clicks per franchise from analytics
    const whatsappByFranchise = new Map<string, number>();
    filteredEvents.filter(e => e.event_name === 'whatsapp_clicked').forEach(e => {
      const fid = e.franchise_id || 'sem-franquia';
      whatsappByFranchise.set(fid, (whatsappByFranchise.get(fid) || 0) + 1);
    });
    whatsappByFranchise.forEach((count, fid) => {
      if (map.has(fid)) map.get(fid)!.whatsapp = count;
    });

    return [...map.entries()]
      .filter(([fid]) => fid !== 'sem-franquia')
      .map(([fid, d]) => ({
        id: fid,
        name: franchiseMap[fid] || fid.slice(0, 8),
        ...d,
        conversionRate: d.total > 0 ? Math.round((d.sold / d.total) * 100) : 0,
        adherenceRate: d.trackedSold > 0 ? Math.round((d.adherent / d.trackedSold) * 100) : null,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredLeads, filteredEvents, franchiseMap]);

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ['Modelo', 'Recomendado', 'Vendido', 'Conversão', 'Score Médio'];
    const rows = modelPerformance.map(m => [m.model, m.recommended, m.sold, `${m.conversionRate}%`, m.avgScore]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-qi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingLeads) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const maxFunnel = Math.max(...funnelData.map(f => f.count), 1);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-3 px-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">6 meses</SelectItem>
                <SelectItem value="365">12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFranchise} onValueChange={setFilterFranchise}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Franquia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas franquias</SelectItem>
                {franchises.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {cities.slice(0, 50).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Modelo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos modelos</SelectItem>
                {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV} className="ml-auto h-9 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* BLOCK 1: Conversion Funnel */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Funil de Conversão do Quintal Ideal
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-2.5">
            {funnelData.map((step, i) => {
              const prevCount = i > 0 ? funnelData[i - 1].count : step.count;
              const dropRate = prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;
              const pct = maxFunnel > 0 ? Math.round((step.count / maxFunnel) * 100) : 0;
              return (
                <motion.div key={step.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[140px] sm:w-[180px] shrink-0">
                      <span className="text-xs sm:text-sm font-medium text-foreground">{step.label}</span>
                    </div>
                    <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-lg"
                        style={{ backgroundColor: `hsl(207, ${90 - i * 12}%, ${42 + i * 6}%)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                      />
                      <span className="absolute inset-0 flex items-center px-2.5 text-xs font-bold text-foreground">
                        {step.count.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {i > 0 && (
                      <div className="w-[60px] shrink-0 text-right">
                        <span className={`text-[10px] sm:text-xs font-semibold ${dropRate > 50 ? 'text-destructive' : dropRate > 30 ? 'text-warning' : 'text-success'}`}>
                          {dropRate > 0 ? `-${dropRate}%` : '0%'}
                        </span>
                      </div>
                    )}
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 rotate-90" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BLOCK 2: Model Performance */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Performance dos Modelos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {modelPerformance.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 font-semibold text-muted-foreground">Modelo</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Rec.</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Vend.</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Conv.</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelPerformance.map((m, i) => (
                      <motion.tr key={m.model} className="border-b border-border/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                        <td className="py-2 font-medium text-foreground">{m.model}</td>
                        <td className="py-2 text-right text-muted-foreground">{m.recommended}</td>
                        <td className="py-2 text-right text-muted-foreground">{m.sold}</td>
                        <td className="py-2 text-right">
                          <span className={`font-semibold ${m.conversionRate >= 30 ? 'text-success' : m.conversionRate >= 15 ? 'text-warning' : 'text-destructive'}`}>
                            {m.conversionRate}%
                          </span>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">{m.avgScore}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BLOCK 3: Adherence */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Aderência: Recomendado vs Vendido
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {adherenceData.adherenceRate === null ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-1">Sem dados de modelo vendido registrados</p>
                <p className="text-[11px] text-muted-foreground">Quando vendas forem registradas com o modelo vendido, a aderência aparecerá aqui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${adherenceData.adherenceRate >= 70 ? 'text-success' : adherenceData.adherenceRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                      {adherenceData.adherenceRate}%
                    </div>
                    <p className="text-[10px] text-muted-foreground">Aderência geral</p>
                  </div>
                  <div className="flex-1 space-y-1 text-xs text-muted-foreground">
                    <p>{adherenceData.matches} de {adherenceData.tracked} vendas corresponderam à recomendação</p>
                  </div>
                </div>
                {adherenceData.faithful.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Mais fiéis à recomendação</p>
                    <div className="space-y-1">
                      {adherenceData.faithful.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{f.model}</span>
                          <Badge variant="outline" className="text-[10px]">{f.rate}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {adherenceData.changed.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Trocas mais frequentes</p>
                    <div className="space-y-1">
                      {adherenceData.changed.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{c.change}</span>
                          <span className="text-muted-foreground">{c.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BLOCK 4: Hot Leads */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" /> Leads Quentes
            <Badge variant="destructive" className="text-[10px] ml-1">{hotLeads.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {hotLeads.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Nenhum lead quente no período</p>
          ) : (
            <div className="space-y-2">
              {hotLeads.slice(0, isMobile ? 5 : 10).map((l, i) => (
                <motion.div
                  key={l.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/lead/${l.id}`)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{l.nome || 'Sem nome'}</p>
                    <p className="text-[10px] text-muted-foreground">{l.cidade || 'Sem cidade'} · {franchiseMap[l.franquia_id || ''] || 'Sem franquia'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px]">{l.modelo_recomendado || '—'}</Badge>
                    <p className="text-[10px] font-semibold text-primary mt-0.5">{l.pontuacao_quintal || 0}%</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BLOCK 5: City Performance */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Performance por Cidade
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {cityPerformance.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 font-semibold text-muted-foreground">Cidade</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Leads</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Vendas</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground">Conv.</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground hidden sm:table-cell">Score</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground hidden sm:table-cell">Top Modelo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityPerformance.slice(0, 10).map((c, i) => (
                      <motion.tr key={c.city} className="border-b border-border/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                        <td className="py-2 font-medium text-foreground truncate max-w-[120px]">{c.city}</td>
                        <td className="py-2 text-right text-muted-foreground">{c.total}</td>
                        <td className="py-2 text-right text-muted-foreground">{c.sold}</td>
                        <td className="py-2 text-right">
                          <span className={`font-semibold ${c.conversionRate >= 20 ? 'text-success' : c.conversionRate >= 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {c.conversionRate}%
                          </span>
                        </td>
                        <td className="py-2 text-right text-muted-foreground hidden sm:table-cell">{c.avgScore}</td>
                        <td className="py-2 text-right text-muted-foreground hidden sm:table-cell truncate max-w-[80px]">{c.topModel}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BLOCK 6: Lead Profiles */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Perfil dos Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {profileData.profiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">Por Objetivo</p>
                  <div className="flex flex-wrap gap-2">
                    {profileData.objectives.map(o => (
                      <div key={o.name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.color }} />
                        <span className="text-xs text-foreground capitalize">{o.name}</span>
                        <span className="text-xs font-bold text-foreground">{o.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">Por Perfil Detectado</p>
                  <ChartContainer config={{}} className="h-[160px] w-full">
                    <BarChart data={profileData.profiles} margin={{ left: -10, right: 5, top: 5, bottom: 0 }} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {profileData.profiles.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BLOCK 7: Franchise Performance */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Performance das Franquias no Quintal Ideal
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {franchisePerformance.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
          ) : isMobile ? (
            <div className="space-y-3">
              {franchisePerformance.slice(0, 10).map((f, i) => (
                <motion.div key={f.id} className="p-3 rounded-xl bg-muted/30 space-y-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground truncate">{f.name}</span>
                    <Badge variant="outline" className="text-[10px]">{f.conversionRate}% conv.</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-bold text-foreground">{f.total}</p><p className="text-[10px] text-muted-foreground">Leads</p></div>
                    <div><p className="text-lg font-bold text-foreground">{f.hot}</p><p className="text-[10px] text-muted-foreground">🔥 Quentes</p></div>
                    <div><p className="text-lg font-bold text-foreground">{f.sold}</p><p className="text-[10px] text-muted-foreground">Vendas</p></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 font-semibold text-muted-foreground">Franquia</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Leads</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">🔥</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">WhatsApp</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Atend.</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Vendas</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Conv.</th>
                    <th className="text-right py-2 font-semibold text-muted-foreground">Aderência</th>
                  </tr>
                </thead>
                <tbody>
                  {franchisePerformance.map((f, i) => (
                    <motion.tr key={f.id} className="border-b border-border/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="py-2 font-medium text-foreground truncate max-w-[160px]">{f.name}</td>
                      <td className="py-2 text-right text-muted-foreground">{f.total}</td>
                      <td className="py-2 text-right text-muted-foreground">{f.hot}</td>
                      <td className="py-2 text-right text-muted-foreground">{f.whatsapp}</td>
                      <td className="py-2 text-right text-muted-foreground">{f.contatado}</td>
                      <td className="py-2 text-right text-muted-foreground">{f.sold}</td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold ${f.conversionRate >= 20 ? 'text-success' : f.conversionRate >= 10 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {f.conversionRate}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-muted-foreground">{f.adherenceRate !== null ? `${f.adherenceRate}%` : '—'}</td>
                    </motion.tr>
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
