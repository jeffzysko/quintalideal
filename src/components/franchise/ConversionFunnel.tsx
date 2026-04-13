import { useMemo, memo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { STATUS_LABELS, STATUS_CHART_COLORS, type LeadRow } from '@/lib/lead-constants';

interface ConversionFunnelProps {
  leads: LeadRow[];
}

const FUNNEL_STEPS = ['novo', 'contatado', 'em_negociacao', 'vendido'] as const;

function AnimatedBar({ targetWidth, color, delay }: { targetWidth: number; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timeout = setTimeout(() => {
      el.style.width = `${targetWidth}%`;
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [targetWidth, delay]);

  return (
    <div
      ref={ref}
      className="h-full rounded-xl transition-[width] duration-600 ease-out"
      style={{
        width: '0%',
        backgroundColor: `${color}20`,
        borderLeft: `3px solid ${color}`,
      }}
    />
  );
}

export const ConversionFunnel = memo(function ConversionFunnel({ leads }: ConversionFunnelProps) {
  const funnel = useMemo(() => {
    const total = leads.length;
    if (total === 0) return [];

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
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            Progresso dos Leads
          </span>
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
            const delay = 0.2 + Math.min(i * 0.1, 0.15);
            return (
              <div
                key={step.key}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 80, 150)}ms`, animationFillMode: 'both' }}
              >
                {/* Mobile: stacked layout */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-foreground">{step.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold tracking-tight" style={{ color: step.color }}>
                        {step.count}
                      </span>
                      {i > 0 && step.conversionRate < 50 && (
                        <span className="text-xs font-bold text-amber-600">
                          atenção
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-10 rounded-xl bg-muted/40 overflow-hidden relative">
                    <AnimatedBar targetWidth={barWidth} color={step.color} delay={delay} />
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
                    <div className="h-10 rounded-xl bg-muted/40 overflow-hidden relative">
                      <AnimatedBar targetWidth={barWidth} color={step.color} delay={delay} />
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
                      step.conversionRate < 50 ? (
                        <span className="text-xs font-bold text-amber-600">atenção</span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600">✓</span>
                      )
                    ) : (
                      <span className="text-[10px] text-muted-foreground">total</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>Taxa geral: <strong className="text-foreground">{funnel.length > 0 && funnel[0].count > 0 ? Math.round((funnel[funnel.length - 1].count / funnel[0].count) * 100) : 0}%</strong> (lead → venda)</span>
          <span>{leads.length} lead{leads.length !== 1 ? 's' : ''} no total</span>
        </div>
      </CardContent>
    </Card>
  );
});
