import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Share2, Droplets, BarChart3, Link2, Copy, Check, Workflow, Target } from 'lucide-react';
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
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PanelHeader } from '@/components/PanelHeader';
import { classifyLead } from '@/lib/leadScoring';
import { KanbanBoard } from '@/components/franchise/KanbanBoard';
import { MetricGrid } from '@/components/dashboard/MetricGrid';
import { TimeRangeSelector, filterByTimeRange, type TimeRange } from '@/components/dashboard/TimeRangeSelector';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import type { MetricCardProps } from '@/components/dashboard/MetricCard';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('30');

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

  // ── All leads ──
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
          .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at, franquia_id, telefone, email, ref_code, referred_by, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, respostas_questionario')
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

  // ── Time-filtered KPIs with comparison ──
  const { current: currentLeads, previous: previousLeads } = useMemo(
    () => filterByTimeRange(allLeads, timeRange),
    [allLeads, timeRange],
  );

  const totalLeads = currentLeads.length;
  const newLeads = currentLeads.filter(l => l.status_lead === 'novo').length;
  const inNegotiation = currentLeads.filter(l => l.status_lead === 'em_negociacao').length;
  const sold = currentLeads.filter(l => l.status_lead === 'vendido').length;

  const prevTotal = previousLeads.length || undefined;
  const prevNew = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'novo').length : undefined;
  const prevNeg = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'em_negociacao').length : undefined;
  const prevSold = previousLeads.length > 0 ? previousLeads.filter(l => l.status_lead === 'vendido').length : undefined;

  const now = new Date();
  const soldThisMonth = allLeads.filter(l => {
    if (l.status_lead !== 'vendido') return false;
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Overdue leads alert
  const overdueLeads = useMemo(() => {
    const nowMs = Date.now();
    return allLeads.filter(l => {
      if (l.status_lead !== 'novo') return false;
      return (nowMs - new Date(l.created_at).getTime()) > 48 * 60 * 60 * 1000;
    });
  }, [allLeads]);

  const metrics: MetricCardProps[] = [
    { icon: Users, label: 'Total de Leads', value: totalLeads, previousValue: prevTotal, color: 'text-primary' },
    { icon: Clock, label: 'Novos', value: newLeads, previousValue: prevNew, color: 'text-secondary' },
    { icon: TrendingUp, label: 'Em Negociação', value: inNegotiation, previousValue: prevNeg, color: 'text-violet-600' },
    { icon: Droplets, label: 'Vendidos', value: sold, previousValue: prevSold, color: 'text-emerald-600' },
  ];

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isLoading = authLoading || loadingTable;

  const leadDetailPath = embedded ? '/admin/lead' : '/painel/lead';

  const content = (
    <>
      {franchiseSlug && <FranchiseLinkBanner slug={franchiseSlug} />}

      {/* Time Range + KPIs */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <SectionHeader icon={BarChart3} title="Visão Geral" subtitle={timeRange === 'all' ? 'Todo o período' : `Últimos ${timeRange} dias`} />
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <MetricGrid metrics={metrics} loading={loadingKpis} columns={4} />

      {/* Alerts */}
      {overdueLeads.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <AlertBanner
            level="warning"
            title={`${overdueLeads.length} lead${overdueLeads.length > 1 ? 's' : ''} sem contato há mais de 48h`}
            description="Leads aguardando primeiro contato. Responda rapidamente para aumentar sua taxa de conversão."
            action={
              <Button variant="outline" size="sm" className="rounded-xl text-xs shrink-0" onClick={() => setActiveTab('leads')}>
                Ver leads
              </Button>
            }
          />
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

      {/* Tab switcher */}
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
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Leads Recentes ({totalCount})</span>
              {overdueLeads.length > 0 && (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 animate-pulse">
                  ⚠️ {overdueLeads.length} aguardando
                </Badge>
              )}
            </CardTitle>
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
                        const isOverdue = lead.status_lead === 'novo' && (Date.now() - new Date(lead.created_at).getTime()) > 48 * 60 * 60 * 1000;
                        return (
                          <tr key={lead.id} className={`border-b border-border/20 hover:bg-muted/40 transition-all cursor-pointer group ${isOverdue ? 'bg-amber-500/[0.03]' : ''}`} role="row" onClick={() => navigate(`${leadDetailPath}/${lead.id}`)}>
                            <td role="cell" className="py-3.5 px-3 font-medium">
                              <div className="flex items-center gap-2">
                                {lead.nome || '—'}
                                {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                              </div>
                            </td>
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
          {allLeads.length} leads
        </Badge>
        <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Breadcrumbs items={[{ label: 'Franquia' }]} />
        {content}
      </div>
    </div>
    </PageTransition>
  );
}
