import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/lead-constants';
import { Badge } from '@/components/ui/badge';
import type { LeadRow } from '@/lib/lead-constants';
import { cn } from '@/lib/utils';

interface PipelineSnapshotProps {
  leads: LeadRow[];
}

const STAGE_ORDER: Array<LeadRow['status_lead']> = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'];

const STAGE_COLORS: Record<string, string> = {
  novo: 'bg-primary',
  contatado: 'bg-violet-500',
  em_negociacao: 'bg-amber-500',
  vendido: 'bg-emerald-500',
  perdido: 'bg-muted-foreground/40',
};

export function PipelineSnapshot({ leads }: PipelineSnapshotProps) {
  const counts: Record<string, number> = {};
  STAGE_ORDER.forEach(s => { counts[s] = 0; });
  leads.forEach(l => { counts[l.status_lead] = (counts[l.status_lead] || 0) + 1; });

  const activeTotal = (counts['novo'] || 0) + (counts['contatado'] || 0) + (counts['em_negociacao'] || 0);
  const total = leads.length || 1;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <Card className="card-premium">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Pipeline</h4>
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{activeTotal}</span> ativos
            </span>
          </div>

          {/* Visual bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/60 mb-3">
            {STAGE_ORDER.filter(s => counts[s] > 0).map(stage => (
              <div
                key={stage}
                className={cn('h-full transition-all', STAGE_COLORS[stage])}
                style={{ width: `${(counts[stage] / total) * 100}%` }}
              />
            ))}
          </div>

          {/* Stage badges */}
          <div className="flex flex-wrap gap-2">
            {STAGE_ORDER.filter(s => s !== 'perdido').map(stage => (
              <div key={stage} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', STAGE_COLORS[stage])} />
                <span className="text-[11px] text-muted-foreground">
                  {STATUS_LABELS[stage]} <span className="font-bold text-foreground">{counts[stage]}</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
