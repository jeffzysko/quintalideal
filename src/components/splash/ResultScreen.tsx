import { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';
import { getRankingGaucho, getYardClassification, getSocialComparison } from '@/lib/ranking';
import { Trophy, Sparkles, Star } from 'lucide-react';

interface ResultScreenProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  onContinue: () => void;
}

function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const x = Math.random() * 100;
  const rotate = Math.random() * 720 - 360;
  return (
    <motion.div
      initial={{ y: -20, x: `${x}vw`, opacity: 1, rotate: 0 }}
      animate={{ y: '110vh', opacity: 0, rotate }}
      transition={{ duration: 2.5 + Math.random() * 2, delay, ease: 'easeIn' }}
      className="fixed top-0 z-50 pointer-events-none"
      style={{ left: 0 }}
    >
      <div className="w-2 h-3 rounded-sm" style={{ backgroundColor: color }} />
    </motion.div>
  );
}

export function ResultScreen({ score, poolName, poolDescription, onContinue }: ResultScreenProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const ranking = getRankingGaucho(score);
  const classification = getYardClassification(score);
  const socialComparison = getSocialComparison(score);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  const confettiColors = ['#1e88e5', '#42a5f5', '#64b5f6', '#e91e91', '#ffd700', '#00e5ff', '#76ff03'];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= score) {
        current = score;
        clearInterval(interval);
        setShowConfetti(true);
        setTimeout(() => onContinueRef.current(), 3500);
      }
      setDisplayScore(current);
    }, 18);
    return () => clearInterval(interval);
  }, [score]);

  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (displayScore / 100) * circumference;

  const confettiParticles = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    }))
  , []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a1628 0%, #0d3060 40%, #0a2445 100%)',
      }}
    >
      {showConfetti && confettiParticles.map(p => (
        <ConfettiParticle key={p.id} delay={p.delay} color={p.color} />
      ))}

      <div className="absolute top-[-20%] right-[-15%] w-[70vw] h-[70vw] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, hsl(207 90% 50%), transparent 65%)' }}
      />
      <div className="absolute bottom-[-15%] left-[-20%] w-[60vw] h-[60vw] rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, hsl(322 85% 50%), transparent 65%)' }}
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 18 }}
        className="text-center max-w-md w-full px-6 py-12 relative z-10"
      >
        <motion.img
          src={logoSplash}
          alt="Splash Piscinas"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.1 }}
          className="mx-auto w-24 mb-8"
          loading="lazy"
        />

        {displayScore < score && displayScore < 10 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/40 text-xs uppercase tracking-[0.2em] mb-6"
          >
            Analisando seu quintal...
          </motion.p>
        )}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 12 }}
          className="relative mx-auto w-56 h-56 mb-8"
        >
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-[-20px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(30,136,229,0.2), transparent 70%)' }}
          />

          <svg className="w-56 h-56 transform -rotate-90 relative z-10" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="58" stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
            <circle
              cx="65" cy="65" r="58"
              stroke="url(#resultGradient)"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.03s linear', filter: 'drop-shadow(0 0 8px rgba(30,136,229,0.5))' }}
            />
            <defs>
              <linearGradient id="resultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e88e5" />
                <stop offset="50%" stopColor="#42a5f5" />
                <stop offset="100%" stopColor="#00e5ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <span className="text-6xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 40px rgba(30,136,229,0.4)' }}>
              {displayScore}
            </span>
            <span className="text-sm font-medium text-white/40 mt-1">pontos</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl md:text-3xl font-extrabold mb-3 tracking-tight text-white"
        >
          Seu quintal tem{' '}
          <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">{score}%</span>
          <br />de potencial!
        </motion.h2>

        {/* Gamified Classification */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="inline-flex items-center gap-2 my-3 px-6 py-3 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${classification.color}18, ${classification.color}08)`,
            border: `1px solid ${classification.color}30`,
            boxShadow: `0 0 30px ${classification.color}12`,
          }}
        >
          <span className="text-xl">{classification.emoji}</span>
          <span className="font-bold text-sm" style={{ color: classification.color }}>{classification.label}</span>
        </motion.div>

        {/* Ranking badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, type: 'spring' }}
          className="inline-flex items-center gap-2 my-2 px-5 py-2.5 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.05))',
            border: '1px solid rgba(255,215,0,0.2)',
            boxShadow: '0 0 30px rgba(255,215,0,0.08)',
          }}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-sm text-amber-300">{ranking.label}</span>
        </motion.div>

        {/* Social comparison */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-white/50 text-sm mt-3 mb-4 italic"
        >
          {socialComparison}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="rounded-2xl p-5 text-left mt-4 backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-300" />
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.15em]">Modelo recomendado</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">{poolName}</h3>
          {poolDescription && <p className="text-sm text-white/40 leading-relaxed">{poolDescription}</p>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="flex items-center justify-center gap-1 mt-6"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4 + i * 0.1 }}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </motion.div>
          ))}
          <span className="text-white/30 text-xs ml-2 font-medium">Análise completa</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
