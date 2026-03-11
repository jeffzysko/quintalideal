import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';

interface ResultScreenProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  onContinue: () => void;
}

export function ResultScreen({ score, poolName, poolDescription, onContinue }: ResultScreenProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= score) {
        current = score;
        clearInterval(interval);
        setTimeout(onContinue, 2000);
      }
      setDisplayScore(current);
    }, 20);
    return () => clearInterval(interval);
  }, [score, onContinue]);

  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (displayScore / 100) * circumference;

  const getColor = () => {
    if (displayScore >= 70) return 'hsl(var(--splash-green))';
    if (displayScore >= 40) return 'hsl(var(--splash-orange))';
    return 'hsl(var(--destructive))';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/20"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-center"
      >
        <div className="relative mx-auto w-48 h-48 mb-8">
          <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" stroke="hsl(var(--border))" strokeWidth="10" fill="none" />
            <circle
              cx="80" cy="80" r="70"
              stroke={getColor()}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold" style={{ fontFamily: 'Montserrat', color: getColor() }}>
              {displayScore}%
            </span>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: 'Montserrat' }}>
          Seu quintal tem{' '}
          <span style={{ color: getColor() }}>{score}%</span>{' '}
          de potencial!
        </h2>

        <div className="bg-card border rounded-2xl p-6 max-w-sm mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wide">Modelo recomendado</span>
          </div>
          <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Montserrat' }}>{poolName}</h3>
          {poolDescription && <p className="text-sm text-muted-foreground">{poolDescription}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
