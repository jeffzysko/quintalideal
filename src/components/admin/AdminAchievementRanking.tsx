import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Star, Zap, Crown, Rocket, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import type { LeadRow } from '@/lib/lead-constants';

interface AdminAchievementRankingProps {
  leads: LeadRow[];
  franchiseMap: Record<string, string>;
}

const ACHIEVEMENT_DEFS = [
  { id: 'first-sale', icon: Star, label: 'Primeira Venda', threshold: 1, field: 'sold' as const },
  { id: 'five-sales', icon: Trophy, label: 'Top Vendedor', threshold: 5, field: 'sold' as const },
  { id: 'ten-sales', icon: Crown, label: 'Rei das Vendas', threshold: 10, field: 'sold' as const },
  { id: 'lead-magnet', icon: Zap, label: 'Lead Magnet', threshold: 50, field: 'total' as const },
  { id: 'hot-hunter', icon: Rocket, label: 'Caçador de Ouro', threshold: 10, field: 'hot' as const },
  { id: 'fast-responder', icon: Medal, label: 'Resposta Rápida', threshold: 80, field: 'contactRate' as const },
] as const;

interface FranchiseStats {
  name: string;
  franchiseId: string;
  total: number;
  sold: number;
  hot: number;
  contactRate: number;
  unlocked: number;
  totalAchievements: number;
}

function computeStats(
  leads: LeadRow[],
  franchiseMap: Record<string, string>,
): FranchiseStats[] {
  const grouped: Record<string, LeadRow[]> = {};
  leads.forEach(l => {
    const fid = l.franquia_id;
    if (!fid) return;
    if (!grouped[fid]) grouped[fid] = [];
    grouped[fid].push(l);
  });

  return Object.entries(grouped)
    .map(([fid, fLeads]) => {
      const total = fLeads.length;
      const sold = fLeads.filter(l => l.status_lead === 'vendido').length;
      const hot = fLeads.filter(l => (l.pontuacao_quintal || 0) >= 78).length;
      const contacted = fLeads.filter(l => l.status_lead !== 'novo').length;
      const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;

      let unlocked = 0;
      ACHIEVEMENT_DEFS.forEach(a => {
        const val = a.field === 'sold' ? sold : a.field === 'total' ? total : a.field === 'hot' ? hot : contactRate;
        if (val >= a.threshold) unlocked++;
      });

      return {
        name: franchiseMap[fid] || 'Sem nome',
        franchiseId: fid,
        total,
        sold,
        hot,
        contactRate,
        unlocked,
        totalAchievements: ACHIEVEMENT_DEFS.length,
      };
    })
    .sort((a, b) => b.unlocked - a.unlocked || b.sold - a.sold)
    .slice(0, 10);
}

function RankBadge({ position }: { position: number }) {
  if (position === 0) return <span className="text-lg">🥇</span>;
  if (position === 1) return <span className="text-lg">🥈</span>;
  if (position === 2) return <span className="text-lg">🥉</span>;
  return <span className="text-xs font-bold text-muted-foreground w-5 text-center">{position + 1}º</span>;
}

export const AdminAchievementRanking = memo(function AdminAchievementRanking({
  leads,
  franchiseMap,
}: AdminAchievementRankingProps) {
  const rankings = useMemo(() => computeStats(leads, franchiseMap), [leads, franchiseMap]);

  if (rankings.length === 0) return null;

  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          Ranking de Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
          {rankings.map((f, i) => (
            <motion.div
              key={f.franchiseId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2) }}
              className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors group"
            >
              <RankBadge position={i} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {f.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress
                    value={(f.unlocked / f.totalAchievements) * 100}
                    className="h-1.5 flex-1 max-w-[100px]"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    {f.unlocked}/{f.totalAchievements} 🏆
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-foreground">{f.sold}</p>
                <p className="text-[10px] text-muted-foreground">vendas</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
