import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { fireConfettiSmall } from '@/lib/celebrations';

interface Props {
  franchiseId: string;
}

export function OnboardingChecklist({ franchiseId }: Props) {
  const navigate = useNavigate();
  const { items, doneCount, allDone, dismissed, loading, dismiss, markSharedLink, markVisitedPlans } = useOnboardingChecklist(franchiseId);
  const [celebrating, setCelebrating] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Listen for link copy clicks
  useEffect(() => {
    const el = document.querySelector('[data-tour="franchise-link"]');
    if (!el) return;
    const handler = () => markSharedLink();
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [markSharedLink]);

  // Celebrate when all done
  useEffect(() => {
    if (allDone && !dismissed && !celebrating) {
      setCelebrating(true);
      fireConfettiSmall();
      const timer = setTimeout(() => setHidden(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [allDone, dismissed, celebrating]);

  const handleAction = useCallback((item: typeof items[0]) => {
    if (item.key === 'plans') markVisitedPlans();
    if (item.actionPath) {
      navigate(item.actionPath);
    } else {
      // Scroll to franchise link
      const el = document.querySelector('[data-tour="franchise-link"]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [navigate, markVisitedPlans]);

  if (loading || dismissed || hidden || items.length === 0) return null;

  const progress = (doneCount / items.length) * 100;

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-6"
        >
          {celebrating ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center"
            >
              <p className="text-lg font-semibold text-emerald-700">
                🎉 Tudo pronto! Sua franquia está configurada.
              </p>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-primary/10 bg-primary/[0.03] p-5">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">Primeiros passos</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{doneCount} de {items.length} concluídos</p>
                  <Progress value={progress} className="mt-2 h-1.5" />
                </div>
                <button
                  onClick={dismiss}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Dispensar checklist"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    {/* Checkbox circle */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      item.done
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-dashed border-muted-foreground/30'
                    }`}>
                      {item.done && <Check className="w-3.5 h-3.5" />}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>

                    {/* Action */}
                    {!item.done && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl shrink-0 h-8 px-3"
                        onClick={() => handleAction(item)}
                      >
                        {item.actionLabel}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
