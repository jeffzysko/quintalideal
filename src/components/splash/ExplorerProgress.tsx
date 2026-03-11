import { Progress } from '@/components/ui/progress';
import { explorerSteps } from './ExplorerSteps';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface ExplorerProgressProps {
  currentStep: number;
  onBack: () => void;
}

export function ExplorerProgress({ currentStep, onBack }: ExplorerProgressProps) {
  const totalSteps = explorerSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const stepInfo = explorerSteps[currentStep] || explorerSteps[0];

  return (
    <div className="mb-3 sm:mb-5">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          Etapa {currentStep + 1} de {totalSteps}
        </span>
      </div>

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
        🔎 Já temos {Math.round(progress)}% do diagnóstico do seu quintal
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
