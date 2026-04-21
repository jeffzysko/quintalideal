import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Users, Clock, AlertTriangle, XCircle, CreditCard, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type FilterType = 'all' | 'whatsapp' | 'orcamento' | 'trial' | 'past_due';

interface FranchiseRow {
  id: string;
  nome_franquia: string;
  whatsapp_plan_active: boolean;
  orcamento_plan_active: boolean;
  stripe_subscription_status: string | null;
  orcamento_stripe_subscription_status: string | null;
  stripe_customer_id: string | null;
  orcamento_stripe_customer_id: string | null;
  whatsapp_plan_expires_at: string | null;
  created_at: string;
}

function computeMRR(f: FranchiseRow): number {
  // WhatsApp includes Orçamento, so max is 149
  if (f.whatsapp_plan_active && (f.stripe_subscription_status === 'active')) return 149;
  if (f.orcamento_plan_active && f.orcamento_stripe_subscription_status === 'active') return 29;
  return 0;
}

function getStripeCustomerUrl(customerId: string | null): string | null {
  if (!customerId) return null;
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

export default function SuperAdminReceita() {
  const { role, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: franchises = [], isLoading } = useQuery({
    queryKey: ['superadmin-receita'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchises')
        .select('id, nome_franquia, whatsapp_plan_active, orcamento_plan_active, stripe_subscription_status, orcamento_stripe_subscription_status, stripe_customer_id, orcamento_stripe_customer_id, whatsapp_plan_expires_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FranchiseRow[];
    },
    enabled: role === 'super_admin',
    staleTime: 30_000,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role !== 'super_admin') {
    return <Navigate to="/painel" replace />;
  }

  // Compute metrics
  const whatsappActive = franchises.filter(f => f.whatsapp_plan_active && f.stripe_subscription_status === 'active');
  const orcamentoOnly = franchises.filter(f => f.orcamento_plan_active && ['active', 'trialing'].includes(f.orcamento_stripe_subscription_status ?? '') && !f.whatsapp_plan_active);
  const trialing = franchises.filter(f => f.orcamento_stripe_subscription_status === 'trialing');
  const pastDue = franchises.filter(f => f.stripe_subscription_status === 'past_due' || f.orcamento_stripe_subscription_status === 'past_due');
  const canceledThisMonth = franchises.filter(f => {
    return (f.stripe_subscription_status === 'canceled' || f.orcamento_stripe_subscription_status === 'canceled');
  });

  const mrrTotal = (whatsappActive.length * 149) + (orcamentoOnly.filter(f => f.orcamento_stripe_subscription_status === 'active').length * 29);

  // Filter subscribers for the table
  const subscribers = franchises.filter(f => {
    const hasAnyPlan = f.whatsapp_plan_active || f.orcamento_plan_active ||
      f.stripe_subscription_status === 'past_due' || f.orcamento_stripe_subscription_status === 'past_due' ||
      f.orcamento_stripe_subscription_status === 'trialing';
    if (!hasAnyPlan) return false;

    switch (filter) {
      case 'whatsapp': return f.whatsapp_plan_active;
      case 'orcamento': return f.orcamento_plan_active && !f.whatsapp_plan_active;
      case 'trial': return f.orcamento_stripe_subscription_status === 'trialing';
      case 'past_due': return f.stripe_subscription_status === 'past_due' || f.orcamento_stripe_subscription_status === 'past_due';
      default: return true;
    }
  });

  const canceled = franchises.filter(f =>
    f.stripe_subscription_status === 'canceled' || f.orcamento_stripe_subscription_status === 'canceled'
  ).slice(0, 10);

  const FILTERS: { label: string; value: FilterType }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'WhatsApp', value: 'whatsapp' },
    { label: 'Orçamento', value: 'orcamento' },
    { label: 'Trial', value: 'trial' },
    { label: 'Inadimplentes', value: 'past_due' },
  ];

  return (
    <div>
      <PageHeader
        title="Receita"
        subtitle="Visão geral de assinaturas e receita recorrente da plataforma"
      />
      <div className="container max-w-6xl mx-auto px-4 py-6 pb-16 space-y-6">

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> MRR Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">R$ {mrrTotal.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{whatsappActive.length}</p>
                <p className="text-xs text-muted-foreground">assinantes ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{orcamentoOnly.length}</p>
                <p className="text-xs text-muted-foreground">
                  {trialing.length > 0 && `${trialing.length} em trial`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Em trial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{trialing.length}</p>
              </CardContent>
            </Card>

            <Card className={pastDue.length > 0 ? 'border-yellow-300 bg-yellow-50/50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Inadimplentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${pastDue.length > 0 ? 'text-yellow-700' : 'text-foreground'}`}>{pastDue.length}</p>
              </CardContent>
            </Card>

            <Card className={canceledThisMonth.length > 0 ? 'border-destructive/30 bg-destructive/5' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Cancelamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${canceledThisMonth.length > 0 ? 'text-destructive' : 'text-foreground'}`}>{canceledThisMonth.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Subscribers Table */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Assinantes ativos</h2>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(f => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Franquia</TableHead>
                    <TableHead>Planos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Próx. cobrança</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum assinante encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscribers.map(f => {
                      const mrr = computeMRR(f);
                      const stripeUrl = getStripeCustomerUrl(f.stripe_customer_id || f.orcamento_stripe_customer_id);
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.nome_franquia}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {f.whatsapp_plan_active && <Badge variant="default" className="bg-primary text-primary-foreground text-xs">WhatsApp</Badge>}
                              {f.orcamento_plan_active && !f.whatsapp_plan_active && (
                                <Badge variant="secondary" className="text-xs">Orçamento</Badge>
                              )}
                              {f.orcamento_stripe_subscription_status === 'trialing' && (
                                <Badge variant="outline" className="border-yellow-500 text-yellow-700 text-xs">Trial</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={f.stripe_subscription_status || f.orcamento_stripe_subscription_status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {f.whatsapp_plan_expires_at
                              ? new Date(f.whatsapp_plan_expires_at).toLocaleDateString('pt-BR')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {mrr > 0 ? `R$ ${mrr}` : '—'}
                          </TableCell>
                          <TableCell>
                            {stripeUrl && (
                              <a href={stripeUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Cancellations */}
          {canceled.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Cancelamentos recentes</h2>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Franquia</TableHead>
                      <TableHead>Plano cancelado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canceled.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome_franquia}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {f.stripe_subscription_status === 'canceled' && (
                              <Badge variant="destructive" className="text-xs">WhatsApp</Badge>
                            )}
                            {f.orcamento_stripe_subscription_status === 'canceled' && (
                              <Badge variant="destructive" className="text-xs">Orçamento</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Cancelado</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-success text-success-foreground text-xs">Ativo</Badge>;
    case 'trialing':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700 text-xs">Trial</Badge>;
    case 'past_due':
      return <Badge variant="outline" className="border-yellow-500 bg-yellow-50 text-yellow-700 text-xs">Inadimplente</Badge>;
    case 'canceled':
      return <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Cancelado</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
