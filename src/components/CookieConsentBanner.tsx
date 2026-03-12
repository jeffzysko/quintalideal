import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'cookie_consent';

export type ConsentStatus = 'accepted' | 'rejected' | null;

export function getConsentStatus(): ConsentStatus {
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === 'accepted' || val === 'rejected') return val;
  return null;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if no consent decision exists
    const timer = setTimeout(() => {
      if (!getConsentStatus()) setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
    // Disable analytics tracking by removing session
    sessionStorage.removeItem('splash_session_id');
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4"
        >
          <div className="max-w-2xl mx-auto rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground mb-1">Privacidade & Cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência, 
                  analisar o uso da plataforma e personalizar conteúdo. Ao clicar em "Aceitar", 
                  você concorda com o uso de cookies conforme nossa{' '}
                  <Link to="/privacidade" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    Política de Privacidade
                  </Link>.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    className="rounded-xl text-xs px-4 h-8"
                  >
                    Aceitar todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    className="rounded-xl text-xs px-4 h-8"
                  >
                    Rejeitar opcionais
                  </Button>
                  <Link
                    to="/privacidade#section-10"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
                  >
                    Saiba mais
                  </Link>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
