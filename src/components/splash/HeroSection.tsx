import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';
import heroPool from '@/assets/hero-pool.jpg';
import { ArrowRight, Droplets, Shield, Clock } from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
  franchiseName?: string;
}

export function HeroSection({ onStart, franchiseName }: HeroSectionProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroPool} alt="" className="w-full h-full object-cover scale-105" loading="eager" />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(8,20,40,0.4) 0%, rgba(8,20,40,0.2) 30%, rgba(8,20,40,0.5) 60%, rgba(8,20,40,0.92) 100%)'
        }} />
      </div>

      {/* Floating water drops */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] left-[10%] text-3xl opacity-20"
      >💧</motion.div>
      <motion.div
        animate={{ y: [6, -10, 6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[25%] right-[12%] text-2xl opacity-15"
      >💧</motion.div>
      <motion.div
        animate={{ y: [-5, 12, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-[40%] left-[75%] text-xl opacity-10"
      >💧</motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-end px-6 pb-10 pt-12 max-w-lg mx-auto w-full">
        <motion.img
          src={logoSplash}
          alt="Splash Piscinas"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-6 w-36 md:w-44 h-auto drop-shadow-2xl"
        />

        {franchiseName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-4 text-white/50"
          >
            {franchiseName}
          </motion.p>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-[2rem] md:text-[2.75rem] font-extrabold leading-[1.08] mb-4 text-white tracking-tight"
        >
          Descubra o <br />
          <span className="bg-gradient-to-r from-blue-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
            potencial escondido
          </span>
          <br />do seu quintal.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-center text-sm md:text-base text-white/55 mb-8 max-w-xs mx-auto leading-relaxed"
        >
          Análise inteligente em menos de 60 segundos. Descubra se seu quintal pode ter uma piscina Splash.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full max-w-xs"
        >
          <Button
            onClick={onStart}
            size="lg"
            className="text-[15px] px-8 py-7 rounded-2xl font-bold gap-3 w-full gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.02] transition-all duration-300"
          >
            Explorar meu quintal
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </Button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-5 mt-8 mb-2"
        >
          <div className="flex items-center gap-1.5 text-white/35">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">60 segundos</span>
          </div>
          <div className="w-px h-3 bg-white/15" />
          <div className="flex items-center gap-1.5 text-white/35">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">100% gratuito</span>
          </div>
          <div className="w-px h-3 bg-white/15" />
          <div className="flex items-center gap-1.5 text-white/35">
            <Droplets className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">+2.500 análises</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
