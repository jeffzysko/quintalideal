import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { toast } from 'sonner';
import { Clock, PlayCircle, CheckCircle2, XCircle, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CronJob = {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_started: string | null;
  last_run_status: string | null;
  last_run_duration: string | null;
};

type RunDetail = {
  runid: number;
  start_time: string;
  end_time: string | null;
  status: string;
  return_message: string | null;
};

// Mapping job name -> edge function endpoint that can be triggered manually
const JOB_TO_FUNCTION: Record<string, string | null> = {
  'check-proposal-expiration': 'check-proposal-expiration',
  'check-proposal-expiration-hourly': 'check-proposal-expiration',
  'followup-reminders-daily': 'followup-reminders',
  'send-monthly-franchise-report': 'send-monthly-report',
  'weekly-cleanup-logs': null,
  'cleanup-old-analytics': 'cleanup-analytics',
};

const JOB_LABELS: Record<string, string> = {
  'check-proposal-expiration': 'Verificar expiracao de propostas',
  'check-proposal-expiration-hourly': 'Verificar propostas (horario)',
  'followup-reminders-daily': 'Lembretes de follow-up',
  'send-monthly-franchise-report': 'Relatorio mensal das franquias',
  'weekly-cleanup-logs': 'Limpeza semanal de logs',
  'cleanup-old-analytics': 'Limpeza de analytics antigos',
};

function formatSchedule(cron: string): string {
  // Friendly hints for the most common schedules
  const map: Record<string, string> = {
    '0 10 * * *': 'Diariamente as 10h UTC',
    '0 11 * * *': 'Diariamente as 11h UTC',
    '0 6,18 * * *': 'Diariamente as 6h e 18h UTC',
    '0 * * * *': 'A cada hora',
    '0 9 1 * *': 'Dia 1 de cada mes as 9h UTC',
    '0 10 1 * *': 'Dia 1 de cada mes as 10h UTC',
    '0 3 1 * *': 'Dia 1 de cada mes as 3h UTC',
    '0 3 * * 0': 'Domingos as 3h UTC',
  };
  return map[cron] || cron;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">Sem execucoes</Badge>;
  if (status === 'succeeded')
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Sucesso
      </Badge>
    );
  if (status === 'failed')
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        <XCircle className="w-3 h-3 mr-1" /> Falha
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

function JobHistory({ jobname }: { jobname: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cron-history', jobname],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_cron_job_history', {
        _jobname: jobname,
        _limit: 5,
      });
      if (error) throw error;
      return data as RunDetail[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!data?.length) {
    return <p className="text-sm text-muted-foreground py-2">Nenhuma execucao registrada.</p>;
  }

  return (
    <div className="space-y-2 mt-3">
      {data.map((run) => (
        <div
          key={run.runid}
          className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40 text-sm"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={run.status} />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(run.start_time), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
            {run.return_message && (
              <p className="text-xs text-muted-foreground truncate" title={run.return_message}>
                {run.return_message}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function JobRow({ job }: { job: CronJob }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const fnName = JOB_TO_FUNCTION[job.jobname];

  const runNow = useMutation({
    mutationFn: async () => {
      if (!fnName) throw new Error('Esta tarefa nao pode ser executada manualmente.');
      const { error } = await supabase.functions.invoke(fnName, { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tarefa disparada com sucesso.');
      // Refresh history after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['cron-history', job.jobname] });
        queryClient.invalidateQueries({ queryKey: ['admin-cron-jobs'] });
      }, 1500);
    },
    onError: (err: Error) => toast.error(err.message || 'Falha ao executar tarefa.'),
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border/60 rounded-xl p-4 bg-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{JOB_LABELS[job.jobname] || job.jobname}</h4>
              {!job.active && (
                <Badge variant="outline" className="text-muted-foreground">
                  Inativo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatSchedule(job.schedule)}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={job.last_run_status} />
              {job.last_run_started && (
                <span className="text-xs text-muted-foreground">
                  Ultima:{' '}
                  {formatDistanceToNow(new Date(job.last_run_started), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending || !fnName}
              title={!fnName ? 'Tarefa interna do banco' : undefined}
            >
              {runNow.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlayCircle className="w-3.5 h-3.5" />
              )}
              Executar agora
            </Button>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="ghost">
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`}
                />
                Historico
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>{open && <JobHistory jobname={job.jobname} />}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function AdminCronJobs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-cron-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_cron_jobs');
      if (error) throw error;
      return data as CronJob[];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Tarefas Agendadas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Monitore e dispare manualmente as automacoes do sistema (cron jobs).
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive p-4 rounded-lg bg-destructive/10">
            <AlertCircle className="w-4 h-4" />
            Erro ao carregar tarefas agendadas.
          </div>
        )}
        {data && (
          <div className="space-y-3">
            {data.map((job) => (
              <JobRow key={job.jobid} job={job} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
