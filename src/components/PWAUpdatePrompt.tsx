import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const INTERNAL_SLUGS = new Set(['mapa', 'ranking', 'painel', 'franquia', 'admin', 'perfil', 'suporte', 'notificacoes', 'hoje', 'install', 'explorar', 'docs', 'login', 'forgot-password', 'reset-password', 'termos', 'privacidade']);

export function PWAUpdatePrompt() {
  const { needsUpdate, applyUpdate } = usePWA();
  const { user, role } = useAuth();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Only show for authenticated users on internal app pages
  const isInternalPage = INTERNAL_SLUGS.has(pathname.split('/')[1] || '');
  const isLoggedIn = !!user && !!role;

  if (!needsUpdate || dismissed || !isLoggedIn || (!isInternalPage && pathname !== '/')) return null;
  // Block on "/" — public home
  if (pathname === '/') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-20 left-4 right-4 z-[100] sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="rounded-2xl border border-border/50 bg-card shadow-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl icon-bg-blue flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Nova versão disponível</p>
            <p className="text-xs text-muted-foreground mt-0.5">Atualize para a versão mais recente.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" onClick={applyUpdate} className="rounded-xl text-xs h-9">
              Atualizar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="h-9 w-9 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
