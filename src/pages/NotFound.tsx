import { motion } from 'framer-motion';
import { ArrowLeft, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(207 90% 42% / 0.3), transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4 text-center"
      >
        <motion.div className="text-center mb-8">
          <img src={logoQuintalIdeal} alt="Quintal Ideal" className="mx-auto w-40 mb-3 drop-shadow-lg brightness-0 invert" />
        </motion.div>

        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
            <Droplets className="w-8 h-8 text-primary/60" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-2 tracking-tight">404</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Página não encontrada. O endereço pode ter sido alterado ou removido.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
