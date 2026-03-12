import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Share2, Droplets, BarChart3, Link2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';

import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { FranchiseReports } from '@/components/franchise/FranchiseReports';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { KPISkeleton } from '@/components/ui/kpi-skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import logoSplash from '@/assets/logo-splash.png';

const PAGE_SIZE = 20;

function FranchiseLinkBanner({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Link2 className="w-5 h-5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground mb-0.5">Seu link de divulgação</p>
          <p className="text-sm text-primary font-mono truncate">{url}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2 rounded-lg border-primary/30 hover:bg-primary/10 shrink-0">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copiado!' : 'Copiar link'}
      </Button>
    </div>
  );
}

interface FranchiseDashboardProps {
  overrideFranchiseId?: string;
  embedded?: boolean;
}

export default function FranchiseDashboard({ overrideFranchiseId, embedded }: FranchiseDashboardProps = {}) {
  const { franchiseId: authFranchiseId, loading: authLoading } = useAuth();
  const franchiseId = overrideFranchiseId || authFranchiseId;
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
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used')
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

  const leadDetailPath = embedded ? '/admin/lead' : '/painel/lead';

  const content = (
    <>
      {/* Franchise Link Banner */}
      {franchiseSlug && <FranchiseLinkBanner slug={franchiseSlug} />}

      {/* KPI Cards */}
      {loadingKpis ? (
        <div className="mb-8"><KPISkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 md:p-5">
                  <kpi.icon className={`w-4 h-4 md:w-5 md:h-5 ${kpi.color} mb-1.5 md:mb-2`} />
                  <p className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 w-full sm:w-fit overflow-x-auto scrollbar-none" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'leads'}
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'leads' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" /> Leads
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'reports'}
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${activeTab === 'reports' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" /> Relatórios
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
                {franchiseSlug && (
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => {
                    navigator.clipboard.writeText(`${SITE_URL}/${franchiseSlug}`);
                    toast.success('Link copiado!');
                  }}>
                    <Share2 className="w-4 h-4" />
                    Copiar link do quiz
                  </Button>
                )}
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
                            <Button size="sm" variant="ghost" onClick={() => navigate(`${leadDetailPath}/${lead.id}`)} className="rounded-lg" aria-label="Ver detalhes do lead">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                 {totalCount > PAGE_SIZE && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border/30">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {from + 1}–{Math.min(to, totalCount)} de {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl h-8 text-xs">
                        Anterior
                      </Button>
                      <span className="flex items-center text-xs text-muted-foreground px-2">
                        {page}/{totalPages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="rounded-xl h-8 text-xs">
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
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoSplash} alt="Splash" className="h-7 md:h-9 shrink-0" />
            <div className="h-5 w-px bg-border/60 hidden sm:block" />
            <span className="text-sm font-semibold text-foreground tracking-tight truncate hidden sm:block">{franchiseName || 'Dashboard'}</span>
          </div>

          <nav className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 text-primary font-medium hidden sm:flex">
              {totalLeads} leads
            </Badge>
            <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />
            <UserAvatarMenu />
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {content}
      </div>
    </div>
  );
}
