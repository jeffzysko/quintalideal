import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NotificationToggleRow } from './NotificationToggleRow';
import type { NotificationSection as SectionType, NotificationChannel } from '@/hooks/useNotificationPreferences';

interface Props {
  section: SectionType;
  onToggleChannel: (itemKey: string, channel: keyof NotificationChannel) => void;
  onToggleSection: (enabled: boolean) => void;
}

export function NotificationSectionCard({ section, onToggleChannel, onToggleSection }: Props) {
  const [expanded, setExpanded] = useState(true);

  const allPushEnabled = section.items.every(i => i.channels.push);
  const somePushEnabled = section.items.some(i => i.channels.push);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2.5">
            <span className="text-base">{section.icon}</span>
            {section.title}
            <span className="text-[10px] font-normal text-muted-foreground">
              {section.items.filter(i => i.channels.push).length}/{section.items.length} ativos
            </span>
          </CardTitle>
          <div className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
            <Switch
              checked={allPushEnabled}
              onCheckedChange={onToggleSection}
              className="scale-[0.85]"
              aria-label={`Ativar todas as notificações de ${section.title}`}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-2">
          {section.items.map(item => (
            <NotificationToggleRow
              key={item.key}
              item={item}
              onToggleChannel={(channel) => onToggleChannel(item.key, channel)}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
