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
      <CardContent className="pt-4 pb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Ações rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEnableAll}
            className="gap-1.5 rounded-xl text-xs min-h-[40px] flex-1"
          >
            <BellRing className="w-3.5 h-3.5" />
            Ativar tudo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onImportantOnly}
            className="gap-1.5 rounded-xl text-xs min-h-[40px] flex-1"
          >
            <Shield className="w-3.5 h-3.5" />
            Só importantes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDisableAll}
            className="gap-1.5 rounded-xl text-xs min-h-[40px] flex-1 text-muted-foreground"
          >
            <BellOff className="w-3.5 h-3.5" />
            Desativar tudo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
