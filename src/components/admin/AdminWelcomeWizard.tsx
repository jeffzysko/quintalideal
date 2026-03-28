import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Users, Target, Globe, ArrowRight, Sparkles } from 'lucide-react';

const WIZARD_KEY = 'admin-welcome-dismissed';

const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Painel da Fábrica!',
    description: 'Este é o seu centro de comando. Aqui você acompanha todas as franquias, leads e métricas do sistema Quintal Ideal. Vamos fazer um tour rápido?',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Inteligência e KPIs',
    description: 'Na aba "Inteligência" você vê os KPIs principais: total de leads, novos leads, média de potencial, franquias ativas e cidades cobertas — com comparativo de período.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Target,
    title: 'Performance do Quintal Ideal',
    description: 'Na aba "Performance QI" você analisa o funil de conversão, desempenho por modelo, aderência entre recomendado e vendido, e leads quentes — tudo filtrado por período, franquia e cidade.',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Users,
    title: 'Gestão de Leads e Franquias',
    description: 'Na aba "Leads" você busca e filtra todos os leads do sistema. Nas abas "Franquias" e "Territórios" você gerencia a rede e as cidades atendidas por cada unidade.',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Globe,
    title: 'Territórios e Distribuição',
    description: 'O sistema distribui leads automaticamente pela cidade do cliente. Gerencie as cidades cobertas por cada franquia na aba "Territórios" para garantir cobertura completa.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

export function AdminWelcomeWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem(WIZARD_KEY);
    if (!dismissed) {
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
              {current.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-border/30 bg-muted/30">
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
