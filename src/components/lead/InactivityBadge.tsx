import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface InactivityBadgeProps {
  createdAt: string;
  lastActivityAt?: string | null;
}

export function InactivityBadge({ createdAt, lastActivityAt }: InactivityBadgeProps) {
  const reference = lastActivityAt || createdAt;
  const diffMs = Date.now() - new Date(reference).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  let label: string;
  let icon: typeof Clock;
  let className: string;

  if (hours < 24) {
    label = hours < 1 ? 'Interagido agora' : `Há ${hours}h`;
    icon = CheckCircle2;
    className = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (days <= 2) {
    label = `Há ${days} dia${days > 1 ? 's' : ''}`;
    icon = Clock;
    className = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    label = `Há ${days} dias sem interação`;
    icon = AlertTriangle;
    className = 'bg-red-50 text-red-700 border-red-200';
  }

  const Icon = icon;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}
