import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';
import heroPool from '@/assets/hero-pool.jpg';
import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
  franchiseName?: string;
}

export function HeroSection({ onStart, franchiseName }: HeroSectionProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-end relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroPool}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.85) 100%)'
        }} />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center px-6 pb-16 pt-12 max-w-lg w-full"
      >
        <motion.img
          src={logoSplash}
          alt="Splash Piscinas"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mx-auto mb-8 w-40 md:w-48 h-auto drop-shadow-lg"
        />

        {franchiseName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-white/70"
          >
            {franchiseName}
          </motion.p>
        )}

        <h1 className="text-3xl md:text-5xl font-bold leading-[1.1] mb-4 text-white tracking-tight">
          Descubra o potencial
          <br />
          <span className="text-primary-foreground/90">do seu quintal.</span>
        </h1>

        <p className="text-base md:text-lg text-white/70 mb-10 max-w-sm mx-auto leading-relaxed">
          Em menos de 1 minuto, descubra se seu quintal pode ter uma piscina Splash.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Button
            onClick={onStart}
            size="lg"
            className="text-base px-10 py-7 rounded-2xl shadow-2xl font-semibold gap-3 gradient-blue hover:opacity-90 transition-all duration-300 w-full max-w-xs"
          >
            Explorar meu quintal
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>

        <p className="text-xs text-white/40 mt-6">
          ⏱ Menos de 60 segundos • 100% gratuito
        </p>
      </motion.div>
    </div>
  );
}
