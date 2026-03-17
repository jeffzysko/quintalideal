import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, BellRing, BellOff } from 'lucide-react';

export function PushNotificationCard() {
  const { supported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      const ok = await subscribe();
      if (!ok && permission === 'denied') {
        // Can't do anything, browser blocked
      }
    }
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba notificações mesmo quando o app não estiver aberto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
                {isSubscribed ? 'Notificações ativadas' : 'Notificações desativadas'}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied'
                  ? 'Permissão bloqueada no navegador. Altere nas configurações do seu dispositivo.'
                  : isSubscribed
                    ? 'Você receberá alertas de novos leads, follow-ups e lembretes.'
                    : 'Ative para receber alertas instantâneos no seu dispositivo.'}
              </p>
            </div>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'} className="text-[10px]">
            {isSubscribed ? 'ON' : 'OFF'}
          </Badge>
        </div>

        <Button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          variant={isSubscribed ? 'outline' : 'default'}
          className="gap-2 rounded-xl w-full"
        >
          {loading ? 'Processando...' : isSubscribed ? 'Desativar push' : 'Ativar notificações push'}
        </Button>
      </CardContent>
    </Card>
  );
}
