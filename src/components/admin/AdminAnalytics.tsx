import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Activity, TrendingDown, Zap, Smartphone, Monitor, Tablet, AlertCircle, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface AnalyticsEvent {
  id: string;
  session_id: string;
  event_name: string;
  franchise_id: string | null;
  city: string | null;
  device_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const FUNNEL_STEPS = [
  { key: 'landing_page_viewed', label: 'Página visitada' },
  { key: 'quiz_started', label: 'Teste iniciado' },
  { key: 'photo_uploaded', label: 'Fotos enviadas' },
  { key: 'quiz_completed', label: 'Quiz completo' },
  { key: 'result_viewed', label: 'Resultado visto' },
  { key: 'lead_created', label: 'Lead gerado' },
  { key: 'whatsapp_clicked', label: 'WhatsApp clicado' },
];

const FUNNEL_COLORS = ['#1e88e5', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb', '#e3f2fd', '#f5f5f5'];

interface AdminAnalyticsProps {
  franchiseMap: Record<string, string>;
  role?: string | null;
}

export function AdminAnalytics({ franchiseMap, role }: AdminAnalyticsProps) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState('30');
  const [filterFranchise, setFilterFranchise] = useState('all');
  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    loadEvents();
  }, [periodDays]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    const since = new Date();
    since.setDate(since.getDate() - parseInt(periodDays));
    
    try {
      const { data, error: queryError } = await supabase
        .from('analytics_events')
        .select('id, session_id, event_name, franchise_id, city, device_type, utm_source, utm_medium, utm_campaign, metadata, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000);
      
      if (queryError) throw queryError;
      setEvents((data || []) as AnalyticsEvent[]);
    } catch (_err) {
      setError('Não foi possível carregar analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Filter events by franchise if selected
  const filteredEvents = useMemo(() => {
    if (filterFranchise === 'all') return events;
    return events.filter(e => e.franchise_id === filterFranchise);
  }, [events, filterFranchise]);

  // Funnel data
  const funnelData = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    FUNNEL_STEPS.forEach(s => { counts[s.key] = new Set(); });
    
    filteredEvents.forEach(e => {
      if (counts[e.event_name]) {
        counts[e.event_name].add(e.session_id);
      }
    });

    const firstCount = counts[FUNNEL_STEPS[0].key].size || 1;
    return FUNNEL_STEPS.map((step, i) => {
      const count = counts[step.key].size;
      const prevCount = i > 0 ? counts[FUNNEL_STEPS[i - 1].key].size : count;
      const dropoff = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
      const rate = Math.round((count / firstCount) * 100);
      return { ...step, count, dropoff: i > 0 ? dropoff : 0, rate, fill: FUNNEL_COLORS[i] };
    });
  }, [filteredEvents]);

  // Per-franchise funnel comparison (super_admin only)
  const franchiseFunnels = useMemo(() => {
    if (!isSuperAdmin) return [];
    const franchiseIds = [...new Set(events.filter(e => e.franchise_id).map(e => e.franchise_id!))];
    return franchiseIds.map(fid => {
      const fEvents = events.filter(e => e.franchise_id === fid);
      const counts: Record<string, Set<string>> = {};
      FUNNEL_STEPS.forEach(s => { counts[s.key] = new Set(); });
      fEvents.forEach(e => { if (counts[e.event_name]) counts[e.event_name].add(e.session_id); });
      const visits = counts['landing_page_viewed'].size;
      const leads = counts['lead_created'].size;
      const whatsapp = counts['whatsapp_clicked'].size;
      const convRate = visits > 0 ? Math.round((leads / visits) * 100) : 0;
      return {
        id: fid,
        name: franchiseMap[fid] || fid.slice(0, 8),
        visits,
        quizStarted: counts['quiz_started'].size,
        leads,
        whatsapp,
        convRate,
      };
    }).sort((a, b) => b.visits - a.visits);
  }, [events, isSuperAdmin, franchiseMap]);

  // Question analysis
  const questionStats = useMemo(() => {
    const questionEvents = filteredEvents.filter(e => e.event_name === 'quiz_question_answered');
    const byQuestion: Record<number, Record<string, number>> = {};
    
    questionEvents.forEach(e => {
      const q = (e.metadata as Record<string, unknown>)?.question_number as number;
      const a = (e.metadata as Record<string, unknown>)?.answer as string;
      if (q && a) {
        if (!byQuestion[q]) byQuestion[q] = {};
        byQuestion[q][a] = (byQuestion[q][a] || 0) + 1;
      }
    });

    return Object.entries(byQuestion)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([qNum, answers]) => ({
        question: Number(qNum),
        total: Object.values(answers).reduce((s, v) => s + v, 0),
        topAnswer: Object.entries(answers).sort(([, a], [, b]) => b - a)[0]?.[0] || '-',
        answers,
      }));
  }, [filteredEvents]);

  // Device breakdown
  const deviceStats = useMemo(() => {
    const counts: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
    const sessions = new Set<string>();
    filteredEvents.forEach(e => {
      if (!sessions.has(e.session_id) && e.device_type) {
        sessions.add(e.session_id);
        counts[e.device_type] = (counts[e.device_type] || 0) + 1;
      }
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(counts).map(([device, count]) => ({
      device,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [filteredEvents]);

  // UTM breakdown
  const utmStats = useMemo(() => {
    const sources: Record<string, number> = {};
    const sessions = new Set<string>();
    filteredEvents.forEach(e => {
      if (!sessions.has(e.session_id)) {
        sessions.add(e.session_id);
        const src = e.utm_source || 'orgânico';
        sources[src] = (sources[src] || 0) + 1;
      }
    });
    return Object.entries(sources)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));
  }, [filteredEvents]);

  // Model stats
  const modelStats = useMemo(() => {
    const models: Record<string, number> = {};
    filteredEvents
      .filter(e => e.event_name === 'quiz_completed')
      .forEach(e => {
        const m = (e.metadata as Record<string, unknown>)?.modelo_recomendado as string;
        if (m) models[m] = (models[m] || 0) + 1;
      });
    return Object.entries(models)
      .sort(([, a], [, b]) => b - a)
      .map(([model, count]) => ({ model, count }));
  }, [filteredEvents]);

  const totalSessions = useMemo(() => new Set(filteredEvents.map(e => e.session_id)).size, [filteredEvents]);

  const deviceIcon = (d: string) => {
    if (d === 'mobile') return <Smartphone className="w-4 h-4" />;
    if (d === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={loadEvents} className="gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Product Analytics</span>
          <span className="text-xs text-muted-foreground">({totalSessions} sessões)</span>
        </div>
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Funnel */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnelData[0].count === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Sem dados de analytics ainda. Os eventos serão registrados conforme os usuários interagem com o quiz.</p>
          ) : (
            <div className="space-y-2">
              {funnelData.map((step, i) => (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-muted-foreground truncate">{step.label}</div>
                  <div className="flex-1 relative h-8 rounded-lg overflow-hidden bg-muted/50">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                      style={{
                        width: `${step.rate}%`,
                        backgroundColor: step.fill,
                        minWidth: step.count > 0 ? '2rem' : 0,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-bold text-foreground z-10">{step.count}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 z-10">({step.rate}%)</span>
                    </div>
                  </div>
                  {i > 0 && step.dropoff > 0 && (
                    <span className="text-[10px] text-red-500 font-medium w-14 text-right">-{step.dropoff}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Question Analysis */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Análise por Pergunta</CardTitle>
          </CardHeader>
          <CardContent>
            {questionStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {questionStats.map(q => (
                  <div key={q.question} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <span className="text-xs font-bold text-foreground">Pergunta {q.question}</span>
                      <p className="text-[10px] text-muted-foreground">{q.total} respostas</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">{q.topAnswer}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Stats */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Modelos Recomendados</CardTitle>
          </CardHeader>
          <CardContent>
            {modelStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <ChartContainer config={{}} className="h-[200px]">
                <BarChart data={modelStats} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="model" tick={{ fontSize: 11 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(207, 90%, 42%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deviceStats.map(d => (
                <div key={d.device} className="flex items-center gap-3">
                  {deviceIcon(d.device)}
                  <span className="text-sm capitalize flex-1">{d.device}</span>
                  <span className="text-sm font-bold">{d.count}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{d.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* UTM Sources */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Origem do Tráfego
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utmStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <ChartContainer config={{}} className="h-[200px]">
                <BarChart data={utmStats}>
                  <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(207, 90%, 54%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
