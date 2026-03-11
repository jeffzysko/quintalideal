import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';
import { Compass } from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
  franchiseName?: string;
}

export function HeroSection({ onStart, franchiseName }: HeroSectionProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, hsl(207 65% 93%) 0%, hsl(0 0% 99.6%) 40%, hsl(130 20% 92%) 100%)'
      }}
    >
      {/* Decorative shapes */}
      <div className="absolute bottom-0 left-0 right-0 h-48 opacity-20"
        style={{ background: 'linear-gradient(180deg, transparent, hsl(207 65% 76%))' }}
      />
      <div className="absolute top-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(322 95% 47%), transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center max-w-lg"
      >
        <motion.img
          src={logoSplash}
          alt="Splash Piscinas"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-8 w-56 md:w-72 h-auto"
        />

        {franchiseName && (
          <p className="text-sm font-semibold text-secondary uppercase tracking-widest mb-2">
            {franchiseName}
          </p>
        )}

        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 text-foreground">
          Seu quintal pode esconder mais potencial do que você imagina.
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-8">
          Vamos explorar seu quintal e descobrir se ele pode ter uma piscina.
        </p>

        <Button
          onClick={onStart}
          size="lg"
          className="text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all font-bold gap-2"
        >
          <Compass className="w-5 h-5" />
          Explorar meu quintal
        </Button>
      </motion.div>
    </div>
  );
}
