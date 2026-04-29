import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, X } from 'lucide-react';

export interface TourStep {
  /** CSS selector for the target element to highlight */
  target: string;
  /** Title of the step */
  title: string;
  /** Description text */
  description: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Icon color class */
  color?: string;
  /** Icon background class */
  bg?: string;
  /** Preferred tooltip placement */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** If no target found, show as centered modal */
  fallbackModal?: boolean;
}

interface GuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  /** Delay in ms before showing (default: 1500) */
  delay?: number;
  onComplete?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;

function getTooltipPosition(
  targetRect: Rect,
  tooltipW: number,
  tooltipH: number,
  placement: TourStep['placement'],
  viewW: number,
  viewH: number,
) {
  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;

  type Pos = { top: number; left: number; actual: string };

  const tryPlacement = (p: string): Pos | null => {
    let top = 0, left = 0;
    switch (p) {
      case 'bottom':
        top = targetRect.top + targetRect.height + PADDING + TOOLTIP_GAP;
        left = cx - tooltipW / 2;
        break;
      case 'top':
        top = targetRect.top - PADDING - TOOLTIP_GAP - tooltipH;
        left = cx - tooltipW / 2;
        break;
      case 'right':
        top = cy - tooltipH / 2;
        left = targetRect.left + targetRect.width + PADDING + TOOLTIP_GAP;
        break;
      case 'left':
        top = cy - tooltipH / 2;
        left = targetRect.left - PADDING - TOOLTIP_GAP - tooltipW;
        break;
    }
    // clamp
    left = Math.max(12, Math.min(left, viewW - tooltipW - 12));
    top = Math.max(12, Math.min(top, viewH - tooltipH - 12));
    
    // check if it overlaps target
    const tRight = left + tooltipW;
    const tBottom = top + tooltipH;
    const eLeft = targetRect.left - PADDING;
    const eRight = targetRect.left + targetRect.width + PADDING;
    const eTop = targetRect.top - PADDING;
    const eBottom = targetRect.top + targetRect.height + PADDING;

    const overlaps = !(tRight < eLeft || left > eRight || tBottom < eTop || top > eBottom);
    if (overlaps && p !== 'bottom' && p !== 'top') return null;

    return { top, left, actual: p };
  };

  const order = placement === 'auto' || !placement
    ? ['bottom', 'top', 'right', 'left']
    : [placement, 'bottom', 'top', 'right', 'left'];

  for (const p of order) {
    const pos = tryPlacement(p);
    if (pos) return pos;
  }

  return { top: viewH / 2 - tooltipH / 2, left: viewW / 2 - tooltipW / 2, actual: 'bottom' };
}

export function GuidedTour({ steps, storageKey, delay = 1500, onComplete }: GuidedTourProps) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [missingCount, setMissingCount] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  // Check if tour already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      const timer = setTimeout(() => setActive(true), delay);
      return () => clearTimeout(timer);
    }
  }, [storageKey, delay]);

  const handleClose = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setActive(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const handleNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setTooltipPos(null);
      setTargetRect(null);
      setMissingCount(0);
    } else {
      handleClose();
    }
  }, [step, steps.length, handleClose]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
      setTooltipPos(null);
      setTargetRect(null);
      setMissingCount(0);
    }
  }, [step]);

  const updatePosition = useCallback(() => {
    if (!active || step >= steps.length) return;
    const currentStep = steps[step];
    
    try {
      const el = currentStep.target ? document.querySelector(currentStep.target) : null;
      if (el && el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
          setMissingCount(0);
          return;
        }
      }
      setTargetRect(null);
      setMissingCount(prev => prev + 1);
    } catch (err) {
      setTargetRect(null);
      setMissingCount(prev => prev + 1);
    }
  }, [active, step, steps]);

  useEffect(() => {
    if (!active) return;
    
    updatePosition();
    
    const handleScrollResize = () => {
      window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener('resize', handleScrollResize);
    window.addEventListener('scroll', handleScrollResize, true);
    
    const interval = setInterval(updatePosition, 1000);

    return () => {
      window.removeEventListener('resize', handleScrollResize);
      window.removeEventListener('scroll', handleScrollResize, true);
      clearInterval(interval);
    };
  }, [active, updatePosition]);

  // Auto-skip logic
  useEffect(() => {
    if (missingCount > 10) { // Skip if missing for 10 consecutive interval checks (~10s)
      handleNext();
    }
  }, [missingCount, handleNext]);

  // Position tooltip after render or target change
  useEffect(() => {
    if (!active || !tooltipRef.current) return;
    
    const tt = tooltipRef.current;
    const ttRect = tt.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    if (targetRect) {
      const pos = getTooltipPosition(
        targetRect,
        ttRect.width,
        ttRect.height,
        steps[step]?.placement,
        viewW,
        viewH,
      );
      setTooltipPos({ top: pos.top, left: pos.left });
    } else {
      // Center as modal if target missing
      setTooltipPos({
        top: viewH / 2 - ttRect.height / 2,
        left: viewW / 2 - ttRect.width / 2,
      });
    }
  }, [targetRect, step, active, steps]);

  if (!active) return null;

  const current = steps[step];
  const Icon = current.icon;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
        {/* SVG Overlay with cutout */}
        <motion.svg
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  x={targetRect.left - PADDING}
                  y={targetRect.top - PADDING}
                  width={targetRect.width + PADDING * 2}
                  height={targetRect.height + PADDING * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.6)"
            mask="url(#tour-mask)"
            style={{ pointerEvents: 'auto' }}
            onClick={handleClose}
          />
        </motion.svg>

        {/* Spotlight ring */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed rounded-xl ring-2 ring-primary/60 ring-offset-2 ring-offset-transparent"
            style={{
              top: targetRect.top - PADDING,
              left: targetRect.left - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              pointerEvents: 'none',
              boxShadow: '0 0 0 4px hsl(var(--primary) / 0.15)',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: tooltipPos ? 1 : 0, y: tooltipPos ? 0 : 10 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="fixed z-[10000] w-[min(340px,calc(100vw-24px))] rounded-2xl bg-card border border-border shadow-2xl"
          style={{
            top: tooltipPos?.top ?? -9999,
            left: tooltipPos?.left ?? -9999,
            pointerEvents: 'auto',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          <div className="p-5">
            {Icon && (
              <div className={`w-11 h-11 rounded-xl ${current.bg || 'bg-primary/10'} flex items-center justify-center mb-3`}>
                <Icon className={`w-5.5 h-5.5 ${current.color || 'text-primary'}`} />
              </div>
            )}
            <h3 className="text-[15px] font-bold text-foreground mb-1.5 pr-6">{current.title}</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{current.description}</p>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/20 rounded-b-2xl">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-primary w-4' : i < step ? 'bg-primary/40 w-1.5' : 'bg-muted-foreground/20 w-1.5'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-8 px-3" onClick={handlePrev}>
                  Voltar
                </Button>
              )}
              {step < steps.length - 1 && step === 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8 px-3" onClick={handleClose}>
                  Pular
                </Button>
              )}
              <Button size="sm" className="gap-1.5 h-8 px-4 rounded-xl" onClick={handleNext}>
                {step < steps.length - 1 ? (
                  <>Próximo <ArrowRight className="w-3.5 h-3.5" /></>
                ) : (
                  '✨ Começar!'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
