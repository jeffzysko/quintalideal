import { Button } from '@/components/ui/button';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import logoQuintalIdeal from '@/assets/logo-quintal-ideal.png';
import heroPool from '@/assets/hero-pool.webp';
import { ArrowRight, Droplets, Shield, Clock } from 'lucide-react';
import { type Lang, t, UY_ENABLED_SLUGS } from '@/lib/i18n';

interface HeroSectionProps {
  onStart: () => void;
  franchiseName?: string;
  franchiseSlug?: string;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

export function HeroSection({ onStart, franchiseName, franchiseSlug, lang, onLangChange }: HeroSectionProps) {
  const showLangSwitch = franchiseSlug ? UY_ENABLED_SLUGS.has(franchiseSlug) : false;

  return (
    <LazyMotion features={domAnimation}>
      <div className="h-[100dvh] flex flex-col relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={heroPool} alt="" className="w-full h-full object-cover scale-105" loading="eager" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(8,20,40,0.4) 0%, rgba(8,20,40,0.2) 30%, rgba(8,20,40,0.5) 60%, rgba(8,20,40,0.92) 100%)'
          }} />
        </div>

        {/* Language toggle */}
        {showLangSwitch && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/15"
          >
            <button
              onClick={() => onLangChange('pt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                lang === 'pt' ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white/70'
              }`}
            >
              🇧🇷 PT
            </button>
            <button
              onClick={() => onLangChange('es')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                lang === 'es' ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white/70'
              }`}
            >
              🇺🇾 ES
            </button>
          </m.div>
        )}


        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-10 sm:py-10 max-w-lg mx-auto w-full" style={{ marginTop: '-5vh' }}>
          <m.img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-5 sm:mb-6 w-28 sm:w-36 md:w-44 h-auto drop-shadow-2xl"
          />

          {franchiseName && (
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] mb-3 sm:mb-4 text-white/50"
            >
              {franchiseName}
            </m.p>
          )}

          <m.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center text-[1.75rem] sm:text-[2rem] md:text-[2.75rem] font-extrabold leading-[1.08] mb-3 sm:mb-4 text-white tracking-tight"
          >
            {t('hero_title_1', lang)} para<br />
            <span className="bg-gradient-to-r from-blue-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
              {t('hero_title_2', lang)}
            </span>
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-center text-[13px] sm:text-sm md:text-base text-white/55 mb-6 sm:mb-8 max-w-xs mx-auto leading-relaxed"
          >
            {t('hero_subtitle', lang)}
          </m.p>

          {/* CTA Button */}
          <m.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="w-full max-w-xs"
          >
            <Button
              onClick={onStart}
              size="lg"
              className="text-[15px] px-8 py-7 rounded-2xl font-bold gap-3 w-full gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              {t('hero_cta', lang)}
              <m.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-5 h-5" />
              </m.span>
            </Button>
          </m.div>

          {/* Trust indicators */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-3 sm:gap-5 mt-6 sm:mt-8 mb-2 flex-wrap"
          >
            <div className="flex items-center gap-1.5 text-white/35">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-medium">{t('hero_trust_time', lang)}</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/35">
              <Shield className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-medium">{t('hero_trust_free', lang)}</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/35">
              <Droplets className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-medium">{t('hero_trust_analyses', lang)}</span>
            </div>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
