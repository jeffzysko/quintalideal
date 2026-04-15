import { FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState } from 'react';

const BENEFITS = [
  'Geração de orçamentos ilimitados',
  'Envio automático por WhatsApp',
  'Histórico completo de propostas',
];

export function OrcamentoUpgradeWall() {
  const { franchiseId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!franchiseId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { franchiseId, plan: 'orcamento' },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-lg mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <FileText className="w-8 h-8 text-primary" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">Orçamentos Personalizados</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Crie e envie orçamentos profissionais diretamente pelo Quintal Ideal. Assine o plano para desbloquear.
      </p>

      <Card className="w-full border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-semibold text-foreground">Orçamento Personalizado</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">R$ 29,00</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6 text-left">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                {b}
              </li>
            ))}
          </ul>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? 'Redirecionando...' : 'Assinar por R$ 29,00/mês'}
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Já possui o plano WhatsApp Próprio? O acesso ao orçamento está incluso.
      </p>
    </div>
  );
}
