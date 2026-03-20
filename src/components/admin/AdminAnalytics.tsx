import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Activity, TrendingDown, Zap, Smartphone, Monitor, Tablet, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { QuizDropoffAnalysis } from './QuizDropoffAnalysis';

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

const FUNNEL_COLORS = ['hsl(207, 90%, 42%)', 'hsl(207, 90%, 48%)', 'hsl(207, 90%, 54%)', 'hsl(207, 70%, 60%)', 'hsl(207, 50%, 68%)', 'hsl(207, 40%, 76%)', 'hsl(207, 30%, 84%)'];

interface AdminAnalyticsProps {
  franchiseMap: Record<string, string>;
  role?: string | null;
}

export function AdminAnalytics({ franchiseMap }: AdminAnalyticsProps) {
  const [periodDays, setPeriodDays] = useState('30');
  const [filterFranchise, setFilterFranchise] = useState('all');

  // Fetch current + previous period for comparison
  const days = parseInt(periodDays);
  const { data: allEvents = [], isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['analytics-events', periodDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days * 2); // fetch double range for comparison
      const { data, error: queryError } = await supabase
        .from('analytics_events')
        .select('id, session_id, event_name, franchise_id, city, device_type, utm_source, utm_medium, utm_campaign, metadata, created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(10000);
      if (queryError) throw queryError;
      return (data || []) as AnalyticsEvent[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Split into current and previous periods
  const { events, previousPeriodEvents } = useMemo(() => {
    const now = Date.now();
    const currentStart = now - days * 86400000;
    const previousStart = currentStart - days * 86400000;
    const current: AnalyticsEvent[] = [];
    const previous: AnalyticsEvent[] = [];
    for (const e of allEvents) {
      const t = Date.parse(e.created_at);
      if (t >= currentStart) current.push(e);
      else if (t >= previousStart) previous.push(e);
    }
    return { events: current, previousPeriodEvents: previous };
  }, [allEvents, days]);

  const filteredEvents = useMemo(() => {
    if (filterFranchise === 'all') return events;
    return events.filter(e => e.franchise_id === filterFranchise);
  }, [events, filterFranchise]);

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

  // franchiseFunnels removed — now exclusive to Performance QI tab

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

  // modelStats removed — now exclusive to Performance QI tab

  const totalSessions = useMemo(() => new Set(filteredEvents.map(e => e.session_id)).size, [filteredEvents]);

  const deviceIcon = (d: string) => {
    if (d === 'mobile') return <Smartphone className="w-4 h-4" />;
    if (d === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground text-sm">Não foi possível carregar analytics.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground text-sm sm:text-base">Product Analytics</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">({totalSessions} sessões)</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {Object.keys(franchiseMap).length > 0 && (
            <Select value={filterFranchise} onValueChange={setFilterFranchise}>
              <SelectTrigger className="flex-1 sm:w-44 rounded-xl h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Todas franquias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas franquias</SelectItem>
                {Object.entries(franchiseMap).map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-32 sm:w-40 rounded-xl h-9 text-xs sm:text-sm shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Funnel */}
      <Card className="card-premium">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg icon-bg-blue flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {funnelData[0].count === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Sem dados de analytics ainda.</p>
          ) : (
            <div className="space-y-2">
              {funnelData.map((step, i) => (
                <div key={step.key} className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-20 sm:w-36 text-[10px] sm:text-xs text-muted-foreground truncate font-medium group-hover:text-foreground transition-colors">{step.label}</div>
                  <div className="flex-1 relative h-7 sm:h-9 rounded-xl overflow-hidden bg-muted/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out"
                      style={{
                        width: `${step.rate}%`,
                        background: `linear-gradient(90deg, ${step.fill}, ${FUNNEL_COLORS[Math.min(i + 1, FUNNEL_COLORS.length - 1)]})`,
                        minWidth: step.count > 0 ? '2rem' : 0,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 sm:px-3.5">
                      <span className="text-[10px] sm:text-xs font-extrabold text-foreground z-10">{step.count}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground ml-1 sm:ml-2 z-10 font-medium">({step.rate}%)</span>
                    </div>
                  </div>
                  {i > 0 && step.dropoff > 0 && (
                    <span className="text-[9px] sm:text-[10px] text-red-500 font-bold w-10 sm:w-14 text-right bg-red-500/8 px-1 sm:px-1.5 py-0.5 rounded-md shrink-0">-{step.dropoff}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Dropoff Analysis */}
      <QuizDropoffAnalysis events={filteredEvents} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Question Analysis */}
        <Card className="card-premium">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-sm font-bold">Análise por Pergunta</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {questionStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {questionStats.map(q => (
                  <div key={q.question} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground">P{q.question}</span>
                      <p className="text-[10px] text-muted-foreground">{q.total} resp.</p>
                    </div>
                    <span className="text-[10px] sm:text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium truncate max-w-[120px] sm:max-w-none">{q.topAnswer}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card className="card-premium">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-sm font-bold">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
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
        <Card className="card-premium">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Origem do Tráfego
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {utmStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <ChartContainer config={{}} className="h-[180px] sm:h-[200px] w-full">
                <BarChart data={utmStats} margin={{ left: -10, right: 5, top: 5, bottom: 0 }}>
                  <XAxis dataKey="source" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={45} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(207, 90%, 54%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Franchise funnel moved to Performance QI tab */}
    </div>
  );
}
