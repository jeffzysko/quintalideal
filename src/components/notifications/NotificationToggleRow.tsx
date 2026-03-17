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
    <div className="py-3.5 px-1 border-b border-border/15 last:border-0">
      {/* Label and description */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold leading-tight">{item.label}</span>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priority.class}`}>
              {priority.label}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Channel toggles */}
      <div className="flex items-center gap-3 pl-0.5">
        {(Object.entries(CHANNEL_ICONS) as [keyof NotificationChannel, typeof CHANNEL_ICONS[keyof typeof CHANNEL_ICONS]][]).map(
          ([channel, cfg]) => {
            const enabled = item.channels[channel];
            const Icon = cfg.icon;

            if (!cfg.available && channel !== 'push') {
              return (
                <Tooltip key={channel}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 opacity-40 cursor-not-allowed">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{cfg.label}</span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0">Em breve</Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {cfg.label} estará disponível em breve
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key={channel} className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${enabled ? 'text-primary' : 'text-muted-foreground/50'}`} />
                <span className={`text-[10px] font-medium ${enabled ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {cfg.label}
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => onToggleChannel(channel)}
                  className="scale-[0.8]"
                />
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
