import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowDown } from 'lucide-react';

interface AnalyticsEvent {
  session_id: string;
  event_name: string;
}

const QUIZ_STEPS = [
  { key: 'quiz_started', label: 'Iniciou quiz', emoji: '🏁' },
  { key: 'quiz_question_answered_1', label: 'P1 – Espaço', emoji: '📐' },
  { key: 'quiz_question_answered_2', label: 'P2 – Moradia', emoji: '🏠' },
  { key: 'quiz_question_answered_3', label: 'P3 – Uso', emoji: '🏊' },
  { key: 'quiz_question_answered_4', label: 'P4 – Intenção', emoji: '📅' },
  { key: 'quiz_question_answered_5', label: 'P5 – Preferência', emoji: '💎' },
  { key: 'quiz_question_answered_6', label: 'P6 – Orçamento', emoji: '💰' },
  { key: 'quiz_completed', label: 'Finalizou quiz', emoji: '✅' },
];

interface Props {
  events: AnalyticsEvent[];
}

export function QuizDropoffAnalysis({ events }: Props) {
  const dropoffData = useMemo(() => {
    // Build session -> max question reached map
    const sessionProgress: Record<string, Set<string>> = {};

    events.forEach(e => {
      if (!sessionProgress[e.session_id]) sessionProgress[e.session_id] = new Set();
      
      if (e.event_name === 'quiz_started') {
        sessionProgress[e.session_id].add('quiz_started');
      } else if (e.event_name === 'quiz_question_answered') {
        // This event has metadata but we're mapping by event_name
        sessionProgress[e.session_id].add(e.event_name);
      } else if (e.event_name === 'quiz_completed') {
        sessionProgress[e.session_id].add('quiz_completed');
      }
    });

    // Count sessions that answered each question number
    const questionCounts: Record<number, number> = {};
    let startedCount = 0;
    let completedCount = 0;

    events.forEach(e => {
      if (e.event_name === 'quiz_started') startedCount++;
    });

    // Deduplicate by session
    const sessionsStarted = new Set<string>();
    const sessionsCompleted = new Set<string>();
    const sessionsByQuestion: Record<number, Set<string>> = {};
    for (let i = 1; i <= 6; i++) sessionsByQuestion[i] = new Set();

    events.forEach(e => {
      if (e.event_name === 'quiz_started') sessionsStarted.add(e.session_id);
      if (e.event_name === 'quiz_completed') sessionsCompleted.add(e.session_id);
      if (e.event_name === 'quiz_question_answered') {
        const meta = (e as any).metadata;
        const qNum = meta?.question_number as number;
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
  }, [events]);

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
        <div className="space-y-1.5">
          {dropoffData.map((step, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-6 text-center text-sm">{step.emoji}</div>
                <div className="w-24 sm:w-32 text-[10px] sm:text-xs text-muted-foreground truncate font-medium group-hover:text-foreground transition-colors">
                  {step.label}
                </div>
                <div className="flex-1 relative h-7 sm:h-8 rounded-xl overflow-hidden bg-muted/40">
                  <div
                    className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ease-out"
                    style={{
                      width: `${step.survivalRate}%`,
                      background: step.survivalRate > 70
                        ? 'hsl(142, 60%, 45%)'
                        : step.survivalRate > 40
                        ? 'hsl(38, 90%, 55%)'
                        : 'hsl(0, 70%, 55%)',
                      minWidth: step.count > 0 ? '2rem' : 0,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 sm:px-3">
                    <span className="text-[10px] sm:text-xs font-extrabold text-foreground z-10">{step.count}</span>
                    <span className="text-[8px] sm:text-[10px] text-muted-foreground ml-1 sm:ml-2 z-10 font-medium">({step.survivalRate}%)</span>
                  </div>
                </div>
                {i > 0 && step.dropoff > 0 && (
                  <span className={`text-[9px] sm:text-[10px] font-bold w-12 sm:w-14 text-right px-1 sm:px-1.5 py-0.5 rounded-md shrink-0 ${
                    step.dropoff >= 20 ? 'text-red-600 bg-red-500/10' : 
                    step.dropoff >= 10 ? 'text-amber-600 bg-amber-500/10' : 
                    'text-muted-foreground bg-muted/40'
                  }`}>
                    -{step.dropoff}%
                  </span>
                )}
              </div>
              {i < dropoffData.length - 1 && (
                <div className="flex items-center ml-8 sm:ml-10 my-0.5">
                  <ArrowDown className="w-3 h-3 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
