import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle2, XCircle, RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  franchiseId: string;
}

interface WebhookLog {
  id: string;
  event_type: string;
  url: string;
  http_status: number | null;
  success: boolean;
  attempt: number;
  error_message: string | null;
  response_body: string | null;
  created_at: string;
}

export function WebhookLogs({ franchiseId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['webhook-logs', franchiseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as WebhookLog[];
    },
    enabled: !!franchiseId,
    staleTime: 30_000,
  });

  const displayLogs = showAll ? logs : logs?.slice(0, 10);

  if (isLoading) {
    return (
      <Card className="card-premium">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              Histórico de Entregas
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Últimas {showAll ? '50' : '10'} tentativas de envio de webhook
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Os logs aparecerão aqui após o primeiro envio de webhook.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[420px]">
              <div className="space-y-2">
                {displayLogs?.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={log.success ? 'default' : 'destructive'}
                            className="text-xs px-1.5 py-0 h-5"
                          >
                            {log.success ? 'Sucesso' : 'Falha'}
                          </Badge>
                          {log.http_status && (
                            <span className="text-xs font-mono text-muted-foreground">
                              HTTP {log.http_status}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                            {log.event_type === 'teste_webhook' ? 'Teste' : 'Lead'}
                          </Badge>
                          {log.attempt > 1 && (
                            <span className="text-xs text-amber-600 font-medium">
                              tentativa {log.attempt}/3
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {expanded === log.id ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {expanded === log.id && (
                      <div className="px-4 pb-3 border-t border-border/30 pt-2 space-y-1.5">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">URL:</span>
                            <p className="font-mono text-xs truncate text-foreground">{log.url}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data/hora:</span>
                            <p className="text-foreground">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        {log.error_message && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Erro:</span>
                            <p className="text-destructive font-mono text-xs">{log.error_message}</p>
                          </div>
                        )}
                        {log.response_body && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Resposta:</span>
                            <pre className="text-xs font-mono bg-muted/60 rounded-lg p-2 mt-1 overflow-x-auto max-h-24 text-foreground/80">
                              {log.response_body}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {logs.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-3 text-xs gap-1.5"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Ver todos ({logs.length} registros)
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
