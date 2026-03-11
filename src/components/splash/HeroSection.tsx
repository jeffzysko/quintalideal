import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
  franchiseName?: string;
}

export function HeroSection({ onStart, franchiseName }: HeroSectionProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-primary/10 via-background to-accent/30 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto mb-6 w-20 h-20 rounded-full bg-primary flex items-center justify-center"
        >
          <Droplets className="w-10 h-10 text-primary-foreground" />
        </motion.div>

        {franchiseName && (
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">
            {franchiseName}
          </p>
        )}

        <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Seu quintal tem potencial para ter uma{' '}
          <span className="text-primary">piscina</span>?
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-8">
          Descubra em menos de 1 minuto qual piscina Splash combina com sua casa.
        </p>

        <Button
          onClick={onStart}
          size="lg"
          className="text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          Descobrir agora
        </Button>
      </motion.div>
    </div>
  );
}
