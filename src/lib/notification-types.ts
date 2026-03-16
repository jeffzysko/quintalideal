import {
  UserPlus,
  Phone,
  CalendarClock,
  ArrowRightLeft,
  AlertTriangle,
  Settings,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

export interface NotificationTypeConfig {
  label: string;
  emoji: string;
  icon: LucideIcon;
  /** Tailwind text color class using semantic tokens */
  color: string;
  /** Tailwind bg class for the icon dot */
  dotColor: string;
  /** Priority weight – higher = more important */
  priority: number;
}

export const NOTIFICATION_TYPES: Record<string, NotificationTypeConfig> = {
  new_lead: {
    label: 'Novo Lead',
    emoji: '🎯',
    icon: UserPlus,
    color: 'text-primary',
    dotColor: 'bg-primary',
    priority: 3,
  },
  followup: {
    label: 'Follow-up',
    emoji: '📞',
    icon: Phone,
    color: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
    priority: 4,
  },
  followup_reminder: {
    label: 'Lembrete',
    emoji: '⏰',
    icon: CalendarClock,
    color: 'text-amber-600',
    dotColor: 'bg-amber-500',
    priority: 5,
  },
  status_change: {
    label: 'Mudança de status',
    emoji: '🔄',
    icon: ArrowRightLeft,
    color: 'text-blue-600',
    dotColor: 'bg-blue-500',
    priority: 2,
  },
  alert: {
    label: 'Alerta',
    emoji: '⚠️',
    icon: AlertTriangle,
    color: 'text-destructive',
    dotColor: 'bg-destructive',
    priority: 5,
  },
  system: {
    label: 'Sistema',
    emoji: '⚙️',
    icon: Settings,
    color: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground',
    priority: 1,
  },
  announcement: {
    label: 'Comunicado',
    emoji: '📢',
    icon: Megaphone,
    color: 'text-violet-600',
    dotColor: 'bg-violet-500',
    priority: 2,
  },
};

export const DEFAULT_TYPE: NotificationTypeConfig = {
  label: 'Notificação',
  emoji: '🔔',
  icon: Settings,
  color: 'text-muted-foreground',
  dotColor: 'bg-muted-foreground',
  priority: 1,
};

export function getNotificationType(type: string): NotificationTypeConfig {
  return NOTIFICATION_TYPES[type] || DEFAULT_TYPE;
}

/** All types available for filtering */
export const FILTERABLE_TYPES = Object.entries(NOTIFICATION_TYPES).map(([value, cfg]) => ({
  value,
  label: `${cfg.emoji} ${cfg.label}`,
}));
