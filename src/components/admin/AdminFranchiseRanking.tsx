import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp } from 'lucide-react';

interface FranchiseMetric {
  name: string;
  count: number;
  avgScore: number;
}

interface AdminFranchiseRankingProps {
  leads: { franquia_id: string | null; pontuacao_quintal: number | null }[];
  franchiseMap: Record<string, string>;
}

export function AdminFranchiseRanking({ leads, franchiseMap }: AdminFranchiseRankingProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> Ranking de Franquias
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Sem dados</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {data.map((f, i) => (
              <div key={f.name} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{f.count} leads</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {f.avgScore}%
                    </span>
                  </div>
                </div>
                <div className="w-16 bg-muted rounded-full h-2 overflow-hidden shrink-0">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(f.count / maxCount) * 100}%` }}
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
