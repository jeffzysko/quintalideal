import { Share2, BarChart3, Users, CalendarClock, Sparkles } from 'lucide-react';
import { GuidedTour, type TourStep } from '@/components/GuidedTour';

const WIZARD_KEY = 'franchise-welcome-v2';

const steps: TourStep[] = [
  {
    target: '[data-tour="franchise-link"]',
    icon: Share2,
    title: 'Seu link de divulgação',
    description: 'Este é seu link exclusivo. Copie e compartilhe nas redes sociais — cada pessoa que responder ao quiz vira um lead na sua lista!',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="kpi-grid"]',
    icon: BarChart3,
    title: 'Seus números em tempo real',
    description: 'Aqui você vê o total de leads, novos, em negociação e vendidos. Selecione o período para comparar com o anterior.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-leads"]',
    icon: Users,
    title: 'Gerencie seus leads',
    description: 'Na aba "Leads" você vê todos os interessados. Clique em um lead para ver detalhes, mudar status, enviar WhatsApp e muito mais.',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-funnel"]',
    icon: Sparkles,
    title: 'Funil de Vendas',
    description: 'No "Funil", arraste os cards entre as colunas para atualizar o status. No mobile, deslize o card para ver ações rápidas de WhatsApp e Ligação.',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-reports"]',
    icon: BarChart3,
    title: 'Relatórios e Metas',
    description: 'Acompanhe gráficos de desempenho e defina sua meta mensal de vendas para celebrar suas conquistas! 🎉',
    color: 'text-primary',
    bg: 'bg-primary/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="nav-hoje"]',
    icon: CalendarClock,
    title: 'Central "Hoje"',
    description: 'Sua página de ação diária com atalhos rápidos, sugestões inteligentes e follow-ups pendentes. Use todo dia para não perder nenhum lead!',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    placement: 'top',
  },
];

interface WelcomeWizardProps {
  franchiseName?: string;
}

export function WelcomeWizard({ franchiseName }: WelcomeWizardProps) {
  return <GuidedTour steps={steps} storageKey={WIZARD_KEY} delay={1500} />;
}
