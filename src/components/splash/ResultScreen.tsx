import { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
import { getYardClassification } from '@/lib/ranking';
import { getPoolImage } from '@/lib/poolImages';
import { type Lang, t } from '@/lib/i18n';
import { fireConfetti, haptic } from '@/lib/celebrations';

interface PoolAlternativeView {
  name: string;
  image?: string;
  description?: string;
  specs?: {
    tamanho?: string;
    profundidade?: number;
    possui_prainha?: boolean;
    possui_spa?: boolean;
  };
}

interface ResultScreenProps {
  score: number;
  poolName: string;
  poolDescription?: string;
  recommendedSize?: string;
  alternatives?: PoolAlternativeView[];
  cidade?: string;
  onContinue: () => void;
  lang?: Lang;
}

// Valuation multipliers by city tier
function getValorizationRange(cidade?: string): { minPct: number; maxPct: number } {
  const bigCities = ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo'];
  if (cidade && bigCities.some(c => cidade.toLowerCase().includes(c.toLowerCase()))) {
    return { minPct: 15, maxPct: 25 };
  }
  return { minPct: 10, maxPct: 20 };
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

export function ResultScreen({ score, poolName, poolDescription, recommendedSize, alternatives = [], cidade, onContinue, lang = 'pt' }: ResultScreenProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const classification = getYardClassification(score);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  const confettiColors = ['#1e88e5', '#42a5f5', '#64b5f6', '#e91e91', '#ffd700', '#00e5ff', '#76ff03'];
  const [animDone, setAnimDone] = useState(false);

  const valorization = getValorizationRange(cidade);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.round(score / 50));
    const interval = setInterval(() => {
      current += step;
      if (current >= score) {
        current = score;
        clearInterval(interval);
        setShowConfetti(true);
        setAnimDone(true);
        fireConfetti();
        haptic('heavy');
      }
      setDisplayScore(current);
    }, 18);
    return () => clearInterval(interval);
  }, [score]);

  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (displayScore / 100) * circumference;

  const confettiParticles = useMemo(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    }))
  , []);

  const recommendedImage = getPoolImage(poolName);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col relative overflow-hidden"
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

      <div className="flex-1 flex flex-col items-center justify-start pt-6 sm:pt-10 px-4 sm:px-6 relative z-10">
        <motion.img
          src={logoQuintalIdeal}
          alt="Quintal Ideal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.1 }}
          className="mx-auto w-36 mb-6 brightness-0 invert"
          loading="lazy"
        />

        {displayScore < score && displayScore < 10 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4"
          >
            {t('result_analyzing', lang)}
          </motion.p>
        )}

        {/* Score ring */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 12 }}
          className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 mb-4"
        >
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-[-12px] sm:inset-[-16px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(30,136,229,0.2), transparent 70%)' }}
          />

          <svg className="w-32 h-32 sm:w-40 sm:h-40 transform -rotate-90 relative z-10" viewBox="0 0 130 130">
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
            <span className="text-3xl sm:text-5xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 40px rgba(30,136,229,0.4)' }}>
              {displayScore}
            </span>
            <span className="text-xs sm:text-xs font-medium text-white/40 mt-0.5">{t('result_points', lang)}</span>
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg sm:text-xl md:text-2xl font-extrabold mb-1 tracking-tight text-white text-center"
        >
          {lang === 'es' ? '¡Encontramos la piscina' : 'Encontramos a piscina'}{' '}
          <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">{lang === 'es' ? 'perfecta' : 'perfeita'}</span>
          {' '}{lang === 'es' ? 'para ti!' : 'para você!'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-white/40 text-xs text-center mb-2"
        >
          {lang === 'es' ? 'Basado en tu espacio, estilo y presupuesto' : 'Baseado no seu espaço, estilo e orçamento'}
        </motion.p>

        {/* Classification badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="inline-flex items-center gap-2 my-2 px-5 py-2 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${classification.color}18, ${classification.color}08)`,
            border: `1px solid ${classification.color}30`,
            boxShadow: `0 0 30px ${classification.color}12`,
          }}
        >
          <span className="text-base">{classification.emoji}</span>
          <span className="font-bold text-sm" style={{ color: classification.color }}>{classification.label}</span>
        </motion.div>

        {/* Recommended pool card */}
        {animDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-md mt-4"
          >
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
              {recommendedImage && (
                <div className="aspect-[16/9] w-full overflow-hidden relative">
                  <img src={recommendedImage} alt={poolName} className="w-full h-full object-cover" loading="eager" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                    <span className="text-xs font-bold text-primary-foreground uppercase tracking-wider">
                      {lang === 'es' ? 'Recomendado' : 'Recomendado'}
                    </span>
                  </div>
                </div>
              )}
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-1">{poolName}</h3>
                {recommendedSize && (
                  <p className="text-xs font-semibold text-blue-300 mb-1">📐 {lang === 'es' ? 'Tamaño ideal' : 'Tamanho ideal'}: {recommendedSize}</p>
                )}
                {poolDescription && <p className="text-xs text-white/50 leading-relaxed">{poolDescription}</p>}
              </div>
            </div>

            {/* Alternatives */}
            {alternatives.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-1">
                  {lang === 'es' ? 'También pueden gustarte' : 'Você também pode gostar'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {alternatives.map((alt, i) => (
                    <motion.div
                      key={alt.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + Math.min(i * 0.1, 0.15) }}
                      className="rounded-xl overflow-hidden border border-white/8 bg-white/5"
                    >
                      {alt.image && (
                        <div className="aspect-[16/10] overflow-hidden">
                          <img src={alt.image} alt={alt.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-white mb-0.5">{alt.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {alt.specs?.tamanho && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/50">
                              📐 {alt.specs.tamanho}
                            </span>
                          )}
                          {alt.specs?.possui_prainha && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300">🏖️ Prainha</span>
                          )}
                          {alt.specs?.possui_spa && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300">💆 Hidro</span>
                          )}
                          {alt.specs?.profundidade && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/50">
                              ↕ {alt.specs.profundidade}m
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Valuation estimate */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-4 rounded-2xl p-4 border border-emerald-500/20"
              style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  {lang === 'es' ? 'Valorización' : 'Valorização do imóvel'}
                </span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                {lang === 'es'
                  ? `Una piscina puede valorizar tu propiedad entre un ${valorization.minPct}% y ${valorization.maxPct}%.`
                  : `Uma piscina pode valorizar seu imóvel entre ${valorization.minPct}% e ${valorization.maxPct}%.`
                }
                {cidade && (
                  <span className="text-emerald-300 font-semibold">
                    {' '}{lang === 'es' ? `En ${cidade}, eso significa un incremento significativo.` : ` Em ${cidade}, isso pode significar um ganho expressivo.`}
                  </span>
                )}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-emerald-900/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${valorization.maxPct * 4}%` }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full"
                  />
                </div>
                <span className="text-emerald-300 text-xs font-bold">+{valorization.minPct}–{valorization.maxPct}%</span>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-5 mb-8"
            >
              <Button
                onClick={onContinue}
                className="w-full py-7 text-[15px] rounded-2xl font-bold shadow-xl gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.01] transition-all duration-300 gap-2 group"
              >
                {t('result_cta', lang)}
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </Button>
              <p className="text-white/30 text-xs text-center mt-2">
                {t('result_cta_hint', lang)}
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
