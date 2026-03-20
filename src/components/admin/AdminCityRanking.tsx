import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, TrendingUp, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface CityMetric {
  cidade: string;
  count: number;
  avgScore: number;
}

interface AdminCityRankingProps {
  leads: { cidade: string | null; pontuacao_quintal: number | null }[];
}

function MedalIcon({ position }: { position: number }) {
  if (position === 0) return <Trophy className="w-4 h-4 medal-gold" />;
  if (position === 1) return <Trophy className="w-4 h-4 medal-silver" />;
  if (position === 2) return <Trophy className="w-4 h-4 medal-bronze" />;
  return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{position + 1}º</span>;
}

export const AdminCityRanking = memo(function AdminCityRanking({ leads }: AdminCityRankingProps) {
  const cityData = useMemo((): CityMetric[] => {
    const map: Record<string, { count: number; total: number }> = {};
    leads.forEach(l => {
      if (!l.cidade) return;
      if (!map[l.cidade]) map[l.cidade] = { count: 0, total: 0 };
      map[l.cidade].count++;
      map[l.cidade].total += l.pontuacao_quintal || 0;
    });
    return Object.entries(map)
      .map(([cidade, d]) => ({ cidade, count: d.count, avgScore: Math.round(d.total / d.count) }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const maxCount = Math.max(...cityData.map(c => c.count), 1);

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg icon-bg-pink flex items-center justify-center">
            <MapPin className="w-4 h-4 text-secondary" />
          </div>
          Ranking de Cidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cityData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Sem dados</p>
        ) : (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {cityData.slice(0, 15).map((city, i) => (
              <motion.div
                key={city.cidade}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.15) }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <MedalIcon position={i} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{city.cidade}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">{city.count} leads</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {city.avgScore}%
                    </span>
                  </div>
                </div>
                <div className="w-20 bg-muted rounded-full h-2 overflow-hidden shrink-0">
                  <div
                    className="h-full progress-gradient-pink rounded-full transition-all duration-500"
                    style={{ width: `${(city.count / maxCount) * 100}%` }}
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
