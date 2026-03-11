import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';

interface PhotoAnalysisProps {
  onDone: () => void;
}

export function PhotoAnalysis({ onDone }: PhotoAnalysisProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[100dvh] flex flex-col items-center justify-center px-6 gradient-hero"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-2xl gradient-blue flex items-center justify-center"
        >
          <ScanLine className="w-8 h-8 text-primary-foreground" />
        </motion.div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Analisando suas fotos...</h2>
          <p className="text-sm text-muted-foreground">Identificando o potencial do seu quintal</p>
        </div>

        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.3, ease: 'easeInOut' }}
            className="h-full gradient-blue rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
