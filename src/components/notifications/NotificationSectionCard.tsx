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

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="p-3 sm:p-4 pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">{section.icon}</span>
            <span className="truncate">{section.title}</span>
            <span className="text-[9px] font-normal text-muted-foreground shrink-0 tabular-nums">
              {section.items.filter(i => i.channels.push).length}/{section.items.length}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <Switch
              checked={allPushEnabled}
              onCheckedChange={onToggleSection}
              className="scale-75 sm:scale-[0.85]"
              aria-label={`Ativar todas de ${section.title}`}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 sm:p-4 pt-0">
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
