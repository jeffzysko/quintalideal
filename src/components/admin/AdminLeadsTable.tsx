import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLeadCard } from './MobileLeadCard';

interface AdminLeadsTableProps {
  leads: LeadRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  franchiseMap: Record<string, string>;
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cls}`}>
      {score}%
    </span>
  );
}

function AvatarInitial({ name }: { name: string | null }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-primary">{initial}</span>
    </div>
  );
}

export function AdminLeadsTable({ leads, totalCount, page, pageSize, onPageChange, isLoading, franchiseMap }: AdminLeadsTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Todos os Leads ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : leads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl icon-bg-blue flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">Nenhum lead encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
          </motion.div>
        ) : (
          <>
            {/* Mobile card view */}
            {isMobile ? (
              <div className="space-y-3">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-border/50" role="row">
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Franquia</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Ref</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th role="columnheader" className="text-left py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/20 hover:bg-muted/40 transition-all cursor-pointer group"
                      role="row"
                      onClick={() => navigate(`/admin/lead/${lead.id}`)}
                    >
                      <td role="cell" className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <AvatarInitial name={lead.nome} />
                          <span className="font-semibold group-hover:text-primary transition-colors">{lead.nome || '—'}</span>
                        </div>
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.cidade || '—'}</td>
                      <td role="cell" className="py-3.5 px-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {lead.franquia_id ? (franchiseMap[lead.franquia_id] || '—') : '—'}
                      </td>
                      <td role="cell" className="py-3.5 px-3">
                        <ScorePill score={lead.pontuacao_quintal || 0} />
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">{lead.modelo_recomendado || '—'}</td>
                      <td role="cell" className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-[10px] font-semibold`} variant="secondary">
                            {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                          </Badge>
                          <SmartTagBadges lead={lead} max={1} />
                        </div>
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden lg:table-cell">
                        {lead.referred_by ? (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">{lead.referred_by}</span>
                        ) : '—'}
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td role="cell" className="py-3.5 px-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/lead/${lead.id}`); }}
                          className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Ver detalhes do lead"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-semibold text-foreground">{from + 1}–{Math.min(to, totalCount)}</span> de {totalCount}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 rounded-lg text-xs"
                        onClick={() => onPageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-xs text-muted-foreground px-1">...</span>}
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
