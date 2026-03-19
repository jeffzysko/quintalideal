import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, BarChart3, Users, CalendarClock, ArrowRight, Sparkles } from 'lucide-react';

const WIZARD_KEY = 'franchise-welcome-dismissed';

const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao seu painel!',
    description: 'Este é o seu centro de comando. Aqui você vai gerenciar leads, acompanhar vendas e muito mais. Vamos fazer um tour rápido?',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Share2,
    title: 'Seu link de divulgação',
    description: 'No topo do painel você encontra seu link exclusivo. Compartilhe nas redes sociais e com clientes — cada pessoa que responder ao quiz vira um lead na sua lista!',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Users,
    title: 'Gerencie seus leads',
    description: 'Na aba "Leads" você vê todos os interessados. No "Funil", arraste os cards entre as colunas para atualizar o status. Você também pode cadastrar leads manualmente ou importar via CSV.',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
  },
  {
    icon: CalendarClock,
    title: 'Central "Hoje" e Follow-ups',
    description: 'Use a página "Hoje" para ver suas prioridades: 4 ações rápidas (Novo Lead, Funil, WhatsApp, Ligar), sugestões inteligentes, follow-ups agendados e leads novos — tudo organizado por prioridade.',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e Metas',
    description: 'Na aba "Relatórios", acompanhe gráficos de desempenho. Defina sua meta mensal de vendas para manter o foco e celebrar suas conquistas! 🎉',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

interface WelcomeWizardProps {
  franchiseName?: string;
}

export function WelcomeWizard({ franchiseName }: WelcomeWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(WIZARD_KEY);
    if (!dismissed) {
      // Show after a short delay for smoother experience
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(WIZARD_KEY, 'true');
    setOpen(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      handleClose();
    }
  };

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden gap-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="p-6 sm:p-8"
          >
            <div className={`w-14 h-14 rounded-2xl ${current.bg} flex items-center justify-center mb-5`}>
              <current.icon className={`w-7 h-7 ${current.color}`} />
            </div>

            <h2 className="text-lg font-bold text-foreground mb-2">
              {step === 0 && franchiseName ? `Bem-vindo, ${franchiseName}!` : current.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-border/30 bg-muted/30">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-primary w-5' : 'bg-muted-foreground/20'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step < steps.length - 1 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleClose}>
                Pular
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleNext}>
              {step < steps.length - 1 ? (
                <>Próximo <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                'Começar!'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
