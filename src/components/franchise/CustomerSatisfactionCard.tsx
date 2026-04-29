import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { Heart, Star, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/empty-state';

interface CustomerSatisfactionCardProps {
  franchiseId: string;
}

interface ReviewRow {
  rating: number | null;
  would_recommend: boolean | null;
  submitted_at: string | null;
  created_at: string;
}

export function CustomerSatisfactionCard({ franchiseId }: CustomerSatisfactionCardProps) {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['post-sale-reviews-summary', franchiseId],
    queryFn: async () => {
      const since = subDays(new Date(), 90).toISOString();
      // post_sale_reviews has no franchise_id; join via post_sale_projects
      const { data } = await supabase
        .from('post_sale_reviews' as any)
        .select('rating, would_recommend, submitted_at, created_at, post_sale_projects!inner(franchise_id)')
        .eq('post_sale_projects.franchise_id', franchiseId)
        .not('submitted_at', 'is', null)
        .gte('submitted_at', since)
        .order('submitted_at', { ascending: false });
      return ((data as any) || []) as ReviewRow[];
    },
    enabled: !!franchiseId,
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    const valid = reviews.filter((r) => typeof r.rating === 'number' && r.rating! > 0);
    const total = valid.length;
    const avg = total > 0 ? valid.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
    const recommendCount = reviews.filter((r) => r.would_recommend === true).length;
    const recommendDenom = reviews.filter((r) => r.would_recommend !== null).length;
    const recommendPct = recommendDenom > 0 ? Math.round((recommendCount / recommendDenom) * 100) : 0;

    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      star: `${star}★`,
      count: valid.filter((r) => r.rating === star).length,
    }));

    return { total, avg, recommendPct, distribution };
  }, [reviews]);

  const chartConfig = {
    count: { label: 'Avaliações', color: 'hsl(var(--primary))' },
  };

  const barColors = ['hsl(var(--destructive))', 'hsl(var(--destructive) / 0.7)', 'hsl(var(--muted-foreground))', 'hsl(var(--primary) / 0.7)', 'hsl(var(--primary))'];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="card-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            O que seus clientes dizem
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse bg-muted/40 rounded-lg" />
          ) : stats.total === 0 ? (
            <EmptyState
              icon={Star}
              title="Nenhuma avaliação ainda"
              description="Compartilhe o link de avaliação com seus clientes após cada venda para começar a coletar feedback."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <MetricBox
                  icon={Star}
                  value={stats.avg.toFixed(1)}
                  suffix="★"
                  label="Média"
                  color="text-amber-500"
                  bg="bg-amber-500/10"
                />
                <MetricBox
                  icon={ThumbsUp}
                  value={`${stats.recommendPct}%`}
                  label="Recomendariam"
                  color="text-emerald-600"
                  bg="bg-emerald-500/10"
                />
                <MetricBox
                  icon={Heart}
                  value={stats.total}
                  label={stats.total === 1 ? 'Avaliação' : 'Avaliações'}
                  color="text-rose-600"
                  bg="bg-rose-500/10"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Distribuição (últimos 90 dias)</p>
                <ChartContainer config={chartConfig} className="h-[140px] w-full">
                  <BarChart data={stats.distribution}>
                    <XAxis dataKey="star" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={24} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.distribution.map((_, i) => (
                        <Cell key={i} fill={barColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricBox({
  icon: Icon,
  value,
  suffix,
  label,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  suffix?: string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-1.5`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <p className="text-lg font-bold text-foreground leading-tight">
        {value}
        {suffix && <span className="text-sm font-medium text-muted-foreground ml-0.5">{suffix}</span>}
      </p>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  );
}
