import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Users, Link2, TrendingUp } from 'lucide-react';

interface AdminReferralMetricsProps {
  leads: { referred_by: string | null; ref_code: string | null }[];
}

export function AdminReferralMetrics({ leads }: AdminReferralMetricsProps) {
  const metrics = useMemo(() => {
    const totalWithRefCode = leads.filter(l => l.ref_code).length;
    const totalReferred = leads.filter(l => l.referred_by).length;
    const referralRate = totalWithRefCode > 0 ? Math.round((totalReferred / totalWithRefCode) * 100) : 0;

    // Top referrers
    const refCounts: Record<string, number> = {};
    leads.forEach(l => {
      if (l.referred_by) {
        refCounts[l.referred_by] = (refCounts[l.referred_by] || 0) + 1;
      }
    });
    const topReferrers = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalWithRefCode, totalReferred, referralRate, topReferrers };
  }, [leads]);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" /> Métricas de Viralização
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Link2 className="w-4 h-4 mx-auto mb-1 text-secondary" />
            <p className="text-lg font-bold">{metrics.totalWithRefCode}</p>
            <p className="text-xs text-muted-foreground">Links gerados</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{metrics.totalReferred}</p>
            <p className="text-xs text-muted-foreground">Via convite</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{metrics.referralRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa de convite</p>
          </div>
        </div>

        {metrics.topReferrers.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">Top Referências</p>
            <div className="space-y-1">
              {metrics.topReferrers.map(([code, count]) => (
                <div key={code} className="flex justify-between text-xs py-1.5 px-2 bg-muted/20 rounded">
                  <span className="font-mono text-muted-foreground">{code}</span>
                  <span className="font-bold text-primary">{count} convites</span>
                </div>
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
}
