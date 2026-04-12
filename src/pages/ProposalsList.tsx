import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { PageTransition } from '@/components/PageTransition';
import { Plus, FileText, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  rascunho: { label: 'Rascunho', classes: 'bg-muted text-muted-foreground' },
  enviada: { label: 'Enviada', classes: 'bg-primary/10 text-primary' },
  em_negociacao: { label: 'Em negociação', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  aceita: { label: 'Aceita', classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  recusada: { label: 'Recusada', classes: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProposalsList() {
  const { franchiseId } = useAuth();
  const navigate = useNavigate();

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals', franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseId,
  });

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30 pb-safe">
        <PageHeader
          title="Propostas Comerciais"
          subtitle="Gerencie suas propostas"
          icon={<FileText className="w-4 h-4 text-primary" />}
          fallbackPath="/painel"
          rightSlot={
            <Button onClick={() => navigate('/propostas/nova')} size="sm" className="h-8 sm:h-9">
              <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Nova Proposta</span><span className="sm:hidden">Nova</span>
            </Button>
          }
        />

        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 pb-20 sm:pb-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : !proposals?.length ? (
            <Card className="shadow-sm border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Nenhuma proposta ainda</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-xs">Crie sua primeira proposta comercial para enviar aos seus clientes</p>
                <Button onClick={() => navigate('/propostas/nova')}>
                  <Plus className="w-4 h-4 mr-1" /> Criar Proposta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proposals.map((p: any) => {
                const status = STATUS_MAP[p.status] || STATUS_MAP.rascunho;
                return (
                  <Card
                    key={p.id}
                    className="shadow-sm hover:shadow-md transition-all cursor-pointer border-border/50 active:scale-[0.98]"
                    onClick={() => navigate(`/propostas/${p.id}`)}
                  >
                    <CardContent className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4 px-4 sm:px-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm text-foreground truncate">{p.client_name}</p>
                          <Badge variant="outline" className={cn('text-[10px] shrink-0 border-0', status.classes)}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(p.created_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                          <span className="font-semibold text-foreground">{formatCurrency(p.total)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
