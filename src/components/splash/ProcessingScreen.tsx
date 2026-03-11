import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';
import { CheckCircle2 } from 'lucide-react';

interface ProcessingScreenProps {
  onDone: () => void;
}

const steps = [
  'Analisando respostas do quiz…',
  'Comparando com +2.500 quintais do RS…',
  'Calculando potencial do seu quintal…',
  'Selecionando modelo ideal…',
];

export function ProcessingScreen({ onDone }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    const timer = setTimeout(onDone, 2800);
    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d3060 40%, #0a2445 100%)' }}
    >
      <div className="absolute top-[-20%] right-[-15%] w-[70vw] h-[70vw] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(207 90% 50%), transparent 65%)' }}
      />

      <div className="text-center max-w-sm w-full relative z-10">
        <motion.img
          src={logoSplash}
          alt="Splash"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mx-auto w-20 mb-10"
        />

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-8 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#1e88e5',
            borderRightColor: 'rgba(30,136,229,0.3)',
          }}
        />

        <h2 className="text-xl font-bold text-white mb-2">
          Calculando o Índice do seu Quintal…
        </h2>
        <p className="text-white/40 text-sm mb-8">
          Comparando com padrões de espaço e estilo de uso no RS
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full mb-8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #1e88e5, #00e5ff)', width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3 text-left">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3"
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 transition-colors ${
                  i <= currentStep ? 'text-blue-400' : 'text-white/20'
                }`}
              />
              <span className={`text-sm ${i <= currentStep ? 'text-white/70' : 'text-white/20'}`}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
