import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <BellOff className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold">Navegador incompatível</p>
              <p className="text-xs text-muted-foreground mt-0.5">
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas instantâneos no seu dispositivo, mesmo com o app fechado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isSubscribed ? 'bg-emerald-500/10' : 'bg-muted'
            }`}>
              {isSubscribed ? (
                <BellRing className="w-4 h-4 text-emerald-600" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isSubscribed ? 'Ativadas' : 'Desativadas'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isSubscribed
                  ? 'Você receberá alertas no seu dispositivo.'
                  : 'Ative para não perder nenhum lead.'}
              </p>
            </div>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'} className="text-[10px] shrink-0">
            {isSubscribed ? 'ON' : 'OFF'}
          </Badge>
        </div>

        {/* Permission denied guidance */}
        {permission === 'denied' && (
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
            <p className="text-xs font-semibold text-destructive">Permissão bloqueada no dispositivo</p>
            <p className="text-[11px] text-muted-foreground">
              {isIOS()
                ? 'No iPhone, vá em Ajustes → Notificações → Quintal Ideal → ative "Permitir Notificações".'
                : 'No Android, vá em Configurações → Apps → Quintal Ideal → Notificações → ative.'}
            </p>
          </div>
        )}

        <Button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          variant={isSubscribed ? 'outline' : 'default'}
          className="gap-2 rounded-xl w-full min-h-[48px] text-sm"
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
