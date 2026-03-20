import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface FranchiseMetric {
  name: string;
  count: number;
  avgScore: number;
}

interface AdminFranchiseRankingProps {
  leads: { franquia_id: string | null; pontuacao_quintal: number | null }[];
  franchiseMap: Record<string, string>;
}

function MedalIcon({ position }: { position: number }) {
  if (position === 0) return <Trophy className="w-4 h-4 medal-gold" />;
  if (position === 1) return <Trophy className="w-4 h-4 medal-silver" />;
  if (position === 2) return <Trophy className="w-4 h-4 medal-bronze" />;
  return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{position + 1}º</span>;
}

export const AdminFranchiseRanking = memo(function AdminFranchiseRanking({ leads, franchiseMap }: AdminFranchiseRankingProps) {
  const data = useMemo((): FranchiseMetric[] => {
    const map: Record<string, { count: number; total: number }> = {};
    leads.forEach(l => {
      const name = l.franquia_id ? (franchiseMap[l.franquia_id] || 'Sem franquia') : 'Sem franquia';
      if (!map[name]) map[name] = { count: 0, total: 0 };
      map[name].count++;
      map[name].total += l.pontuacao_quintal || 0;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, count: d.count, avgScore: Math.round(d.total / d.count) }))
      .sort((a, b) => b.count - a.count);
  }, [leads, franchiseMap]);

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg icon-bg-blue flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          Ranking de Franquias
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Sem dados</p>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {data.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.15) }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <MedalIcon position={i} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{f.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">{f.count} leads</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {f.avgScore}%
                    </span>
                  </div>
                </div>
                <div className="w-20 bg-muted rounded-full h-2 overflow-hidden shrink-0">
                  <div
                    className="h-full progress-gradient-blue rounded-full transition-all duration-500"
                    style={{ width: `${(f.count / maxCount) * 100}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
