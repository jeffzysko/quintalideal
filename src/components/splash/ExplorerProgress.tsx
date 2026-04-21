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

const STEPS_PT = [
  { emoji: '📸', label: 'Foto' },
  { emoji: '📏', label: 'Espaço' },
  { emoji: '🏠', label: 'Casa' },
  { emoji: '🌞', label: 'Uso' },
  { emoji: '📅', label: 'Plano' },
  { emoji: '💧', label: 'Preferência' },
  { emoji: '💰', label: 'Orçamento' },
  { emoji: '📍', label: 'Cidade' },
];
const STEPS_ES = [
  { emoji: '📸', label: 'Foto' },
  { emoji: '📏', label: 'Espacio' },
  { emoji: '🏠', label: 'Casa' },
  { emoji: '🌞', label: 'Uso' },
  { emoji: '📅', label: 'Plan' },
  { emoji: '💧', label: 'Preferencia' },
  { emoji: '💰', label: 'Presupuesto' },
  { emoji: '📍', label: 'Ciudad' },
];

export function ExplorerProgress({ currentStep, onBack, lang = 'pt' }: ExplorerProgressProps) {
  const steps = getExplorerSteps(lang);
  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const stepInfo = steps[currentStep] || steps[0];
  const stepData = lang === 'es' ? STEPS_ES : STEPS_PT;

  const labelIndex = currentStep; // 0 = photo, 1-7 = quiz steps

  return (
    <div className="mb-3 sm:mb-5">
      <div className="flex items-center justify-between mb-3">
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
      {labelIndex >= 0 && labelIndex < stepData.length && (
        <div className="flex items-center justify-center gap-0.5 mb-2 flex-wrap">
          {stepData.map((step, i) => {
            const isActive = i === labelIndex;
            const isDone = i < labelIndex;
            return (
              <div key={i} className="flex items-center">
                <div
                  className={`flex items-center justify-center transition-all ${
                    isActive
                      ? 'px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-sm text-xs font-semibold gap-1'
                      : isDone
                        ? 'w-7 h-7 rounded-full bg-primary/15 text-sm'
                        : 'w-7 h-7 rounded-full text-sm opacity-40'
                  }`}
                  title={step.label}
                >
                  {isActive ? (
                    <>{step.emoji} {step.label}</>
                  ) : (
                    <span className={isDone ? '' : 'grayscale'}>{step.emoji}</span>
                  )}
                </div>
                {i < stepData.length - 1 && (
                  <div className={`w-1.5 h-px mx-0.5 ${isDone ? 'bg-primary/30' : 'bg-border'}`} />
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
        className="text-xs text-primary font-semibold mt-2 text-right"
      >
        {t('explorer_discovery', lang).replace('{pct}', String(Math.round(progress)))}
      </motion.p>

      {/* Micro-reward message */}
      {currentStep >= 2 && currentStep <= 6 && (
        <motion.p
          key={`reward-${currentStep}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 text-right font-medium"
        >
          {currentStep === 2 && (lang === 'es' ? '✨ Perfecto, ya entendemos tu espacio' : '✨ Perfeito, já entendemos seu espaço')}
          {currentStep === 3 && (lang === 'es' ? '💡 Genial, ahora conseguimos personalizar' : '💡 Ótimo, agora conseguimos personalizar')}
          {currentStep === 4 && (lang === 'es' ? '🎯 Estamos cerca de tu resultado' : '🎯 Estamos perto do seu resultado')}
          {currentStep === 5 && (lang === 'es' ? '🏊 Casi listo, falta poco' : '🏊 Quase lá, falta pouco')}
          {currentStep === 6 && (lang === 'es' ? '🔥 Última pregunta!' : '🔥 Última pergunta!')}
        </motion.p>
      )}

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
