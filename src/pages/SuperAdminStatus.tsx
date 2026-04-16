import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/PageHeader';
import { PageTransition } from '@/components/PageTransition';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, CreditCard, MessageCircle, Mail, Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemStatus {
  stripe: {
    mode: 'live' | 'test' | 'unknown';
    configured: boolean;
    webhook_configured: boolean;
  };
  zapi: {
    partner_token_configured: boolean;
    active_instances: number;
    franchises_with_plan: number;
    status: 'operational' | 'degraded' | 'no_instances' | 'unknown';
  };
  email: { resend_configured: boolean };
  edge_functions: Array<{ name: string; last_run: string | null; status: 'ok' | 'error' | 'no_runs' }>;
  cron_jobs: Array<{
    jobname: string;
    schedule: string;
    active: boolean;
    last_run_started: string | null;
    last_run_status: string | null;
  }>;
}

const MANUAL_CHECKLIST_KEY = 'go-live-manual-checklist';

const MANUAL_ITEMS = [
  { id: 'webhook_url', label: 'Webhook do Stripe configurado para URL de produção' },
  { id: 'custom_domain', label: 'Domínio customizado configurado no Lovable' },
];

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-5 w-5 text-success" />
  ) : (
    <XCircle className="h-5 w-5 text-destructive" />
  );
}

function StatusBadge({ variant, label }: { variant: 'success' | 'warn' | 'error'; label: string }) {
  const cls = {
    success: 'bg-success/15 text-success',
    warn: 'bg-warning/15 text-warning',
    error: 'bg-destructive/15 text-destructive',
  }[variant];
  return <Badge className={cn('border-0', cls)}>{label}</Badge>;
}

export default function SuperAdminStatus() {
  const { data: status, isLoading } = useQuery<SystemStatus>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('system-status');
      if (error) throw error;
      return data as SystemStatus;
    },
    refetchInterval: 60_000,
  });

  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_CHECKLIST_KEY);
      if (raw) setManualChecks(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const toggleManual = (id: string) => {
    setManualChecks((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(MANUAL_CHECKLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  if (isLoading || !status) {
    return (
      <div>
        <PageHeader title="Status do Sistema" subtitle="Carregando..." fallbackPath="/superadmin/receita" />
        <div className="container max-w-6xl mx-auto py-8 px-4 text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const stripeOk = status.stripe.mode === 'live' && status.stripe.configured;
  const zapiOk = status.zapi.status === 'operational';
  const emailOk = status.email.resend_configured;
  const cronsActive = status.cron_jobs.filter((c) => c.active);
  const cronsOk = cronsActive.length >= 2;

  // Auto checklist items
  const autoItems = [
    { id: 'stripe_live', label: 'Stripe em modo live', ok: stripeOk },
    { id: 'stripe_webhook_secret', label: 'Stripe webhook secret configurado', ok: status.stripe.webhook_configured },
    { id: 'zapi_partner', label: 'Z-API Partner Token configurado', ok: status.zapi.partner_token_configured },
    { id: 'resend', label: 'RESEND_API_KEY configurada', ok: emailOk },
    { id: 'crons', label: 'Cron jobs ativos (mínimo 2)', ok: cronsOk },
  ];

  return (
    <PageTransition>
    <div>
      <PageHeader title="Status do Sistema" subtitle="Monitoramento das integrações críticas" fallbackPath="/superadmin/receita" />
      <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">

      {/* Cards de integração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stripe */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Stripe
            </CardTitle>
            {status.stripe.mode === 'live' ? (
              <StatusBadge variant="success" label="Produção" />
            ) : status.stripe.mode === 'test' ? (
              <StatusBadge variant="warn" label="Modo teste" />
            ) : (
              <StatusBadge variant="error" label="Não configurado" />
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>Webhook: {status.stripe.webhook_configured ? 'configurado' : 'pendente'}</div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Stripe Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>

        {/* Z-API */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Z-API
            </CardTitle>
            {zapiOk ? (
              <StatusBadge variant="success" label="Operacional" />
            ) : status.zapi.status === 'degraded' ? (
              <StatusBadge variant="warn" label="Degradado" />
            ) : status.zapi.status === 'no_instances' ? (
              <StatusBadge variant="warn" label="Sem instâncias" />
            ) : (
              <StatusBadge variant="error" label="Desconhecido" />
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>
              Instâncias ativas: <strong className="text-foreground">{status.zapi.active_instances}</strong> de{' '}
              <strong className="text-foreground">{status.zapi.franchises_with_plan}</strong> com plano
            </div>
            <div>Partner Token: {status.zapi.partner_token_configured ? 'configurado' : 'pendente'}</div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-5 w-5" /> E-mail (Resend)
            </CardTitle>
            {emailOk ? (
              <StatusBadge variant="success" label="Operacional" />
            ) : (
              <StatusBadge variant="error" label="Não configurado" />
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            RESEND_API_KEY: {emailOk ? 'configurada' : 'ausente'}
          </CardContent>
        </Card>

        {/* Cron / Edge functions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5" /> Tarefas agendadas
            </CardTitle>
            {cronsOk ? (
              <StatusBadge variant="success" label={`${cronsActive.length} ativas`} />
            ) : (
              <StatusBadge variant="warn" label={`${cronsActive.length} ativas`} />
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {status.cron_jobs.length === 0 && <div>Nenhum cron job encontrado</div>}
            {status.cron_jobs.slice(0, 4).map((c) => (
              <div key={c.jobname} className="flex items-center justify-between gap-2">
                <span className="truncate">{c.jobname}</span>
                <span className="text-xs">
                  {c.last_run_status ?? 'sem execução'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Edge functions críticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5" /> Edge Functions críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {status.edge_functions.map((f) => (
              <div key={f.name} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                <span className="font-mono text-xs">{f.name}</span>
                <div className="flex items-center gap-2">
                  {f.last_run && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.last_run).toLocaleString('pt-BR')}
                    </span>
                  )}
                  {f.status === 'ok' && <StatusBadge variant="success" label="OK" />}
                  {f.status === 'error' && <StatusBadge variant="error" label="Erro" />}
                  {f.status === 'no_runs' && <StatusBadge variant="warn" label="Sem dados" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Go-Live */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Checklist Pronto para Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {autoItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <StatusIcon ok={item.ok} />
              <span className={cn('text-sm', !item.ok && 'text-muted-foreground')}>{item.label}</span>
              <Badge variant="outline" className="ml-auto text-xs">automático</Badge>
            </div>
          ))}
          {MANUAL_ITEMS.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={!!manualChecks[item.id]}
                onCheckedChange={() => toggleManual(item.id)}
              />
              <label htmlFor={item.id} className="text-sm cursor-pointer flex-1">
                {item.label}
              </label>
              <Badge variant="outline" className="ml-auto text-xs">manual</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
    </PageTransition>
  );
}
