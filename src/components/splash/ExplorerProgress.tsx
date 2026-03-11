import { Progress } from '@/components/ui/progress';
import { explorerSteps } from './ExplorerSteps';
import { motion } from 'framer-motion';

interface ExplorerProgressProps {
  /** 0-based current step index (0 = photos, 1-5 = quiz questions, 6 = city) */
  currentStep: number;
  onBack: () => void;
}

export function ExplorerProgress({ currentStep, onBack }: ExplorerProgressProps) {
  const totalSteps = explorerSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const stepInfo = explorerSteps[currentStep] || explorerSteps[0];

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5 tracking-wide">
          Explorando seu quintal...
        </p>
        <Progress value={progress} className="h-2.5" />
      </div>

      {/* Step info */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Voltar
        </button>
        <span className="text-xs text-muted-foreground">{currentStep + 1}/{totalSteps}</span>
      </div>

      {/* Step title + message */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 flex items-start gap-3"
      >
        <span className="text-2xl">{stepInfo.emoji}</span>
        <div>
          <p className="font-bold text-sm text-foreground">{stepInfo.title}</p>
          <p className="text-xs text-muted-foreground">{stepInfo.message}</p>
        </div>
      </motion.div>
    </div>
  );
}
