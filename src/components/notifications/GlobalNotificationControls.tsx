import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BellRing, BellOff, Shield } from 'lucide-react';

interface Props {
  onEnableAll: () => void;
  onDisableAll: () => void;
  onImportantOnly: () => void;
}

export function GlobalNotificationControls({ onEnableAll, onDisableAll, onImportantOnly }: Props) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Ações rápidas
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEnableAll}
            className="gap-1 rounded-lg text-[10px] sm:text-xs min-h-[40px] px-2"
          >
            <BellRing className="w-3 h-3 shrink-0" />
            <span className="truncate">Tudo</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportantOnly}
            className="gap-1 rounded-lg text-[10px] sm:text-xs min-h-[40px] px-2"
          >
            <Shield className="w-3 h-3 shrink-0" />
            <span className="truncate">Importantes</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDisableAll}
            className="gap-1 rounded-lg text-[10px] sm:text-xs min-h-[40px] px-2 text-muted-foreground"
          >
            <BellOff className="w-3 h-3 shrink-0" />
            <span className="truncate">Nenhuma</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
