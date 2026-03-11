import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Share2, Droplets, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';
import { FranchiseContactSettings } from '@/components/franchise/FranchiseContactSettings';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { FranchiseReports } from '@/components/franchise/FranchiseReports';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { KPISkeleton } from '@/components/ui/kpi-skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import logoSplash from '@/assets/logo-splash.png';

const PAGE_SIZE = 20;

export default function FranchiseDashboard() {
  const { franchiseId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'leads' | 'reports'>('leads');

  // ── Franchise info ──
  const { data: franchiseInfo } = useQuery({
    queryKey: ['franchise-info', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchises')
        .select('slug_url, nome_franquia')
        .eq('id', franchiseId!)
        .maybeSingle();
      return data;
    },
    enabled: !!franchiseId,
  });

  // ── All leads for KPIs ──
  const { data: allLeads = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['franchise-leads-all', franchiseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by')
        .eq('franquia_id', franchiseId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LeadRow[];
    },
    enabled: !!franchiseId,
  });

  // ── Paginated leads for table ──
  const { data: paginatedData, isLoading: loadingTable } = useQuery({
    queryKey: ['franchise-leads-table', franchiseId, page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await supabase
        .from('leads')
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by', { count: 'exact' })
        .eq('franquia_id', franchiseId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { leads: (data || []) as LeadRow[], total: count || 0 };
    },
    enabled: !!franchiseId,
  });

  const leads = paginatedData?.leads || [];
  const totalCount = paginatedData?.total || 0;
  const franchiseSlug = franchiseInfo?.slug_url || null;
  const franchiseName = franchiseInfo?.nome_franquia || '';

  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(l => l.status_lead === 'novo').length;
  const inNegotiation = allLeads.filter(l => l.status_lead === 'em_negociacao').length;
  const sold = allLeads.filter(l => l.status_lead === 'vendido').length;

  const kpis = [
    { icon: Users, label: 'Total de Leads', value: totalLeads, color: 'text-primary' },
    { icon: Clock, label: 'Novos', value: newLeads, color: 'text-secondary' },
    { icon: TrendingUp, label: 'Em Negociação', value: inNegotiation, color: 'text-violet-600' },
    { icon: Droplets, label: 'Vendidos', value: sold, color: 'text-emerald-600' },
  ];

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isLoading = authLoading || loadingTable;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSplash} alt="Splash" className="w-16" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {franchiseName || 'Dashboard da Franquia'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Gestão de leads e contatos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs px-3 py-1.5 border-primary/30 text-primary">
              {totalLeads} leads
            </Badge>
            <UserAvatarMenu />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {franchiseId && (
          <div className="mb-8">
            <FranchiseContactSettings franchiseId={franchiseId} />
          </div>
        )}

        {/* KPI Cards */}
        {loadingKpis ? (
          <div className="mb-8"><KPISkeleton count={4} /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                    <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 w-fit" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'leads'}
            onClick={() => setActiveTab('leads')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'leads' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" /> Leads
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" /> Relatórios
          </button>
        </div>

        {activeTab === 'leads' && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Leads Recentes ({totalCount})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : totalCount === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center py-16 px-4"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Inbox className="w-10 h-10 text-primary/60" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lead ainda</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                    Seus leads aparecerão aqui assim que os primeiros clientes responderem ao quiz da sua página. Compartilhe seu link para começar!
                  </p>
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => {
                    const url = franchiseSlug ? `${SITE_URL}/${franchiseSlug}` : SITE_URL;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copiado!');
                  }}>
                    <Share2 className="w-4 h-4" />
                    Copiar link do quiz
                  </Button>
                </motion.div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-border/50" role="row">
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                          <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map(lead => (
                          <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors" role="row">
                            <td role="cell" className="py-3.5 px-3 font-medium">{lead.nome || '—'}</td>
                            <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.cidade || '—'}</td>
                            <td role="cell" className="py-3.5 px-3">
                              <span className="font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
                            </td>
                            <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.modelo_recomendado || '—'}</td>
                            <td role="cell" className="py-3.5 px-3">
                              <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-xs font-medium`} variant="secondary">
                                {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                              </Badge>
                            </td>
                            <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td role="cell" className="py-3.5 px-3">
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/painel/lead/${lead.id}`)} className="rounded-lg" aria-label="Ver detalhes do lead">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalCount > PAGE_SIZE && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {from + 1}–{Math.min(to, totalCount)} de {totalCount} leads
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl">
                          Anterior
                        </Button>
                        <span className="flex items-center text-sm text-muted-foreground px-2">
                          {page} / {totalPages}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="rounded-xl">
                          Próximo
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'reports' && (
          <FranchiseReports leads={allLeads} />
        )}
      </div>
    </div>
  );
}
