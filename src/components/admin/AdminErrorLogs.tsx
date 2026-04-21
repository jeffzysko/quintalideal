import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AlertTriangle, Bug, Flame, Clock, Trash2, RefreshCw, Monitor, Server } from 'lucide-react';
import { toast } from 'sonner';

type ErrorLog = {
  id: string;
  source: string;
  severity: string;
  function_name: string | null;
  message: string;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  franchise_id: string | null;
  user_id: string | null;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

type FilterType = 'all' | 'critical' | 'error' | 'warning' | 'frontend' | 'edge_function';

export function AdminErrorLogs({ franchiseMap }: { franchiseMap: Record<string, string> }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: errors = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ErrorLog[];
    },
    refetchInterval: 60000,
  });

  const now24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last24h = errors.filter(e => e.created_at >= now24h);
  const criticalCount = last24h.filter(e => e.severity === 'critical').length;
  const errorCount = last24h.filter(e => e.severity === 'error').length;
  const warningCount = last24h.filter(e => e.severity === 'warning').length;
  const lastCritical = errors.find(e => e.severity === 'critical');

  const filtered = errors.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'critical') return e.severity === 'critical';
    if (filter === 'error') return e.severity === 'error';
    if (filter === 'warning') return e.severity === 'warning';
    if (filter === 'frontend') return e.source === 'frontend';
    if (filter === 'edge_function') return e.source === 'edge_function';
    return true;
  });

  const handleCleanup = async () => {
    setDeleting(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data, error } = await supabase
        .from('error_logs')
        .delete()
        .lt('created_at', cutoff.toISOString())
        .select('id');
      if (error) throw error;
      const count = data?.length || 0;
      toast.success(`${count} registro(s) antigo(s) removido(s).`);
      queryClient.invalidateQueries({ queryKey: ['admin-error-logs'] });
    } catch {
      toast.error('Erro ao limpar registros.');
    } finally {
      setDeleting(false);
    }
  };

  const severityBadge = (s: string) => {
    if (s === 'critical') return <Badge variant="destructive" className="text-xs px-1.5"><Flame className="w-3 h-3 mr-0.5" />Critical</Badge>;
    if (s === 'error') return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-xs px-1.5"><Bug className="w-3 h-3 mr-0.5" />Error</Badge>;
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs px-1.5"><AlertTriangle className="w-3 h-3 mr-0.5" />Warning</Badge>;
  };

  const sourceBadge = (s: string) => {
    if (s === 'frontend') return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 text-xs px-1.5"><Monitor className="w-3 h-3 mr-0.5" />Frontend</Badge>;
    return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-xs px-1.5"><Server className="w-3 h-3 mr-0.5" />Edge Fn</Badge>;
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'critical', label: 'Critical' },
    { key: 'error', label: 'Erros' },
    { key: 'warning', label: 'Warnings' },
    { key: 'frontend', label: 'Frontend' },
    { key: 'edge_function', label: 'Edge Functions' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={`border ${criticalCount > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-border/50'}`}>
          <CardContent className="p-3 text-center">
            <Flame className={`w-5 h-5 mx-auto mb-1 ${criticalCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <p className="text-2xl font-bold">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticos (24h)</p>
          </CardContent>
        </Card>
        <Card className={`border ${errorCount > 0 ? 'border-orange-500/50 bg-orange-500/5' : 'border-border/50'}`}>
          <CardContent className="p-3 text-center">
            <Bug className={`w-5 h-5 mx-auto mb-1 ${errorCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <p className="text-2xl font-bold">{errorCount}</p>
            <p className="text-xs text-muted-foreground">Erros (24h)</p>
          </CardContent>
        </Card>
        <Card className={`border ${warningCount > 0 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border/50'}`}>
          <CardContent className="p-3 text-center">
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${warningCount > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <p className="text-2xl font-bold">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Warnings (24h)</p>
          </CardContent>
        </Card>
        <Card className="border border-border/50">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-semibold">{lastCritical ? timeAgo(lastCritical.created_at) : '—'}</p>
            <p className="text-xs text-muted-foreground">Último crítico</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {dataUpdatedAt ? `Atualizado ${timeAgo(new Date(dataUpdatedAt).toISOString())}` : ''}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-error-logs'] })}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" disabled={deleting}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />Limpar antigos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar erros antigos?</AlertDialogTitle>
                <AlertDialogDescription>Apagar todos os erros com mais de 30 dias? Esta ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCleanup}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">Nenhum erro encontrado 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2 font-medium">Quando</th>
                    <th className="text-left p-2 font-medium">Severity</th>
                    <th className="text-left p-2 font-medium">Origem</th>
                    <th className="text-left p-2 font-medium">Função</th>
                    <th className="text-left p-2 font-medium">Mensagem</th>
                    <th className="text-left p-2 font-medium">Franquia</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr
                      key={e.id}
                      className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setSelectedError(e)}
                    >
                      <td className="p-2 whitespace-nowrap text-muted-foreground">{timeAgo(e.created_at)}</td>
                      <td className="p-2">{severityBadge(e.severity)}</td>
                      <td className="p-2">{sourceBadge(e.source)}</td>
                      <td className="p-2 font-mono text-xs">{e.function_name || '—'}</td>
                      <td className="p-2 max-w-[200px] truncate">{e.message}</td>
                      <td className="p-2 text-muted-foreground">{e.franchise_id ? (franchiseMap[e.franchise_id] || e.franchise_id.slice(0, 8)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedError && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {severityBadge(selectedError.severity)}
                  {sourceBadge(selectedError.source)}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Data</p>
                  <p>{new Date(selectedError.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Função/Componente</p>
                  <p className="font-mono text-xs">{selectedError.function_name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Mensagem</p>
                  <p className="break-words">{selectedError.message}</p>
                </div>
                {selectedError.franchise_id && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Franquia</p>
                    <p>{franchiseMap[selectedError.franchise_id] || selectedError.franchise_id}</p>
                  </div>
                )}
                {selectedError.stack && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Stack Trace</p>
                    <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-60">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}
                {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Metadata</p>
                    <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-60">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
