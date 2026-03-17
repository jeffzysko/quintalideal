import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, CalendarPlus, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: typeof MessageCircle;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface QuickActionBarProps {
  onNavigatePipeline?: () => void;
}

export function QuickActionBar({ onNavigatePipeline }: QuickActionBarProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const dashPath = isAdmin ? '/admin' : '/franquia';

  const actions: QuickAction[] = [
    {
      icon: Workflow,
      label: 'Funil',
      color: 'text-violet-600',
      bgColor: 'icon-bg-violet',
      onClick: onNavigatePipeline || (() => navigate(dashPath)),
    },
    {
      icon: CalendarPlus,
      label: 'Follow-up',
      color: 'text-primary',
      bgColor: 'icon-bg-blue',
      onClick: () => navigate(dashPath),
    },
    {
      icon: Phone,
      label: 'Ligar',
      color: 'text-emerald-600',
      bgColor: 'icon-bg-green',
      onClick: () => navigate(dashPath),
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      color: 'text-green-600',
      bgColor: 'icon-bg-green',
      onClick: () => navigate(dashPath),
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
        {actions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-center gap-1.5 min-w-[72px] py-3 px-2 rounded-2xl',
              'border border-border/30 bg-card transition-all active:scale-95',
              'hover:shadow-sm'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', action.bgColor)}>
              <action.icon className={cn('w-5 h-5', action.color)} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
