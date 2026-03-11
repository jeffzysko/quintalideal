import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';

interface AdminLeadsTableProps {
  leads: LeadRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  franchiseMap: Record<string, string>;
}

export function AdminLeadsTable({ leads, totalCount, page, pageSize, onPageChange, isLoading, franchiseMap }: AdminLeadsTableProps) {
  const navigate = useNavigate();
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Todos os Leads ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Search className="w-10 h-10 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum lead encontrado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Tente ajustar os filtros de busca</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-border/50" role="row">
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Franquia</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Ref</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                    <th role="columnheader" className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors" role="row">
                      <td role="cell" className="py-3.5 px-3 font-medium">{lead.nome || '—'}</td>
                      <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.cidade || '—'}</td>
                      <td role="cell" className="py-3.5 px-3 hidden lg:table-cell text-muted-foreground">
                        {lead.franquia_id ? (franchiseMap[lead.franquia_id] || '—') : '—'}
                      </td>
                      <td role="cell" className="py-3.5 px-3">
                        <span className="font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.modelo_recomendado || '—'}</td>
                      <td role="cell" className="py-3.5 px-3">
                        <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-xs font-medium`} variant="secondary">
                          {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                        </Badge>
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden lg:table-cell">
                        {lead.referred_by ? (
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">{lead.referred_by}</span>
                        ) : '—'}
                      </td>
                      <td role="cell" className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td role="cell" className="py-3.5 px-3">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/lead/${lead.id}`)} className="rounded-lg" aria-label="Ver detalhes do lead">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalCount > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-border/30">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {from + 1}–{Math.min(to, totalCount)} de {totalCount}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-xl h-8 text-xs">
                    Anterior
                  </Button>
                  <span className="flex items-center text-xs text-muted-foreground px-2">
                    {page}/{totalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="rounded-xl h-8 text-xs">
                    Próximo
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
