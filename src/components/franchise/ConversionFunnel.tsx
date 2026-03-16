import { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { STATUS_LABELS, STATUS_CHART_COLORS, type LeadRow } from '@/lib/lead-constants';

interface ConversionFunnelProps {
  leads: LeadRow[];
}

const FUNNEL_STEPS = ['novo', 'contatado', 'em_negociacao', 'vendido'] as const;

export const ConversionFunnel = memo(function ConversionFunnel({ leads }: ConversionFunnelProps) {
  const funnel = useMemo(() => {
    const total = leads.length;
    if (total === 0) return [];

    // Funnel: each step includes itself + all subsequent steps
    // novo = all leads, contatado = contatado + em_negociacao + vendido, etc.
    const statusOrder: Record<string, number> = {
      novo: 0,
      contatado: 1,
      em_negociacao: 2,
      vendido: 3,
      perdido: -1,
    };

    return FUNNEL_STEPS.map((step, idx) => {
      const count = leads.filter(l => {
        const order = statusOrder[l.status_lead] ?? -1;
        return order >= idx;
      }).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const prevCount = idx === 0 ? total : leads.filter(l => (statusOrder[l.status_lead] ?? -1) >= idx - 1).length;
      const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;

      return {
        key: step,
        label: STATUS_LABELS[step] || step,
        count,
        percentage,
        conversionRate,
        color: STATUS_CHART_COLORS[step] || '#94a3b8',
      };
    });
  }, [leads]);

  const lostCount = leads.filter(l => l.status_lead === 'perdido').length;

  if (leads.length === 0) return null;

  const maxCount = funnel[0]?.count || 1;

  return (
    <Card className="card-premium mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          Funil de Conversão
          {lostCount > 0 && (
            <span className="text-[10px] font-medium text-destructive/70 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> {lostCount} perdido{lostCount !== 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {funnel.map((step, i) => {
            const barWidth = Math.max((step.count / maxCount) * 100, 8);
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {/* Mobile: stacked layout */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-foreground">{step.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold tracking-tight" style={{ color: step.color }}>
                        {step.count}
                      </span>
                      {i > 0 && (
                        <span className={`text-xs font-bold ${
                          step.conversionRate >= 50 ? 'text-emerald-600' :
                          step.conversionRate >= 25 ? 'text-amber-600' :
                          'text-destructive/70'
                        }`}>
                          {step.conversionRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-8 rounded-lg bg-muted/40 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-lg"
                      style={{ backgroundColor: `${step.color}20`, borderLeft: `3px solid ${step.color}` }}
                    />
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                      style={{ color: step.color }}
                    >
                      {step.percentage}%
                    </span>
                  </div>
                </div>

                {/* Desktop: horizontal layout */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <p className="text-xs font-semibold text-foreground">{step.label}</p>
                    <p className="text-lg font-extrabold tracking-tight" style={{ color: step.color }}>
                      {step.count}
                    </p>
                  </div>

                  <div className="flex-1 relative">
                    <div className="h-8 rounded-lg bg-muted/40 overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-lg"
                        style={{ backgroundColor: `${step.color}20`, borderLeft: `3px solid ${step.color}` }}
                      />
                      <span
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                        style={{ color: step.color }}
                      >
                        {step.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="w-16 shrink-0 text-right">
                    {i > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                        <span className={`text-xs font-bold ${
                          step.conversionRate >= 50 ? 'text-emerald-600' :
                          step.conversionRate >= 25 ? 'text-amber-600' :
                          'text-destructive/70'
                        }`}>
                          {step.conversionRate}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">total</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary line */}
        <div className="mt-4 pt-3 border-t border-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>Taxa geral: <strong className="text-foreground">{funnel.length > 0 && funnel[0].count > 0 ? Math.round((funnel[funnel.length - 1].count / funnel[0].count) * 100) : 0}%</strong> (lead → venda)</span>
          <span>{leads.length} lead{leads.length !== 1 ? 's' : ''} no total</span>
        </div>
      </CardContent>
    </Card>
  );
}
