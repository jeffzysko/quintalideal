import { BarChart3, Users, Target, Globe, Sparkles } from 'lucide-react';
import { GuidedTour, type TourStep } from '@/components/GuidedTour';

const WIZARD_KEY = 'admin-welcome-v2';

const steps: TourStep[] = [
  {
    target: '[data-tour="admin-kpis"]',
    icon: BarChart3,
    title: 'KPIs da Rede',
    description: 'Visão geral de toda a rede: total de leads, novos, franquias ativas e cidades cobertas — com comparativo de período.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-leads"]',
    icon: Users,
    title: 'Gestão de Leads',
    description: 'Busque, filtre e gerencie todos os leads do sistema. Use os filtros por franquia, status, cidade e temperatura.',
    color: 'text-violet-600',
    bg: 'bg-violet-500/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-performance"]',
    icon: Target,
    title: 'Performance QI',
    description: 'Analise o funil de conversão, desempenho por modelo, aderência entre recomendado e vendido, e muito mais.',
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-franchises"]',
    icon: Sparkles,
    title: 'Franquias',
    description: 'Gerencie todas as franquias da rede, visualize rankings e acesse os painéis individuais de cada unidade.',
    color: 'text-primary',
    bg: 'bg-primary/10',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-territories"]',
    icon: Globe,
    title: 'Territórios',
    description: 'Gerencie as cidades atendidas por cada franquia. O sistema distribui leads automaticamente pela cidade do cliente.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    placement: 'bottom',
  },
];

export function AdminWelcomeWizard() {
  return <GuidedTour steps={steps} storageKey={WIZARD_KEY} delay={1500} />;
}
