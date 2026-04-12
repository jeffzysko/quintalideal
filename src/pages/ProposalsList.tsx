import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PanelHeader } from '@/components/PanelHeader';
import { PageTransition } from '@/components/PageTransition';
import { BackButton } from '@/components/BackButton';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Plus, FileText, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  rascunho: { label: 'Rascunho', classes: 'bg-muted text-muted-foreground' },
  enviada: { label: 'Enviada', classes: 'bg-primary/10 text-primary' },
  visualizada: { label: 'Visualizada', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  em_negociacao: { label: 'Em negociação', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  aceita: { label: 'Aceita', classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  recusada: { label: 'Recusada', classes: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProposalsList() {
  const { franchiseId, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const basePath = isAdmin ? '/admin' : '/franquia';

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
      <div className="min-h-screen bg-background pb-bottomnav sm:pb-0">
        {/* Mobile header — matches PanelHeader pattern used by HojePage */}
        <PanelHeader title="Propostas">
          <BackButton fallback={basePath} />
          <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
          <NotificationBell />
          <UserAvatarMenu />
        </PanelHeader>

        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {/* Desktop breadcrumbs + title */}
          <div className="hidden md:flex items-center justify-between mb-5">
            <div>
              <Breadcrumbs />
              <h1 className="text-page-title text-foreground mt-1">Propostas Comerciais</h1>
              <p className="text-small text-muted-foreground mt-0.5">Gerencie suas propostas</p>
            </div>
            <Button onClick={() => navigate('/propostas/nova')} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Proposta
            </Button>
          </div>

          {/* Mobile title + action */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <h1 className="text-section-title text-foreground">Propostas</h1>
            <Button onClick={() => navigate('/propostas/nova')} size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1" /> Nova
            </Button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[72px] skeleton rounded-xl" />
              ))
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
              proposals.map((p: any) => {
                const status = STATUS_MAP[p.status] || STATUS_MAP.rascunho;
                return (
                  <Card
                    key={p.id}
                    className="shadow-sm hover:shadow-md transition-all cursor-pointer border-border/50 active:scale-[0.98] press-scale"
                    onClick={() => navigate(`/propostas/${p.id}`)}
                  >
                    <CardContent className="flex items-center gap-3 sm:gap-4 py-3.5 sm:py-4 px-4 sm:px-5">
                      <div className="w-10 h-10 rounded-xl icon-bg-blue flex items-center justify-center shrink-0">
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
              })
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
