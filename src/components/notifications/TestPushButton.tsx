import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function TestPushButton() {
  const { user, franchiseId } = useAuth();
  const { isSubscribed, supported } = usePushNotifications();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!supported || !isSubscribed) return null;

  const handleTest = async () => {
    if (!user) return;
    setSending(true);
    setSent(false);

    try {
      const effectiveFranchiseId = franchiseId || '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          franchise_id: effectiveFranchiseId,
          title: '🔔 Teste de notificação',
          message: 'Se você recebeu este alerta, as notificações push estão funcionando!',
          url: '/notificacoes/preferencias',
          user_id_filter: user.id,
        },
      });

      if (error) throw error;

      if (data?.sent > 0) {
        setSent(true);
        toast.success('Notificação de teste enviada!');
        setTimeout(() => setSent(false), 5000);
      } else {
        toast.info('Nenhuma assinatura encontrada para este dispositivo.');
      }
    } catch (err) {
      console.error('Test push error:', err);
      toast.error('Falha ao enviar notificação de teste.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-dashed border-muted-foreground/20">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Testar envio</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Envie uma notificação push para este dispositivo para confirmar que está funcionando.
            </p>
          </div>
          <Button
            onClick={handleTest}
            disabled={sending}
            variant={sent ? 'outline' : 'secondary'}
            size="sm"
            className="gap-1.5 rounded-xl shrink-0 min-h-[40px] text-xs"
          >
            {sent ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Enviado
              </>
            ) : sending ? (
              'Enviando…'
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Testar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
