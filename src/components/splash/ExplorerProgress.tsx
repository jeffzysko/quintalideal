import { Progress } from '@/components/ui/progress';
import { getExplorerSteps } from '@/lib/i18n';
import { type Lang, t } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface ExplorerProgressProps {
  currentStep: number;
  onBack: () => void;
  lang?: Lang;
}

const STEP_LABELS_PT = ['📸 Foto', 'Espaço', 'Casa', 'Uso', 'Plano', 'Preferência', 'Orçamento', 'Cidade'];
const STEP_LABELS_ES = ['📸 Foto', 'Espacio', 'Casa', 'Uso', 'Plan', 'Preferencia', 'Presupuesto', 'Ciudad'];

export function ExplorerProgress({ currentStep, onBack, lang = 'pt' }: ExplorerProgressProps) {
  const steps = getExplorerSteps(lang);
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const stepInfo = steps[currentStep] || steps[0];
  const labels = lang === 'es' ? STEP_LABELS_ES : STEP_LABELS_PT;

  const labelIndex = currentStep; // 0 = photo, 1-7 = quiz steps

  return (
    <div className="mb-3 sm:mb-5">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('explorer_back', lang)}
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          {t('explorer_step', lang)} {currentStep + 1} {t('explorer_of', lang)} {totalSteps}
        </span>
      </div>

      {/* Named step indicators */}
      {quizIndex >= 0 && quizIndex < labels.length && (
        <div className="flex items-center gap-0.5 mb-2 overflow-x-auto scrollbar-hide">
          {labels.map((label, i) => {
            const isActive = i === quizIndex;
            const isDone = i < quizIndex;
            return (
              <div key={i} className="flex items-center min-w-0">
                <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isDone
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground/50'
                }`}>
                  {isDone && <span className="text-[8px]">✓</span>}
                  {label}
                </div>
                {i < labels.length - 1 && (
                  <div className={`w-1.5 sm:w-2 h-px mx-0.5 ${isDone ? 'bg-primary/30' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Progress value={progress} className="h-1 bg-muted" />
      </div>

      {/* Discovery percentage */}
      <motion.p
        key={`discovery-${currentStep}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-[11px] text-primary font-semibold mt-2 text-right"
      >
        {t('explorer_discovery', lang).replace('{pct}', String(Math.round(progress)))}
      </motion.p>

      {/* Step info */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-lg shrink-0">
          {stepInfo.emoji}
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">{stepInfo.title}</p>
          <p className="text-xs text-muted-foreground">{stepInfo.message}</p>
        </div>
      </motion.div>
    </div>
  );
}
