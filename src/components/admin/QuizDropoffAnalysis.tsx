import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalyticsEvent {
  session_id: string;
  event_name: string;
  metadata?: Record<string, unknown> | null;
}

interface Props {
  events: AnalyticsEvent[];
  previousEvents?: AnalyticsEvent[];
}

function computeDropoff(events: AnalyticsEvent[]) {
  const sessionsStarted = new Set<string>();
  const sessionsCompleted = new Set<string>();
  const sessionsByQuestion: Record<number, Set<string>> = {};
  for (let i = 1; i <= 6; i++) sessionsByQuestion[i] = new Set();

  events.forEach(e => {
    if (e.event_name === 'quiz_started') sessionsStarted.add(e.session_id);
    if (e.event_name === 'quiz_completed') sessionsCompleted.add(e.session_id);
    if (e.event_name === 'quiz_question_answered') {
      const qNum = e.metadata?.question_number as number;
      if (qNum && qNum >= 1 && qNum <= 6) {
        sessionsByQuestion[qNum].add(e.session_id);
      }
    }
  });

  const steps = [
    { label: 'Iniciou quiz', emoji: '🏁', count: sessionsStarted.size },
    { label: 'P1 – Espaço', emoji: '📐', count: sessionsByQuestion[1].size },
    { label: 'P2 – Moradia', emoji: '🏠', count: sessionsByQuestion[2].size },
    { label: 'P3 – Uso', emoji: '🏊', count: sessionsByQuestion[3].size },
    { label: 'P4 – Intenção', emoji: '📅', count: sessionsByQuestion[4].size },
    { label: 'P5 – Preferência', emoji: '💎', count: sessionsByQuestion[5].size },
    { label: 'P6 – Orçamento', emoji: '💰', count: sessionsByQuestion[6].size },
    { label: 'Finalizou quiz', emoji: '✅', count: sessionsCompleted.size },
  ];

  const first = steps[0].count || 1;
  return steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1].count : step.count;
    const dropoff = prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : 0;
    const survivalRate = Math.round((step.count / first) * 100);
    return { ...step, dropoff: i > 0 ? dropoff : 0, survivalRate };
  });
}

export function QuizDropoffAnalysis({ events, previousEvents }: Props) {
  const dropoffData = useMemo(() => computeDropoff(events), [events]);
  const prevDropoffData = useMemo(
    () => previousEvents && previousEvents.length > 0 ? computeDropoff(previousEvents) : null,
    [previousEvents],
  );

  const hasPrevious = prevDropoffData !== null && prevDropoffData[0].count > 0;

  const worstStep = useMemo(() => {
    return dropoffData.reduce((worst, step, i) => {
      if (i === 0) return worst;
      return step.dropoff > (worst?.dropoff || 0) ? step : worst;
    }, null as (typeof dropoffData[0]) | null);
  }, [dropoffData]);

  if (dropoffData[0].count === 0) return null;

  return (
    <Card className="card-premium">
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
          </div>
          Taxa de Abandono por Etapa do Quiz
        </CardTitle>
        {worstStep && worstStep.dropoff > 15 && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ Maior perda: <strong>{worstStep.label}</strong> com {worstStep.dropoff}% de abandono
          </p>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {/* Legend when comparing */}
        {hasPrevious && (
          <div className="flex items-center gap-4 mb-3 text-xs sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Atual
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" /> Anterior
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          {dropoffData.map((step, i) => {
            const prevStep = hasPrevious ? prevDropoffData![i] : null;
            // Dropoff delta: negative means improvement (less dropoff now)
            const dropoffDelta = prevStep && i > 0
              ? step.dropoff - prevStep.dropoff
              : null;

            return (
              <div key={i}>
                <div className="flex items-center gap-2 sm:gap-3 group">
                  <div className="w-6 text-center text-sm">{step.emoji}</div>
                  <div className="w-24 sm:w-32 text-xs sm:text-xs text-muted-foreground truncate font-medium group-hover:text-foreground transition-colors">
                    {step.label}
                  </div>
                  <div className="flex-1 relative h-7 sm:h-8 rounded-xl overflow-hidden bg-muted/40">
                    {/* Previous period ghost bar */}
                    {prevStep && prevStep.survivalRate > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-xl opacity-20 border border-muted-foreground/20"
                        style={{
                          width: `${prevStep.survivalRate}%`,
                          background: 'hsl(var(--muted-foreground))',
                          minWidth: prevStep.count > 0 ? '2rem' : 0,
                        }}
                      />
                    )}
                    {/* Current bar */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out"
                      style={{
                        width: `${step.survivalRate}%`,
                        background: step.survivalRate > 70
                          ? 'hsl(var(--chart-2))'
                          : step.survivalRate > 40
                          ? 'hsl(38, 90%, 55%)'
                          : 'hsl(var(--destructive))',
                        minWidth: step.count > 0 ? '2rem' : 0,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 sm:px-3">
                      <span className="text-xs sm:text-xs font-extrabold text-foreground z-10">{step.count}</span>
                      <span className="text-[8px] sm:text-xs text-muted-foreground ml-1 sm:ml-2 z-10 font-medium">({step.survivalRate}%)</span>
                      {prevStep && (
                        <span className="text-[8px] text-muted-foreground/60 ml-1 z-10">
                          vs {prevStep.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {i > 0 && step.dropoff > 0 && (
                      <span className={`text-[9px] sm:text-xs font-bold w-12 sm:w-14 text-right px-1 sm:px-1.5 py-0.5 rounded-md ${
                        step.dropoff >= 20 ? 'text-destructive bg-destructive/10' : 
                        step.dropoff >= 10 ? 'text-amber-600 bg-amber-500/10' : 
                        'text-muted-foreground bg-muted/40'
                      }`}>
                        -{step.dropoff}%
                      </span>
                    )}
                    {dropoffDelta !== null && dropoffDelta !== 0 && (
                      <span className={`text-[8px] sm:text-[9px] font-semibold flex items-center gap-0.5 ${
                        dropoffDelta < 0 ? 'text-emerald-600' : 'text-destructive'
                      }`}>
                        {dropoffDelta < 0 ? (
                          <TrendingDown className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingUp className="w-2.5 h-2.5" />
                        )}
                        {Math.abs(dropoffDelta)}pp
                      </span>
                    )}
                    {dropoffDelta === 0 && i > 0 && (
                      <Minus className="w-2.5 h-2.5 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
                {i < dropoffData.length - 1 && (
                  <div className="flex items-center ml-8 sm:ml-10 my-0.5">
                    <ArrowDown className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Period comparison summary */}
        {hasPrevious && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <p className="text-xs sm:text-xs text-muted-foreground">
              {(() => {
                const currentCompletion = dropoffData[dropoffData.length - 1].survivalRate;
                const prevCompletion = prevDropoffData![prevDropoffData!.length - 1].survivalRate;
                const diff = currentCompletion - prevCompletion;
                if (diff > 0) return `📈 Taxa de conclusão subiu de ${prevCompletion}% para ${currentCompletion}% (+${diff}pp)`;
                if (diff < 0) return `📉 Taxa de conclusão caiu de ${prevCompletion}% para ${currentCompletion}% (${diff}pp)`;
                return `📊 Taxa de conclusão estável em ${currentCompletion}%`;
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
