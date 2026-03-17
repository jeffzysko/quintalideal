import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useStandalone } from '@/hooks/useStandalone';

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const isStandalone = useStandalone();
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const opacity = useTransform(pullY, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.6, 1]);
  const scale = useTransform(pullY, [0, THRESHOLD], [0.5, 1]);
  const rotate = useTransform(pullY, [0, THRESHOLD, MAX_PULL], [0, 180, 360]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (refreshing) return;
    // Only activate when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    if (diff > 10) {
      // Apply rubber-band effect
      const dampened = Math.min(MAX_PULL, diff * 0.5);
      pullY.set(dampened);
    }
  }, [refreshing, pullY]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;
    const currentPull = pullY.get();

    if (currentPull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(pullY, THRESHOLD * 0.6, { duration: 0.2 });
      // Reload the page after a brief delay for visual feedback
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } else {
      animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [refreshing, pullY]);

  useEffect(() => {
    if (!isStandalone) return;
    const el = containerRef.current || document;
    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [isStandalone, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isStandalone) return <>{children}</>;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <motion.div
        style={{ opacity, y: useTransform(pullY, [0, MAX_PULL], [-40, 16]) }}
        className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
        // Position below safe area
        aria-hidden
      >
        <motion.div
          style={{ scale }}
          className="w-10 h-10 rounded-full bg-card border border-border/50 shadow-lg flex items-center justify-center mt-[env(safe-area-inset-top,0px)]"
        >
          <motion.div style={{ rotate }}>
            <RefreshCw className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content with pull offset */}
      <motion.div style={{ y: useTransform(pullY, [0, MAX_PULL], [0, MAX_PULL * 0.3]) }}>
        {children}
      </motion.div>
    </div>
  );
}
