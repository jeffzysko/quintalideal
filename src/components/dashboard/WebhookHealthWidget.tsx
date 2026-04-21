import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Webhook, CheckCircle2, XCircle, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
  franchiseId: string;
}

interface WebhookLog {
  id: string;
  success: boolean;
  http_status: number | null;
  error_message: string | null;
  created_at: string;
  attempt: number;
  event_type: string;
}

export function WebhookHealthWidget({ franchiseId }: Props) {
  const navigate = useNavigate();

  const { data: franchise } = useQuery({
    queryKey: ['webhook-config', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchises')
        .select('webhook_url')
        .eq('id', franchiseId)
        .maybeSingle();
      return data;
    },
    enabled: !!franchiseId,
    staleTime: 60_000,
  });

  // Fetch last 7 days of webhook logs
  const { data: logs = [] } = useQuery({
    queryKey: ['webhook-health-7d', franchiseId],
    queryFn: async () => {
      const since = subDays(new Date(), 7).toISOString();
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('id, success, http_status, error_message, created_at, attempt, event_type')
        .eq('franchise_id', franchiseId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as WebhookLog[];
    },
    enabled: !!franchiseId && !!franchise?.webhook_url,
    staleTime: 30_000,
  });

  // Split logs into last 24h and 7-day for chart
  const { logs24h, chartData } = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recent = logs.filter(l => new Date(l.created_at).getTime() >= dayAgo);

    // Build 7-day chart data
    const days: { date: string; label: string; success: number; total: number; rate: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd/MM');
      const dayLogs = logs.filter(l => l.created_at.startsWith(dateStr));

      // Deduplicate by final attempt
      const finals = new Map<string, WebhookLog>();
      dayLogs.forEach(log => {
        const key = `${log.created_at.slice(0, 16)}-${log.event_type}`;
        const existing = finals.get(key);
        if (!existing || log.attempt > existing.attempt) finals.set(key, log);
      });

      const deliveries = Array.from(finals.values());
      const total = deliveries.length;
      const success = deliveries.filter(l => l.success).length;
      days.push({ date: dateStr, label, success, total, rate: total > 0 ? Math.round((success / total) * 100) : -1 });
    }

    return { logs24h: recent, chartData: days };
  }, [logs]);

  if (!franchise?.webhook_url) return null;
  if (logs.length === 0) return null;

  // 24h stats
  const finalAttempts = logs24h.reduce((acc, log) => {
    const key = `${log.created_at.slice(0, 16)}-${log.event_type}`;
    const existing = acc.get(key);
    if (!existing || log.attempt > existing.attempt) acc.set(key, log);
    return acc;
  }, new Map<string, WebhookLog>());

  const deliveries = Array.from(finalAttempts.values());
  const totalDeliveries = deliveries.length;
  const successCount = deliveries.filter(l => l.success).length;
  const failureCount = totalDeliveries - successCount;
  const successRate = totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 100;

  const lastFailure = logs24h.filter(l => !l.success)[0];
  const isHealthy = failureCount === 0;
  const isCritical = successRate < 50;

  // Trend: compare today vs yesterday from chartData
  const todayData = chartData[6];
  const yesterdayData = chartData[5];
  const todayRate = todayData?.total > 0 ? todayData.rate : null;
  const yesterdayRate = yesterdayData?.total > 0 ? yesterdayData.rate : null;
  const trendDiff = todayRate !== null && yesterdayRate !== null ? todayRate - yesterdayRate : null;

  // Check if chart has any data
  const hasChartData = chartData.some(d => d.total > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card
        className={cn(
          'card-premium-interactive',
          isCritical && 'border-destructive/30',
          !isHealthy && !isCritical && 'border-amber-300/40',
        )}
        onClick={() => navigate('/perfil#integracoes')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                isHealthy ? 'bg-emerald-500/10' : isCritical ? 'bg-destructive/10' : 'bg-amber-500/10'
              )}>
                <Webhook className={cn(
                  'w-4 h-4',
                  isHealthy ? 'text-emerald-600' : isCritical ? 'text-destructive' : 'text-amber-600'
                )} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Webhook CRM</h3>
                <p className="text-xs text-muted-foreground">Últimas 24h</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isHealthy ? 'default' : isCritical ? 'destructive' : 'secondary'}
                className="text-xs font-bold px-2 py-0.5"
              >
                {isHealthy ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Saudável</>
                ) : isCritical ? (
                  <><XCircle className="w-3 h-3 mr-1" /> Crítico</>
                ) : (
                  <><AlertTriangle className="w-3 h-3 mr-1" /> Atenção</>
                )}
              </Badge>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-extrabold tabular-nums text-foreground">{totalDeliveries}</p>
              <p className="text-xs text-muted-foreground font-medium">Envios</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center gap-1">
                <p className={cn('text-lg font-extrabold tabular-nums', isHealthy ? 'text-emerald-600' : isCritical ? 'text-destructive' : 'text-amber-600')}>
                  {successRate}%
                </p>
                {trendDiff !== null && (
                  <span className={cn(
                    'flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1 py-0.5',
                    trendDiff > 0 && 'text-emerald-600 bg-emerald-500/10',
                    trendDiff < 0 && 'text-destructive bg-destructive/10',
                    trendDiff === 0 && 'text-muted-foreground bg-muted/50',
                  )}>
                    {trendDiff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : trendDiff < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                    {trendDiff > 0 ? '+' : ''}{trendDiff}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium">Taxa de sucesso</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className={cn('text-lg font-extrabold tabular-nums', failureCount > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                {failureCount}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Falhas</p>
            </div>
          </div>

          {/* 7-day trend chart */}
          {hasChartData && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground font-semibold mb-1.5">Taxa de sucesso · 7 dias</p>
              <div className="h-[72px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.map(d => ({ ...d, rate: d.rate === -1 ? null : d.rate }))}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        if (d.total === 0) return null;
                        return (
                          <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-lg">
                            <p className="font-semibold">{d.label}</p>
                            <p className="text-muted-foreground">{d.success}/{d.total} envios · {d.rate}%</p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent failures */}
          {lastFailure && (
            <div className="mt-3 p-2.5 rounded-lg border border-destructive/20 bg-destructive/5">
              <p className="text-xs text-destructive font-medium">
                Última falha: {lastFailure.error_message || `HTTP ${lastFailure.http_status}`}
                <span className="text-muted-foreground font-normal ml-1">
                  · {formatDistanceToNow(new Date(lastFailure.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
