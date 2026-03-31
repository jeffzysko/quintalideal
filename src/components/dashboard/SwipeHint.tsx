import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

const STORAGE_KEY = 'swipe-hint-dismissed';

/**
 * Shows a subtle animated hint on the first lead card to teach the swipe gesture.
 * Dismisses itself after the animation or on tap, and never shows again.
 */
export function SwipeHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch { /* ignore */ }
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    }, 3500);
    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          onClick={dismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-foreground/80 text-background text-[10px] font-semibold shadow-lg pointer-events-auto cursor-pointer"
        >
          <motion.div
            animate={{ x: [0, -6, 0] }}
            transition={{ repeat: 2, duration: 0.6, ease: 'easeInOut' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
          Deslize
        </motion.div>
      )}
    </AnimatePresence>
  );
}
