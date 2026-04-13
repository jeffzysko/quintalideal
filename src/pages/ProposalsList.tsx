import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PanelHeader } from '@/components/PanelHeader';
import { PageTransition } from '@/components/PageTransition';
import { BackButton } from '@/components/BackButton';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Plus, FileText, Clock, ChevronRight, Link2, Pencil, Search, DollarSign, Eye, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  rascunho: { label: 'Rascunho', classes: 'bg-muted text-muted-foreground' },
  enviada: { label: 'Enviada', classes: 'bg-primary/10 text-primary' },
  visualizada: { label: 'Visualizada', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  em_negociacao: { label: 'Em negociação', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  aceita: { label: 'Aceita', classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  recusada: { label: 'Recusada', classes: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

const STATUS_TABS = [
  { key: 'todas', label: 'Todas' },
  { key: 'rascunho', label: 'Rascunho' },
  { key: 'enviada', label: 'Enviada' },
  { key: 'visualizada', label: 'Visualizada' },
  { key: 'em_negociacao', label: 'Negociação' },
  { key: 'aceita', label: 'Aceita' },
  { key: 'recusada', label: 'Recusada' },
];

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProposalsList() {
  const { franchiseId, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const basePath = isAdmin ? '/admin' : '/franquia';
  const canQuery = !!franchiseId || isAdmin;

  const [statusFilter, setStatusFilter] = useState('todas');
  const [search, setSearch] = useState('');

  const proposalsQueryKey = ['proposals', franchiseId, isAdmin];

  const { data: proposals, isLoading } = useQuery({
    queryKey: proposalsQueryKey,
    queryFn: async () => {
      let query = supabase
        .from('proposals')
        .select('id, client_name, status, total, created_at, public_token, updated_at')
        .order('created_at', { ascending: false });
      // RLS handles filtering — admins see all, franchise users see own
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: canQuery,
  });

  // Realtime subscription to auto-refresh list
  useEffect(() => {
    const channel = supabase
      .channel('proposals-list-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined },
        () => {
          queryClient.invalidateQueries({ queryKey: proposalsQueryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, franchiseId]);

  // Filtered proposals
  const filtered = useMemo(() => {
    if (!proposals) return [];
    let list = proposals;
    if (statusFilter !== 'todas') {
      list = list.filter((p: any) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p: any) => p.client_name?.toLowerCase().includes(q));
    }
    return list;
  }, [proposals, statusFilter, search]);

  // Stats
  const stats = useMemo(() => {
    if (!proposals?.length) return null;
    const total = proposals.length;
    const totalValue = proposals.reduce((acc: number, p: any) => acc + (p.total || 0), 0);
    const aceitas = proposals.filter((p: any) => p.status === 'aceita').length;
    const visualizadas = proposals.filter((p: any) => p.status === 'visualizada').length;
    const recusadas = proposals.filter((p: any) => p.status === 'recusada').length;
    const taxaAceite = total > 0 ? Math.round((aceitas / total) * 100) : 0;
    return { total, totalValue, aceitas, visualizadas, recusadas, taxaAceite };
  }, [proposals]);

  const copyLink = (e: React.MouseEvent, publicToken: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/proposta/${publicToken}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copiado!');
    });
  };

  const editProposal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/propostas/nova?edit=${id}`);
  };

  // Count by status for tab badges
  const countByStatus = useMemo(() => {
    if (!proposals) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const p of proposals as any[]) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [proposals]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-bottomnav sm:pb-0">
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

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg icon-bg-blue flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Total</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg icon-bg-green flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Valor total</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg icon-bg-green flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Taxa aceite</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.taxaAceite}%</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg icon-bg-blue flex items-center justify-center">
                      <Eye className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Visualizadas</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stats.visualizadas}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search + Status filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {STATUS_TABS.map((tab) => {
              const count = tab.key === 'todas' ? proposals?.length || 0 : countByStatus[tab.key] || 0;
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border min-h-[36px] active:scale-[0.97]',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center',
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Proposals list */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[72px] skeleton rounded-xl" />
              ))
            ) : !filtered.length ? (
              <Card className="shadow-sm border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {search || statusFilter !== 'todas' ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta ainda'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                    {search || statusFilter !== 'todas'
                      ? 'Tente alterar os filtros ou o termo de busca'
                      : 'Crie sua primeira proposta comercial para enviar aos seus clientes'}
                  </p>
                  {!search && statusFilter === 'todas' && (
                    <Button onClick={() => navigate('/propostas/nova')}>
                      <Plus className="w-4 h-4 mr-1" /> Criar Proposta
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filtered.map((p: any) => {
                const status = STATUS_MAP[p.status] || STATUS_MAP.rascunho;
                const canCopyLink = p.status !== 'rascunho';
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
                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {canCopyLink && (
                          <button
                            onClick={(e) => copyLink(e, p.public_token)}
                            className="p-2.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors active:scale-[0.95] min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Copiar link público"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => editProposal(e, p.id)}
                          className="p-2.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors active:scale-[0.95] min-w-[40px] min-h-[40px] flex items-center justify-center"
                          title="Editar proposta"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-0.5" />
                      </div>
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
