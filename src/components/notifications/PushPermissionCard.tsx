import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, BellRing, BellOff } from 'lucide-react';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PushPermissionCard() {
  const { supported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <BellOff className="w-4 h-4 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Navegador incompatível</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Seu navegador não suporta notificações push. Instale o app ou use Chrome/Safari.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Card className={`transition-colors ${isSubscribed ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : ''}`}>
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">Notificações Push</span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isSubscribed ? 'bg-emerald-500/10' : 'bg-muted'
            }`}>
              {isSubscribed ? (
                <BellRing className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">
                {isSubscribed ? 'Ativadas' : 'Desativadas'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                {isSubscribed
                  ? 'Alertas ativos no dispositivo.'
                  : 'Ative para não perder leads.'}
              </p>
            </div>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'} className="text-[9px] shrink-0 px-1.5 py-0">
            {isSubscribed ? 'ON' : 'OFF'}
          </Badge>
        </div>

        {/* Permission denied */}
        {permission === 'denied' && (
          <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-xs font-semibold text-destructive">Permissão bloqueada</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              {isIOS()
                ? 'Ajustes → Notificações → Quintal Ideal → ative "Permitir".'
                : 'Configurações → Apps → Quintal Ideal → Notificações → ative.'}
            </p>
          </div>
        )}

        <Button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          className="gap-1.5 rounded-xl w-full min-h-[44px] text-xs sm:text-sm"
        >
          {loading
            ? 'Processando…'
            : isSubscribed
              ? 'Desativar push'
              : 'Ativar notificações push'}
        </Button>
      </CardContent>
    </Card>
  );
}
