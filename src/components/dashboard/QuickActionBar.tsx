import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Workflow, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { LeadRow } from '@/lib/lead-constants';

interface QuickAction {
  icon: typeof MessageCircle;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: number;
}

interface QuickActionBarProps {
  onNavigatePipeline?: () => void;
  leads?: LeadRow[];
  pendingFollowups?: number;
  onAddManualLead?: () => void;
}

export function QuickActionBar({ onNavigatePipeline, leads = [], pendingFollowups, onAddManualLead }: QuickActionBarProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  // Find the hottest uncontacted lead for Ligar/WhatsApp
  const hotUncontacted = leads
    .filter(l => l.status_lead === 'novo' && l.telefone)
    .sort((a, b) => (b.pontuacao_quintal || 0) - (a.pontuacao_quintal || 0))[0];

  const handleWhatsApp = () => {
    if (hotUncontacted?.telefone) {
      const phone = hotUncontacted.telefone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      const msg = encodeURIComponent(`Olá ${hotUncontacted.nome || ''}, tudo bem?`);
      window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
    } else {
      toast.info('Nenhum lead novo com telefone disponível');
    }
  };

  const handleCall = () => {
    if (hotUncontacted?.telefone) {
      const phone = hotUncontacted.telefone.replace(/\D/g, '');
      window.open(`tel:+55${phone}`, '_self');
    } else {
      toast.info('Nenhum lead novo com telefone disponível');
    }
  };

  const funnelPath = isAdmin ? '/admin?tab=kanban' : '/franquia?tab=funnel';

  const actions: QuickAction[] = [
    {
      icon: UserPlus,
      label: 'Novo Lead',
      color: 'text-primary',
      bgColor: 'icon-bg-blue',
      onClick: onAddManualLead || (() => {}),
    },
    {
      icon: Workflow,
      label: 'Funil',
      color: 'text-violet-600',
      bgColor: 'icon-bg-violet',
      onClick: onNavigatePipeline || (() => navigate(funnelPath)),
      badge: pendingFollowups && pendingFollowups > 0 ? pendingFollowups : undefined,
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      color: 'text-green-600',
      bgColor: 'icon-bg-green',
      onClick: handleWhatsApp,
    },
    {
      icon: Phone,
      label: 'Ligar',
      color: 'text-emerald-600',
      bgColor: 'icon-bg-green',
      onClick: handleCall,
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-4 gap-2 pb-1">
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-center gap-1.5 min-w-[72px] py-3 px-2 rounded-2xl relative',
              'border border-border/30 bg-card transition-all active:scale-95',
              'hover:shadow-sm'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', action.bgColor)}>
              <action.icon className={cn('w-5 h-5', action.color)} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                {action.badge > 9 ? '9+' : action.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
