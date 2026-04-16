
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Wrench, CalendarDays, CheckCircle2, Star, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MetricGrid } from '@/components/dashboard/MetricGrid';
import type { MetricCardProps } from '@/components/dashboard/MetricCard';

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  agendado: { label: 'Agendado', emoji: '📅', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
  em_instalacao: { label: 'Em instalacao', emoji: '🔧', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  concluido: { label: 'Concluido', emoji: '✅', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  pausado: { label: 'Pausado', emoji: '⏸', color: 'text-muted-foreground', bgColor: 'bg-muted border-border' },
};

interface PostSaleDashboardProps {
  franchiseId: string;
  basePath?: string;
}

export function PostSaleDashboard({ franchiseId, basePath = '/painel/lead' }: PostSaleDashboardProps) {
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['post-sale-overview', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_sale_projects')
        .select('*, leads!inner(nome, cidade)')
        .eq('franchise_id', franchiseId)
        .order('installation_date', { ascending: true, nullsFirst: false });
      return data || [];
    },
    enabled: !!franchiseId,
    staleTime: 2 * 60 * 1000,
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const activeProjects = projects.filter(p => p.status !== 'concluido');
  const agendados = projects.filter(p => p.status === 'agendado').length;
  const completedThisMonth = projects.filter(p => {
    if (p.status !== 'concluido') return false;
    const d = p.completion_date ? new Date(p.completion_date) : new Date(p.updated_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const ratings = projects.filter(p => p.satisfaction_rating != null).map(p => p.satisfaction_rating as number);
  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '-';

  const metrics: MetricCardProps[] = [
    { icon: Wrench, label: 'Em andamento', value: activeProjects.length, color: 'text-primary' },
    { icon: CalendarDays, label: 'Agendados', value: agendados, color: 'text-amber-600' },
    { icon: CheckCircle2, label: 'Concluidos este mes', value: completedThisMonth, color: 'text-emerald-600' },
    { icon: Star, label: 'Satisfacao media', value: avgRating === '-' ? '-' : `${avgRating} ⭐`, color: 'text-violet-600' },
  ];

  const isOverdue = (p: any) => {
    if (p.status === 'concluido') return false;
    if (!p.installation_date) return false;
    return new Date(p.installation_date) < today;
  };

  return (
    <div className="space-y-4">
      <MetricGrid metrics={metrics} loading={isLoading} columns={4} />

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            Projetos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-border/50 p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted/60 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhum projeto ativo</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Quando leads forem vendidos e o acompanhamento pos-venda for iniciado, eles aparecerao aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.map((p, i) => {
                const overdue = isOverdue(p);
                const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.agendado;
                const leadName = (p as any).leads?.nome || 'Lead';
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <button
                      onClick={() => navigate(`${basePath}/${p.lead_id}`)}
                      className={`w-full text-left rounded-xl border p-4 transition-all hover:bg-muted/40 active:scale-[0.99] ${overdue ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'border-border/50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground truncate">{leadName}</span>
                            {overdue && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 gap-0.5 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                Atrasado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {p.installation_date && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(p.installation_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <Badge className={`${statusCfg.bgColor} ${statusCfg.color} border text-[10px]`} variant="outline">
                              {statusCfg.emoji} {statusCfg.label}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
