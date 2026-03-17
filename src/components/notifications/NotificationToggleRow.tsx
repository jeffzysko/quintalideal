import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bell, Mail, MessageCircle } from 'lucide-react';
import type { NotificationItem, NotificationChannel } from '@/hooks/useNotificationPreferences';

const PRIORITY_CONFIG = {
  high: { label: 'Importante', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  medium: { label: 'Média', class: 'bg-warning/10 text-warning border-warning/20' },
  low: { label: 'Baixa', class: 'bg-muted text-muted-foreground border-border' },
} as const;

const CHANNEL_ICONS = {
  push: { icon: Bell, label: 'Push', available: true },
  email: { icon: Mail, label: 'E-mail', available: false },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', available: false },
} as const;

interface Props {
  item: NotificationItem;
  onToggleChannel: (channel: keyof NotificationChannel) => void;
}

export function NotificationToggleRow({ item, onToggleChannel }: Props) {
  const priority = PRIORITY_CONFIG[item.priority];

  return (
    <div className="py-2.5 border-b border-border/10 last:border-0">
      {/* Row: label + push toggle inline */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold leading-tight">{item.label}</span>
            <Badge variant="outline" className={`text-[8px] px-1 py-0 leading-tight ${priority.class}`}>
              {priority.label}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Push toggle — always visible inline */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <Bell className={`w-3 h-3 ${item.channels.push ? 'text-primary' : 'text-muted-foreground/40'}`} />
          <Switch
            checked={item.channels.push}
            onCheckedChange={() => onToggleChannel('push')}
            className="scale-75"
          />
        </div>
      </div>

      {/* Future channels — compact */}
      <div className="flex items-center gap-3 mt-1.5 pl-0.5">
        {(Object.entries(CHANNEL_ICONS) as [keyof NotificationChannel, typeof CHANNEL_ICONS[keyof typeof CHANNEL_ICONS]][])
          .filter(([channel]) => channel !== 'push')
          .map(([channel, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Tooltip key={channel}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 opacity-35 cursor-not-allowed">
                    <Icon className="w-3 h-3" />
                    <span className="text-[9px]">{cfg.label}</span>
                    <Badge variant="outline" className="text-[7px] px-0.5 py-0">Breve</Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {cfg.label} estará disponível em breve
                </TooltipContent>
              </Tooltip>
            );
          })}
      </div>
    </div>
  );
}
