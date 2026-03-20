import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Clock, Target, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Lead {
  id: string;
  franquia_id: string | null;
  status_lead: string;
  pontuacao_quintal: number | null;
  created_at: string;
  updated_at: string;
}

interface LeadActivity {
  lead_id: string;
  activity_type: string;
  created_at: string;
}

interface AdminPerformanceComparisonProps {
  leads: Lead[];
  activities: LeadActivity[];
  franchiseMap: Record<string, string>;
}

interface FranchisePerformance {
  id: string;
  name: string;
  totalLeads: number;
  sold: number;
  lost: number;
  conversionRate: number;
  avgResponseTimeHours: number | null;
  avgScore: number;
  contactedRate: number;
}

export const AdminPerformanceComparison = memo(function AdminPerformanceComparison({ leads, activities, franchiseMap }: AdminPerformanceComparisonProps) {
  const performances = useMemo(() => {
    // Group leads by franchise
    const byFranchise: Record<string, Lead[]> = {};
    leads.forEach(l => {
      if (!l.franquia_id) return;
      if (!byFranchise[l.franquia_id]) byFranchise[l.franquia_id] = [];
      byFranchise[l.franquia_id].push(l);
    });

    // Build activity lookup: first status_change per lead
    // (activities are pre-filtered to status_change by the query)
    const firstContact: Record<string, string> = {};
    [...activities]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach(a => {
        if (!firstContact[a.lead_id]) {
          firstContact[a.lead_id] = a.created_at;
        }
      });

    const results: FranchisePerformance[] = Object.entries(byFranchise).map(([fId, fLeads]) => {
      const total = fLeads.length;
      let sold = 0, lost = 0, contacted = 0;
      for (const l of fLeads) {
        if (l.status_lead === 'vendido') sold++;
        else if (l.status_lead === 'perdido') lost++;
        if (l.status_lead !== 'novo') contacted++;
      }

      // Avg response time (lead created_at → first status_change)
      const responseTimes: number[] = [];
      fLeads.forEach(l => {
        const fc = firstContact[l.id];
        if (fc) {
          const diff = new Date(fc).getTime() - new Date(l.created_at).getTime();
          if (diff > 0) responseTimes.push(diff / (1000 * 60 * 60)); // hours
        }
      });
      const avgResponseTime = responseTimes.length > 0
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : null;

      const avgScore = total > 0
        ? Math.round(fLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / total)
        : 0;

      return {
        id: fId,
        name: franchiseMap[fId] || 'Desconhecida',
        totalLeads: total,
        sold,
        lost,
        conversionRate: total > 0 ? Math.round((sold / total) * 100) : 0,
        avgResponseTimeHours: avgResponseTime,
        avgScore,
        contactedRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
      };
    });

    return results.sort((a, b) => b.conversionRate - a.conversionRate);
  }, [leads, activities, franchiseMap]);

  const maxConversion = Math.max(...performances.map(p => p.conversionRate), 1);

  if (performances.length === 0) {
    return (
      <Card className="card-premium border-border/40">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sem dados de performance
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Comparativo de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground text-xs">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Franquia</th>
                <th className="text-center py-2 px-2">Leads</th>
                <th className="text-center py-2 px-2">Conversão</th>
                <th className="text-center py-2 px-2">Tempo Resposta</th>
                <th className="text-center py-2 px-2">Contatados</th>
                <th className="text-center py-2 px-2">Média Quintal</th>
              </tr>
            </thead>
            <tbody>
              {performances.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-2 font-bold text-muted-foreground">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </td>
                  <td className="py-2.5 px-2 font-semibold">{p.name}</td>
                  <td className="py-2.5 px-2 text-center">{p.totalLeads}</td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: p.conversionRate >= 20
                              ? 'hsl(152, 70%, 40%)'
                              : p.conversionRate >= 10
                              ? 'hsl(45, 95%, 50%)'
                              : 'hsl(0, 70%, 55%)',
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(p.conversionRate / maxConversion) * 100}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                        />
                      </div>
                      <span className="font-semibold text-xs w-10">{p.conversionRate}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        p.avgResponseTimeHours === null
                          ? 'text-muted-foreground'
                          : p.avgResponseTimeHours <= 2
                          ? 'border-emerald-500/30 text-emerald-600'
                          : p.avgResponseTimeHours <= 24
                          ? 'border-amber-500/30 text-amber-600'
                          : 'border-destructive/30 text-destructive'
                      }`}
                    >
                      {p.avgResponseTimeHours === null
                        ? 'N/A'
                        : p.avgResponseTimeHours < 1
                        ? `${Math.round(p.avgResponseTimeHours * 60)}min`
                        : `${p.avgResponseTimeHours}h`}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs">{p.contactedRate}%</td>
                  <td className="py-2.5 px-2 text-center text-xs font-semibold">{p.avgScore}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2">
          {performances.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-muted/30 p-3 border border-border/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                </span>
                <span className="text-sm font-semibold truncate">{p.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="w-3 h-3" />
                  <span>{p.totalLeads} leads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="font-semibold">{p.conversionRate}% conversão</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {p.avgResponseTimeHours === null
                      ? 'Sem dados'
                      : p.avgResponseTimeHours < 1
                      ? `${Math.round(p.avgResponseTimeHours * 60)}min resposta`
                      : `${p.avgResponseTimeHours}h resposta`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BarChart3 className="w-3 h-3" />
                  <span>Média {p.avgScore}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
