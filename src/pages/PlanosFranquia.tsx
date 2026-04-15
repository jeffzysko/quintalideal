import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, MessageCircle, FileText, Lightbulb, Clock, Rocket, Send, ThumbsUp, BarChart3 } from 'lucide-react';
import { useFranchiseMetrics } from '@/hooks/useFranchiseMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { useState } from 'react';

interface FranchisePlan {
  whatsapp_plan_active: boolean;
  orcamento_plan_active: boolean;
  stripe_subscription_status: string | null;
  orcamento_stripe_subscription_status: string | null;
  orcamento_stripe_subscription_id: string | null;
  zapi_phone_number: string | null;
}

const ORCAMENTO_BENEFITS = [
  'Criação de orçamentos e propostas ilimitados',
  'Modelos profissionais personalizados com a identidade da franquia',
  'Envio automático de propostas por WhatsApp',
  'Histórico completo de orçamentos enviados',
  'Acompanhamento de status (enviado, visualizado, aceito, recusado)',
  'Notificação automática ao cliente com vencimento da proposta',
];

const WHATSAPP_BENEFITS = [
  'Tudo do plano Orçamento Personalizado',
  'Envio de todas as notificações pelo número de WhatsApp da própria franquia',
  'Maior credibilidade e reconhecimento pelos clientes',
  'Instância dedicada gerenciada pela plataforma (sem necessidade de conta externa)',
  'Conexão simples via QR Code em menos de 2 minutos',
  'Reconexão automática em caso de queda',
  'Suporte prioritário para a integração WhatsApp',
];

const FAQ = [
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. Você pode cancelar sua assinatura a qualquer momento pelo botão "Gerenciar assinatura". O acesso permanece ativo até o fim do período já pago.',
  },
  {
    q: 'O plano WhatsApp realmente inclui o Orçamento?',
    a: 'Sim. Ao assinar o plano WhatsApp Próprio, você tem acesso completo aos Orçamentos Personalizados sem custo adicional.',
  },
  {
    q: 'Como funciona o WhatsApp Próprio?',
    a: 'Após assinar, você acessa as configurações de WhatsApp e escaneia um QR Code com o celular da franquia. Em menos de 2 minutos seu número estará conectado e todas as notificações passarão a ser enviadas por ele.',
  },
  {
    q: 'O que acontece se o pagamento falhar?',
    a: 'O Stripe tentará cobrar novamente por alguns dias. Você receberá uma notificação por WhatsApp com o link para atualizar seu cartão. Se não for regularizado, o plano é cancelado e os recursos voltam ao estado gratuito.',
  },
  {
    q: 'Como funciona o período de teste gratuito?',
    a: 'O plano Orçamento Personalizado oferece 7 dias de teste gratuito. Durante esse período, você tem acesso completo a todos os recursos sem nenhuma cobrança. Após os 7 dias, a assinatura é cobrada automaticamente. Você pode cancelar a qualquer momento durante o teste.',
  },
];

export default function PlanosFranquia() {
  const { franchiseId } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['franchise-plans', franchiseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchises')
        .select('whatsapp_plan_active, orcamento_plan_active, stripe_subscription_status, orcamento_stripe_subscription_status, orcamento_stripe_subscription_id, zapi_phone_number')
        .eq('id', franchiseId!)
        .maybeSingle();
      if (error) throw error;
      return data as FranchisePlan | null;
    },
    enabled: !!franchiseId,
    staleTime: 30_000,
  });

  const whatsappActive = plan?.whatsapp_plan_active ?? false;
  const orcamentoActive = plan?.orcamento_plan_active ?? false;
  const orcamentoTrialing = plan?.orcamento_stripe_subscription_status === 'trialing';
  const orcamentoViaWhatsApp = whatsappActive && orcamentoActive && !orcamentoTrialing;
  const orcamentoStandalone = (orcamentoActive || orcamentoTrialing) && !whatsappActive;
  const noPlan = !whatsappActive && !orcamentoActive && !orcamentoTrialing;
  const hasAnyPlan = !noPlan;

  const navigate = useNavigate();
  const { data: metrics } = useFranchiseMetrics(hasAnyPlan ? franchiseId : null);

  const handleCheckout = async (planType: 'whatsapp' | 'orcamento') => {
    if (!franchiseId) return;
    setLoadingPlan(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { franchiseId, plan: planType },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || 'Erro ao criar sessão');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handlePortal = async (planType: 'whatsapp' | 'orcamento') => {
    if (!franchiseId) return;
    setLoadingPlan(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: { franchiseId, planType },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Erro ao abrir portal');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao abrir portal de assinatura');
    } finally {
      setLoadingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title="Planos e Assinaturas" subtitle="Carregando..." fallbackPath="/franquia" />
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto pb-24">
      <PageHeader
        title="Planos e Assinaturas"
        subtitle="Expanda os recursos da sua franquia com nossos planos adicionais."
        fallbackPath="/franquia"
      />

      {/* Banner for free plan */}
      {noPlan && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Você está utilizando o <strong>plano gratuito</strong>. Conheça os recursos disponíveis para impulsionar sua franquia.
          </p>
        </div>
      )}

      {/* Current Plan Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meu plano atual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {noPlan && (
            <p className="text-sm text-muted-foreground">Plano Gratuito — recursos básicos disponíveis</p>
          )}
          {orcamentoTrialing && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50 gap-1">
              <Clock className="h-3 w-3" />
              Orçamento Personalizado — Em teste gratuito
            </Badge>
          )}
          {orcamentoActive && !orcamentoTrialing && (
            <Badge variant="default" className="bg-success text-success-foreground gap-1">
              <FileText className="h-3 w-3" />
              Orçamento Personalizado ativo
              {orcamentoViaWhatsApp && (
                <span className="ml-1 text-[10px] opacity-80 font-normal">Incluso</span>
              )}
            </Badge>
          )}
          {whatsappActive && (
            <Badge variant="default" className="bg-success text-success-foreground gap-1">
              <MessageCircle className="h-3 w-3" />
              WhatsApp Próprio ativo
              {plan?.zapi_phone_number && (
                <span className="ml-1 text-[10px] opacity-80 font-normal">• {plan.zapi_phone_number}</span>
              )}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      {hasAnyPlan && metrics && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Meu uso este mês</h2>

          {metrics.orcamentoSent === 0 && metrics.whatsappSent === 0 && orcamentoTrialing ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-4 py-6">
                <Rocket className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">🚀 Você ainda não enviou nenhum orçamento este mês. Que tal começar agora?</p>
                </div>
                <Button size="sm" onClick={() => navigate('/propostas/nova')}>
                  Criar primeiro orçamento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(orcamentoActive || orcamentoTrialing) && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                          <Send className="h-3 w-3" /> Orçamentos enviados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-foreground">{metrics.orcamentoSent}</p>
                        <p className="text-xs text-muted-foreground">{metrics.totalOrcamentoHistoric} total</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> Taxa de aceite
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.orcamentoSent > 0 ? (() => {
                          const rate = Math.round((metrics.orcamentoAccepted / metrics.orcamentoSent) * 100);
                          const color = rate > 50 ? 'text-success' : rate >= 20 ? 'text-yellow-600' : 'text-destructive';
                          return (
                            <>
                              <p className={`text-2xl font-bold ${color}`}>{rate}%</p>
                              <p className="text-xs text-muted-foreground">{metrics.orcamentoAccepted} aceitos</p>
                            </>
                          );
                        })() : (
                          <p className="text-sm text-muted-foreground">Sem dados</p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
                {whatsappActive && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> Mensagens este mês
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-foreground">{metrics.whatsappSent}</p>
                        <p className="text-xs text-muted-foreground">{metrics.totalWhatsappHistoric} total</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Monthly bar chart */}
              {(orcamentoActive || orcamentoTrialing) && metrics.monthlyOrcamento.some(m => m.count > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" /> Orçamentos enviados — últimos 6 meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-32">
                      {metrics.monthlyOrcamento.map((m, i) => {
                        const max = Math.max(...metrics.monthlyOrcamento.map(x => x.count), 1);
                        const height = (m.count / max) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium text-foreground">{m.count}</span>
                            <div
                              className="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                            <span className="text-[10px] text-muted-foreground">{m.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp card first on mobile via order */}
        {/* CARD 2 — WhatsApp Próprio */}
        <Card className="border-primary/30 shadow-lg relative overflow-hidden order-first md:order-last">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
            Plano completo
          </div>
          <CardHeader className="pt-8">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">WhatsApp Próprio</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">R$ 149,00</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <Badge variant="secondary" className="w-fit gap-1 mt-2">
              <Sparkles className="h-3 w-3" /> Inclui o plano Orçamento
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {WHATSAPP_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {whatsappActive ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handlePortal('whatsapp')}
                disabled={loadingPlan === 'whatsapp'}
              >
                {loadingPlan === 'whatsapp' ? 'Abrindo...' : 'Gerenciar assinatura'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleCheckout('whatsapp')}
                  disabled={loadingPlan === 'whatsapp'}
                >
                  {loadingPlan === 'whatsapp'
                    ? 'Redirecionando...'
                    : orcamentoStandalone
                      ? 'Fazer upgrade — R$ 149,00/mês'
                      : 'Assinar por R$ 149,00/mês'}
                </Button>
                {orcamentoStandalone && (
                  <p className="text-xs text-muted-foreground text-center">
                    Sua assinatura atual de orçamento será cancelada automaticamente ao fazer o upgrade
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 1 — Orçamento Personalizado */}
        <Card className="relative overflow-hidden order-last md:order-first">
          <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
            Mais popular
          </div>
          <CardHeader className="pt-8">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Orçamento Personalizado</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">R$ 29,00</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {ORCAMENTO_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {orcamentoViaWhatsApp ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="w-full" disabled>
                    Incluso no seu plano
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Este recurso está incluso no seu plano WhatsApp Próprio</TooltipContent>
              </Tooltip>
            ) : orcamentoTrialing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
                  <span className="text-sm text-yellow-800 font-medium">Período de teste gratuito ativo</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handlePortal('orcamento')}
                  disabled={loadingPlan === 'orcamento'}
                >
                  {loadingPlan === 'orcamento' ? 'Abrindo...' : 'Gerenciar assinatura'}
                </Button>
              </div>
            ) : orcamentoStandalone ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handlePortal('orcamento')}
                disabled={loadingPlan === 'orcamento'}
              >
                {loadingPlan === 'orcamento' ? 'Abrindo...' : 'Gerenciar assinatura'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleCheckout('orcamento')}
                  disabled={loadingPlan === 'orcamento'}
                >
                  {loadingPlan === 'orcamento' ? 'Redirecionando...' : 'Começar grátis — 7 dias de teste'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Sem cobrança durante o período de teste. Cancele quando quiser.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Dúvidas frequentes</h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
