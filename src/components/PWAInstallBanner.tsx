import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function PWAInstallBanner() {
  const { canInstall, promptInstall, isStandalone } = usePWA();
  const { user, role } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Only show for authenticated users (admins/franchises)
  const isLoggedIn = !!user && !!role;

  useEffect(() => {
    if (!canInstall || isStandalone || dismissed || !isLoggedIn) return;
    const alreadyDismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (alreadyDismissed) {
      setDismissed(true);
      return;
    }
    const timer = setTimeout(() => setShowBanner(true), 5000);
    return () => clearTimeout(timer);
  }, [canInstall, isStandalone, dismissed, isLoggedIn]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-20 left-4 right-4 z-[100] sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="rounded-2xl border border-primary/20 bg-card shadow-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl icon-bg-blue flex items-center justify-center shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Instalar Quintal Ideal</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Adicione à tela inicial para acesso rápido, como um app nativo.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={handleInstall} className="rounded-xl text-xs h-9 gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Instalar app
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="rounded-xl text-xs h-9 text-muted-foreground"
              >
                Agora não
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 rounded-lg shrink-0 -mt-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
