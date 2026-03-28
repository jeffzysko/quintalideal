import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLeadCard } from './MobileLeadCard';
import { SmartTagBadges } from '@/components/SmartTagBadges';
import { classifyLead } from '@/lib/leadScoring';

interface AdminLeadsTableProps {
  leads: LeadRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  franchiseMap: Record<string, string>;
  temperatureFiltered?: boolean;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-7 text-right">{score}%</span>
    </div>
  );
}

function AvatarInitial({ name }: { name: string | null }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{initial}</span>
    </div>
  );
}

export function AdminLeadsTable({ leads, totalCount, page, pageSize, onPageChange, isLoading, franchiseMap, temperatureFiltered }: AdminLeadsTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const totalPages = Math.ceil(totalCount / pageSize);
  const detailReturnTo = `/admin?tab=leads&page=${page}`;
  const detailRouteState = { returnTo: detailReturnTo };

  return (
    <Card className="card-premium overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">Todos os Leads</CardTitle>
          <span className="text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-lg tabular-nums">
            {totalCount} {totalCount === 1 ? 'lead' : 'leads'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : leads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground">Nenhum lead encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
          </motion.div>
        ) : (
          <>
            {/* Mobile card view */}
            {isMobile ? (
              <div className="space-y-3 px-4 pb-4">
                {leads.map((lead, i) => (
                  <MobileLeadCard
                    key={lead.id}
                    lead={lead}
                    index={i}
                    basePath="/admin/lead"
                    franchiseName={lead.franquia_id ? franchiseMap[lead.franquia_id] : undefined}
                  />
                ))}
              </div>
            ) : (
            <div className="relative z-0 overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-y border-border/40 bg-muted/30" role="row">
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Temp.</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Franquia</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Quintal</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th role="columnheader" className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th role="columnheader" className="w-12 py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {leads.map((lead) => {
                    const temp = classifyLead((lead as any).respostas_questionario || null, lead.pontuacao_quintal);
                    return (
                    <tr
                      key={lead.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      role="row"
                      onClick={() => navigate(`/admin/lead/${lead.id}`, { state: detailRouteState })}
                    >
                      <td role="cell" className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <AvatarInitial name={lead.nome} />
                          <div className="min-w-0">
                            <span className="font-semibold text-sm group-hover:text-primary transition-colors block truncate">{lead.nome || '—'}</span>
                            {lead.email && (
                              <span className="text-[11px] text-muted-foreground/60 truncate block max-w-[180px]">{lead.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td role="cell" className="py-3 px-4">
                        <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                          {temp.emoji} {temp.label}
                        </Badge>
                      </td>
                      <td role="cell" className="py-3 px-4 hidden md:table-cell text-muted-foreground text-sm">{lead.cidade || '—'}</td>
                      <td role="cell" className="py-3 px-4 hidden lg:table-cell">
                        {lead.franquia_id ? (
                          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                            {franchiseMap[lead.franquia_id] || '—'}
                          </span>
                        ) : '—'}
                      </td>
                      <td role="cell" className="py-3 px-4">
                        <ScoreBar score={lead.pontuacao_quintal || 0} />
                      </td>
                      <td role="cell" className="py-3 px-4 hidden md:table-cell text-muted-foreground text-xs">{lead.modelo_recomendado || '—'}</td>
                      <td role="cell" className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-[10px] font-semibold`} variant="secondary">
                            {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                          </Badge>
                          <SmartTagBadges lead={lead} max={1} />
                        </div>
                      </td>
                      <td role="cell" className="py-3 px-4 hidden md:table-cell text-muted-foreground text-xs tabular-nums">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td role="cell" className="py-3 px-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/lead/${lead.id}`, { state: detailRouteState }); }}
                          className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Ver detalhes do lead"
                        >
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
 
            {totalCount > 0 && (
              <div
                className="relative z-10 isolate flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-4 border-t border-border/30 bg-card"
                onClick={(e) => e.stopPropagation()}
              >
                {temperatureFiltered ? (
                  <p className="text-xs text-muted-foreground">
                    Exibindo <span className="font-semibold text-foreground">{totalCount}</span> {totalCount === 1 ? 'resultado' : 'resultados'} <span className="text-muted-foreground/60">(filtro de temperatura aplicado)</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Mostrando <span className="font-semibold text-foreground">{from + 1}–{Math.min(to, totalCount)}</span> de {totalCount}
                  </p>
                )}
                {!temperatureFiltered && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-input bg-background text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => onPageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          type="button"
                          key={pageNum}
                          className={`inline-flex items-center justify-center h-10 w-10 rounded-lg text-xs font-medium transition-colors ${page === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground'}`}
                          onClick={() => onPageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && <span className="text-xs text-muted-foreground px-1">…</span>}
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-11 w-11 rounded-lg border border-input bg-background text-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => onPageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
