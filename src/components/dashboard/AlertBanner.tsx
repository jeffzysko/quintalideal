import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type AlertLevel = 'critical' | 'warning' | 'info' | 'success';

interface AlertBannerProps {
  level: AlertLevel;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const STYLES: Record<AlertLevel, { bg: string; border: string; icon: typeof AlertTriangle; iconColor: string }> = {
  critical: { bg: 'bg-destructive/5', border: 'border-destructive/20', icon: XCircle, iconColor: 'text-destructive' },
  warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', icon: AlertTriangle, iconColor: 'text-amber-500' },
  info: { bg: 'bg-primary/5', border: 'border-primary/20', icon: Info, iconColor: 'text-primary' },
  success: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: CheckCircle2, iconColor: 'text-emerald-500' },
};

export function AlertBanner({ level, title, description, action }: AlertBannerProps) {
  const style = STYLES[level];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${style.border} ${style.bg} p-4 flex items-start gap-3`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
        <Icon className={`w-[18px] h-[18px] ${style.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
        {description && <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0 mt-0.5">{action}</div>}
    </motion.div>
  );
}
