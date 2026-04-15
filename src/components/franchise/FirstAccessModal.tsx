import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import logoQI from '@/assets/logo-quintal-ideal.png';

interface FirstAccessModalProps {
  franchiseId: string;
  franchiseName: string;
}

const FEATURES = [
  {
    emoji: '🎯',
    title: 'Gerencie seus leads',
    description: 'Acompanhe cada interessado do primeiro contato até a venda',
  },
  {
    emoji: '📄',
    title: 'Crie orçamentos',
    description: 'Envie propostas profissionais direto pelo WhatsApp',
  },
  {
    emoji: '📊',
    title: 'Acompanhe sua performance',
    description: 'Veja seus números e bata suas metas',
  },
];

export function FirstAccessModal({ franchiseId, franchiseName }: FirstAccessModalProps) {
  const storageKey = `qi-first-access-done-${franchiseId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setOpen(true);
    }
  }, [storageKey]);

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-[480px] mx-4 rounded-2xl border bg-background p-6 sm:p-8 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <img src={logoQI} alt="Quintal Ideal" className="h-10 mb-5" />
              <h2 className="text-2xl font-bold mb-1">Olá, {franchiseName}! 👋</h2>
              <p className="text-muted-foreground mb-6">
                Sua franquia está pronta. Veja o que você pode fazer aqui:
              </p>

              <div className="grid gap-3 w-full mb-6">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-left"
                  >
                    <span className="text-xl leading-none mt-0.5">{f.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button size="lg" className="w-full" onClick={handleClose}>
                Entrar no painel →
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Um tour rápido vai aparecer para te guiar pelos recursos
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
