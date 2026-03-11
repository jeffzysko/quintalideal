import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, TrendingUp } from 'lucide-react';

interface CityMetric {
  cidade: string;
  count: number;
  avgScore: number;
}

interface AdminCityRankingProps {
  leads: { cidade: string | null; pontuacao_quintal: number | null }[];
}

export function AdminCityRanking({ leads }: AdminCityRankingProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary" /> Ranking de Cidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cityData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Sem dados</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {cityData.slice(0, 15).map((city, i) => (
              <div key={city.cidade} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{city.cidade}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{city.count} leads</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {city.avgScore}%
                    </span>
                  </div>
                </div>
                <div className="w-16 bg-muted rounded-full h-2 overflow-hidden shrink-0">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${(city.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
