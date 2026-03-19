import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@/lib/lead-constants';
import type { LeadRow } from '@/lib/lead-constants';
import { classifyLead } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';
import { TrendingUp, ArrowRight } from 'lucide-react';

interface PipelineSnapshotProps {
  leads: (LeadRow & { respostas_questionario?: Record<string, string> | null })[];
}

const STAGE_ORDER: Array<LeadRow['status_lead']> = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'];

const STAGE_COLORS: Record<string, string> = {
  novo: 'bg-primary',
  contatado: 'bg-violet-500',
  em_negociacao: 'bg-amber-500',
  vendido: 'bg-emerald-500',
  perdido: 'bg-muted-foreground/40',
};

const STAGE_TEXT_COLORS: Record<string, string> = {
  novo: 'text-primary',
  contatado: 'text-violet-600',
  em_negociacao: 'text-amber-600',
  vendido: 'text-emerald-600',
  perdido: 'text-muted-foreground',
};

const STAGE_EMOJI: Record<string, string> = {
  novo: '🔵',
  contatado: '🟣',
  em_negociacao: '🟡',
  vendido: '🟢',
  perdido: '⚪',
};

export function PipelineSnapshot({ leads }: PipelineSnapshotProps) {
  const counts: Record<string, number> = {};
  STAGE_ORDER.forEach(s => { counts[s] = 0; });
  leads.forEach(l => { counts[l.status_lead] = (counts[l.status_lead] || 0) + 1; });

  const activeTotal = (counts['novo'] || 0) + (counts['contatado'] || 0) + (counts['em_negociacao'] || 0);
  const total = leads.length || 1;
  const conversionRate = leads.length > 0 ? Math.round((counts['vendido'] / leads.length) * 100) : 0;

  // Temperature breakdown
  const temps = { quente: 0, morno: 0, frio: 0 };
  leads.forEach(l => {
    if (['novo', 'contatado', 'em_negociacao'].includes(l.status_lead)) {
      const t = classifyLead((l as any).respostas_questionario || null, l.pontuacao_quintal);
      temps[t.temperature]++;
    }
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <Card className="card-premium overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Pipeline</h4>
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{leads.length}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{activeTotal}</span> ativos
              </span>
              {conversionRate > 0 && (
                <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {conversionRate}% conversão
                </Badge>
              )}
            </div>
          </div>

          {/* Visual bar */}
          <div className="px-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted/60">
              {STAGE_ORDER.filter(s => counts[s] > 0).map((stage, i) => (
                <motion.div
                  key={stage}
                  className={cn('h-full', STAGE_COLORS[stage])}
                  initial={{ width: 0 }}
                  animate={{ width: `${(counts[stage] / total) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                />
              ))}
            </div>
          </div>

          {/* Stage detail grid */}
          <div className="grid grid-cols-5 gap-0 border-t border-border/30 mt-4">
            {STAGE_ORDER.map((stage, i) => {
              const pct = Math.round((counts[stage] / total) * 100);
              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className={cn(
                    'flex flex-col items-center py-3 px-1',
                    i < 4 && 'border-r border-border/20'
                  )}
                >
                  <span className="text-sm mb-0.5">{STAGE_EMOJI[stage]}</span>
                  <span className={cn('text-lg font-extrabold leading-none', STAGE_TEXT_COLORS[stage])}>{counts[stage]}</span>
                  <span className="text-[9px] text-muted-foreground font-medium mt-1 text-center leading-tight">{STATUS_LABELS[stage]}</span>
                  <span className="text-[9px] text-muted-foreground/60 font-mono">{pct}%</span>
                </motion.div>
              );
            })}
          </div>

          {/* Temperature summary */}
          {activeTotal > 0 && (
            <div className="flex items-center justify-center gap-4 py-3 border-t border-border/20 bg-muted/10">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🔥</span>
                <span className="text-xs font-bold text-foreground">{temps.quente}</span>
                <span className="text-[10px] text-muted-foreground">quentes</span>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs">☀️</span>
                <span className="text-xs font-bold text-foreground">{temps.morno}</span>
                <span className="text-[10px] text-muted-foreground">mornos</span>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs">❄️</span>
                <span className="text-xs font-bold text-foreground">{temps.frio}</span>
                <span className="text-[10px] text-muted-foreground">frios</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
