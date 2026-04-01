import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Trophy, Star, Flame, TrendingUp, Zap, Target, Medal, Crown, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';
import type { LeadRow } from '@/lib/lead-constants';

interface AchievementsDashboardProps {
  franchiseId: string;
  leads: LeadRow[];
}

interface Achievement {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  color: string;
  bg: string;
}

export function AchievementsDashboard({ franchiseId, leads }: AchievementsDashboardProps) {
  const now = new Date();

  // Fetch goals for the last 6 months
  const { data: goals = [] } = useQuery({
    queryKey: ['franchise-goals-history', franchiseId],
    queryFn: async () => {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const { data } = await supabase
        .from('franchise_goals' as any)
        .select('*')
        .eq('franchise_id', franchiseId)
        .gte('year', sixMonthsAgo.getFullYear())
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      return (data || []) as { month: number; year: number; sales_goal: number }[];
    },
    enabled: !!franchiseId,
    staleTime: 5 * 60 * 1000,
  });

  // Monthly data: leads, sales, goals for last 6 months
  const monthlyData = useMemo(() => {
    const months: { key: string; label: string; month: number; year: number; leads: number; sold: number; goal: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      months.push({ key: `${y}-${m}`, label, month: m, year: y, leads: 0, sold: 0, goal: 0 });
    }

    leads.forEach(l => {
      const d = new Date(l.created_at);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const entry = months.find(e => e.month === m && e.year === y);
      if (entry) {
        entry.leads++;
        if (l.status_lead === 'vendido') entry.sold++;
      }
    });

    goals.forEach(g => {
      const entry = months.find(e => e.month === g.month && e.year === g.year);
      if (entry) entry.goal = g.sales_goal;
    });

    return months;
  }, [leads, goals]);

  // Current month stats
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;

  const soldTotal = leads.filter(l => l.status_lead === 'vendido').length;
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => (l.pontuacao_quintal || 0) >= 78).length;
  const contactedIn24h = leads.filter(l => l.status_lead !== 'novo').length;
  const monthsMetGoal = monthlyData.filter(m => m.goal > 0 && m.sold >= m.goal).length;

  // Streak: consecutive months meeting goal (from most recent)
  const streak = useMemo(() => {
    let count = 0;
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      const m = monthlyData[i];
      if (m.goal > 0 && m.sold >= m.goal) count++;
      else if (m.goal > 0) break;
    }
    return count;
  }, [monthlyData]);

  // Achievements
  const achievements: Achievement[] = useMemo(() => [
    {
      id: 'first-sale',
      icon: Star,
      title: 'Primeira Venda',
      description: 'Feche sua primeira venda',
      unlocked: soldTotal >= 1,
      progress: Math.min(soldTotal, 1),
      maxProgress: 1,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'five-sales',
      icon: Trophy,
      title: 'Top Vendedor',
      description: 'Alcance 5 vendas totais',
      unlocked: soldTotal >= 5,
      progress: Math.min(soldTotal, 5),
      maxProgress: 5,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      id: 'ten-sales',
      icon: Crown,
      title: 'Rei das Vendas',
      description: 'Alcance 10 vendas totais',
      unlocked: soldTotal >= 10,
      progress: Math.min(soldTotal, 10),
      maxProgress: 10,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
    {
      id: 'goal-master',
      icon: Target,
      title: 'Cumpridor de Metas',
      description: 'Bata a meta em 3 meses',
      unlocked: monthsMetGoal >= 3,
      progress: Math.min(monthsMetGoal, 3),
      maxProgress: 3,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      id: 'streak-2',
      icon: Flame,
      title: 'Em Chamas!',
      description: 'Bata a meta 2 meses seguidos',
      unlocked: streak >= 2,
      progress: Math.min(streak, 2),
      maxProgress: 2,
      color: 'text-orange-600',
      bg: 'bg-orange-500/10',
    },
    {
      id: 'lead-magnet',
      icon: Zap,
      title: 'Lead Magnet',
      description: 'Receba 50 leads',
      unlocked: totalLeads >= 50,
      progress: Math.min(totalLeads, 50),
      maxProgress: 50,
      color: 'text-sky-600',
      bg: 'bg-sky-500/10',
    },
    {
      id: 'hot-hunter',
      icon: Rocket,
      title: 'Caçador de Ouro',
      description: 'Tenha 10 leads quentes',
      unlocked: hotLeads >= 10,
      progress: Math.min(hotLeads, 10),
      maxProgress: 10,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
    },
    {
      id: 'fast-responder',
      icon: Medal,
      title: 'Resposta Rápida',
      description: 'Contate 80% dos leads',
      unlocked: totalLeads > 0 && (contactedIn24h / totalLeads) >= 0.8,
      progress: totalLeads > 0 ? Math.min(Math.round((contactedIn24h / totalLeads) * 100), 100) : 0,
      maxProgress: 100,
      color: 'text-teal-600',
      bg: 'bg-teal-500/10',
    },
  ], [soldTotal, monthsMetGoal, streak, totalLeads, hotLeads, contactedIn24h]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const chartConfig = {
    sold: { label: 'Vendas', color: 'hsl(var(--primary))' },
    goal: { label: 'Meta', color: 'hsl(var(--muted-foreground) / 0.3)' },
  };

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat icon={Trophy} label="Vendas totais" value={soldTotal} color="text-emerald-600" bg="bg-emerald-500/10" />
        <MiniStat icon={Flame} label="Sequência" value={`${streak} ${streak === 1 ? 'mês' : 'meses'}`} color="text-orange-600" bg="bg-orange-500/10" />
        <MiniStat icon={Target} label="Metas batidas" value={monthsMetGoal} color="text-primary" bg="bg-primary/10" />
        <MiniStat icon={Medal} label="Conquistas" value={`${unlockedCount}/${achievements.length}`} color="text-violet-600" bg="bg-violet-500/10" />
      </div>

      {/* Monthly progress chart */}
      <Card className="card-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Vendas vs Meta (últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={monthlyData} barGap={2}>
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="goal" fill="hsl(var(--muted-foreground) / 0.15)" radius={[4, 4, 0, 0]} name="Meta" />
              <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Vendas" />
            </BarChart>
          </ChartContainer>

          {/* Month-over-month comparison */}
          {previousMonth && (
            <div className="mt-3 flex items-center gap-4 text-xs">
              <ComparisonPill
                label="Leads"
                current={currentMonth?.leads || 0}
                previous={previousMonth.leads}
              />
              <ComparisonPill
                label="Vendas"
                current={currentMonth?.sold || 0}
                previous={previousMonth.sold}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements grid */}
      <Card className="card-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Conquistas ({unlockedCount}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border p-3 flex items-start gap-3 transition-all ${
                  a.unlocked
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border/50 bg-muted/20 opacity-70'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${a.unlocked ? a.bg : 'bg-muted/60'} flex items-center justify-center shrink-0`}>
                  <a.icon className={`w-5 h-5 ${a.unlocked ? a.color : 'text-muted-foreground/50'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${a.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {a.title}
                    </p>
                    {a.unlocked && <span className="text-xs">✅</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{a.description}</p>
                  {!a.unlocked && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={(a.progress / a.maxProgress) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground font-medium">{a.progress}/{a.maxProgress}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-premium rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
    </motion.div>
  );
}

function ComparisonPill({ label, current, previous }: { label: string; current: number; previous: number }) {
  const diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
      isUp ? 'bg-emerald-500/10 text-emerald-700' : isDown ? 'bg-red-500/10 text-red-700' : 'bg-muted text-muted-foreground'
    }`}>
      {label}: {current}
      {diff !== 0 && (
        <span className="font-bold">
          {isUp ? '↑' : '↓'}{Math.abs(diff)}%
        </span>
      )}
    </span>
  );
}
