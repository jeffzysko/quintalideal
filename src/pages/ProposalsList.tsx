import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  rascunho: { label: 'Rascunho', classes: 'bg-muted text-muted-foreground' },
  enviada: { label: 'Enviada', classes: 'bg-primary/10 text-primary' },
  em_negociacao: { label: 'Em negociação', classes: 'bg-amber-50 text-amber-700' },
  aceita: { label: 'Aceita', classes: 'bg-emerald-50 text-emerald-700' },
  recusada: { label: 'Recusada', classes: 'bg-red-50 text-red-700' },
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
    <div className="min-h-screen bg-muted/30 pb-safe">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20 sm:pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <span className="truncate">Propostas Comerciais</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gerencie suas propostas</p>
          </div>
          <Button onClick={() => navigate('/propostas/nova')} size="sm" className="bg-primary hover:bg-primary/90 shrink-0 h-9">
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !proposals?.length ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Nenhuma proposta ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">Crie sua primeira proposta comercial</p>
              <Button onClick={() => navigate('/propostas/nova')} className="bg-primary hover:bg-primary/90">
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
                  className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/propostas/${p.id}`)}
                >
                  <CardContent className="flex items-center gap-4 py-4 px-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground truncate">{p.client_name}</p>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', status.classes)}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(p.created_at), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                        <span className="font-medium text-foreground">{formatCurrency(p.total)}</span>
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
  );
}
