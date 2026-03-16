import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Share2, Droplets, BarChart3, Link2, Copy, Check, Workflow } from 'lucide-react';
import { ConversionFunnel } from '@/components/franchise/ConversionFunnel';
import { SLAIndicator } from '@/components/franchise/SLAIndicator';
import { MonthlyGoals } from '@/components/franchise/MonthlyGoals';
import { LeadFollowups } from '@/components/franchise/LeadFollowups';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLeadCard } from '@/components/admin/MobileLeadCard';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { FranchiseReports } from '@/components/franchise/FranchiseReports';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { KPISkeleton } from '@/components/ui/kpi-skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PanelHeader } from '@/components/PanelHeader';
import { classifyLead } from '@/lib/leadScoring';
import { KanbanBoard } from '@/components/franchise/KanbanBoard';

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
    <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 card-glow-blue">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl icon-bg-blue flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground mb-0.5 uppercase tracking-wider">Seu link de divulgação</p>
          <p className="text-sm text-primary font-mono truncate">{url}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2 rounded-xl border-primary/30 hover:bg-primary/10 shrink-0">
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
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'leads' | 'funnel' | 'reports'>('leads');

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

  // ── All leads for KPIs (lightweight: no respostas_questionario) ──
  const { data: allLeads = [], isLoading: loadingKpis } = useQuery({
    queryKey: ['franchise-leads-all', franchiseId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: (LeadRow & { respostas_questionario?: Record<string, string> | null })[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('leads')
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used')
          .eq('franquia_id', franchiseId!)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat((data || []) as any[]);
        hasMore = (data?.length || 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
    enabled: !!franchiseId,
  });

  // ── Lead activities for SLA ──
  const { data: leadActivities = [] } = useQuery({
    queryKey: ['franchise-lead-activities', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_activities')
        .select('lead_id, activity_type, created_at, content')
        .eq('activity_type', 'status_change')
        .order('created_at', { ascending: true });
      return (data || []) as { lead_id: string; activity_type: string; created_at: string; content: string | null }[];
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
        .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, respostas_questionario', { count: 'exact' })
        .eq('franquia_id', franchiseId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { leads: (data || []) as (LeadRow & { respostas_questionario?: Record<string, string> | null })[], total: count || 0 };
    },
    enabled: !!franchiseId,
  });

  // Sort leads by temperature priority
  const sortedLeads = useMemo(() => {
    const leads = paginatedData?.leads || [];
    return [...leads].sort((a, b) => {
      const scoreA = classifyLead(a.respostas_questionario || null, a.pontuacao_quintal);
      const scoreB = classifyLead(b.respostas_questionario || null, b.pontuacao_quintal);
      return scoreA.sortOrder - scoreB.sortOrder;
    });
  }, [paginatedData?.leads]);

  const totalCount = paginatedData?.total || 0;
  const franchiseSlug = franchiseInfo?.slug_url || null;
  const franchiseName = franchiseInfo?.nome_franquia || '';

  const totalLeads = allLeads.length;
  const newLeads = allLeads.filter(l => l.status_lead === 'novo').length;
  const inNegotiation = allLeads.filter(l => l.status_lead === 'em_negociacao').length;
  const sold = allLeads.filter(l => l.status_lead === 'vendido').length;

  const now = new Date();
  const soldThisMonth = allLeads.filter(l => {
    if (l.status_lead !== 'vendido') return false;
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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
      {franchiseSlug && <FranchiseLinkBanner slug={franchiseSlug} />}

      {/* KPI Cards */}
      {loadingKpis ? (
        <div className="mb-8"><KPISkeleton count={4} /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {kpis.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}>
              <Card className="card-premium group overflow-hidden">
                <CardContent className="p-3.5 sm:p-5">
                  <div className={`w-10 h-10 rounded-xl ${kpi.color === 'text-primary' ? 'icon-bg-blue' : kpi.color === 'text-secondary' ? 'icon-bg-pink' : kpi.color === 'text-violet-600' ? 'icon-bg-violet' : 'icon-bg-green'} flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* SLA + Goals row */}
      {!loadingKpis && franchiseId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SLAIndicator leads={allLeads} activities={leadActivities} />
          <MonthlyGoals franchiseId={franchiseId} soldThisMonth={soldThisMonth} />
          <LeadFollowups franchiseId={franchiseId} />
        </div>
      )}

      {/* Conversion Funnel */}
      {!loadingKpis && allLeads.length > 0 && <ConversionFunnel leads={allLeads} />}

      {/* Tab switcher - mobile: horizontal scroll, desktop: flex */}
      <div className="flex gap-1 mb-6 bg-muted/60 backdrop-blur-sm rounded-2xl p-1.5 w-full sm:w-fit overflow-x-auto scrollbar-none border border-border/30 -mx-1 px-1 sm:mx-0" role="tablist">
        {[
          { key: 'leads' as const, icon: Users, label: 'Leads' },
          { key: 'funnel' as const, icon: Workflow, label: 'Funil' },
          { key: 'reports' as const, icon: BarChart3, label: 'Relatórios' },
        ].map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 sm:flex-none whitespace-nowrap min-h-[44px] flex items-center justify-center gap-1.5 ${activeTab === tab.key ? 'tab-active' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? 'text-primary' : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'leads' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Leads Recentes ({totalCount})</CardTitle>
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
                {isMobile ? (
                  <div className="space-y-3">
                    {sortedLeads.map((lead, i) => {
                      const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
                      return (
                        <div key={lead.id} className="relative">
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                              {temp.emoji} {temp.label}
                            </Badge>
                          </div>
                          <MobileLeadCard lead={lead} index={i} basePath={leadDetailPath} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="table">
                    <thead>
                      <tr className="border-b border-border/50" role="row">
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Temp.</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                        <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLeads.map(lead => {
                        const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
                        return (
                          <tr key={lead.id} className="border-b border-border/20 hover:bg-muted/40 transition-all cursor-pointer group" role="row" onClick={() => navigate(`${leadDetailPath}/${lead.id}`)}>
                            <td role="cell" className="py-3.5 px-3 font-medium">{lead.nome || '—'}</td>
                            <td role="cell" className="py-3.5 px-3">
                              <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                                {temp.emoji} {temp.label}
                              </Badge>
                            </td>
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}

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

      {activeTab === 'funnel' && (
        <KanbanBoard
          leads={allLeads as (LeadRow & { respostas_questionario?: Record<string, string> | null })[]}
          franchiseId={franchiseId!}
          basePath={leadDetailPath}
        />
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
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PanelHeader title={franchiseName || 'Dashboard'}>
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 text-primary font-medium hidden sm:flex">
          {totalLeads} leads
        </Badge>
        <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <Breadcrumbs items={[{ label: 'Franquia' }]} />
        {content}
      </div>
    </div>
    </PageTransition>
  );
}
