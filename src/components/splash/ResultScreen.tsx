import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';
import { getRankingGaucho } from '@/lib/ranking';
import { Trophy, Sparkles } from 'lucide-react';

interface ResultScreenProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  onContinue: () => void;
}

export function ResultScreen({ score, poolName, poolDescription, onContinue }: ResultScreenProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const ranking = getRankingGaucho(score);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= score) {
        current = score;
        clearInterval(interval);
        setTimeout(onContinue, 3000);
      }
      setDisplayScore(current);
    }, 20);
    return () => clearInterval(interval);
  }, [score, onContinue]);

  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (displayScore / 100) * circumference;

  const getColor = () => {
    if (displayScore >= 70) return 'hsl(207, 90%, 42%)';
    if (displayScore >= 40) return 'hsl(207, 90%, 55%)';
    return 'hsl(var(--muted-foreground))';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gradient-hero"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20 }}
        className="text-center max-w-md w-full"
      >
        <img src={logoSplash} alt="Splash Piscinas" className="mx-auto w-28 mb-8 opacity-80" />

        {/* Score circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', damping: 15 }}
          className="relative mx-auto w-52 h-52 mb-8"
        >
          <svg className="w-52 h-52 transform -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" stroke="hsl(var(--border))" strokeWidth="6" fill="none" />
            <circle
              cx="80" cy="80" r="70"
              stroke={getColor()}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold tracking-tight" style={{ color: getColor() }}>
              {displayScore}
            </span>
            <span className="text-lg font-medium text-muted-foreground">pontos</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-foreground"
        >
          Seu quintal tem{' '}
          <span className="text-primary">{score}%</span> de potencial!
        </motion.h2>

        {/* Ranking badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="inline-flex items-center gap-2 my-5 px-5 py-2.5 rounded-full bg-primary/8 border border-primary/15"
        >
          <Trophy className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-primary">{ranking.label}</span>
        </motion.div>

        {/* Pool recommendation card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="glass-card rounded-2xl p-6 mt-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Modelo recomendado</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1">{poolName}</h3>
          {poolDescription && <p className="text-sm text-muted-foreground leading-relaxed">{poolDescription}</p>}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
