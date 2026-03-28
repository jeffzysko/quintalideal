import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Users, Link2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminReferralMetricsProps {
  leads: { referred_by: string | null; ref_code: string | null }[];
}

export const AdminReferralMetrics = memo(function AdminReferralMetrics({ leads }: AdminReferralMetricsProps) {
  const metrics = useMemo(() => {
    let totalWithRefCode = 0, totalReferred = 0;
    const refCounts: Record<string, number> = {};
    for (const l of leads) {
      if (l.ref_code) totalWithRefCode++;
      if (l.referred_by) {
        totalReferred++;
        refCounts[l.referred_by] = (refCounts[l.referred_by] || 0) + 1;
      }
    }
    const referralRate = totalWithRefCode > 0 ? Math.round((totalReferred / totalWithRefCode) * 100) : 0;
    const topReferrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalWithRefCode, totalReferred, referralRate, topReferrers };
  }, [leads]);

  const miniKpis = [
    { icon: Link2, label: 'Links gerados', value: metrics.totalWithRefCode, iconBg: 'icon-bg-pink', color: 'text-secondary' },
    { icon: Users, label: 'Via convite', value: metrics.totalReferred, iconBg: 'icon-bg-blue', color: 'text-primary' },
    { icon: TrendingUp, label: 'Taxa de convite', value: `${metrics.referralRate}%`, iconBg: 'icon-bg-green', color: 'text-emerald-600' },
  ];

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg icon-bg-blue flex items-center justify-center">
            <Share2 className="w-4 h-4 text-primary" />
          </div>
          Métricas de Viralização
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {miniKpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.15) }}
              className="text-center p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${kpi.iconBg} flex items-center justify-center mx-auto mb-2`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-lg font-extrabold text-foreground">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {metrics.topReferrers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Top Referências</p>
            <div className="space-y-1.5">
              {metrics.topReferrers.map(([code, count], i) => (
                <motion.div
                  key={code}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.15) }}
                  className="flex justify-between items-center text-xs py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="font-mono text-muted-foreground">{code}</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{count} convites</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {metrics.topReferrers.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Nenhum convite registrado ainda.</p>
        )}
      </CardContent>
    </Card>
  );
});
