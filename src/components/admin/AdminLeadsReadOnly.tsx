import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Calendar, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS } from '@/lib/lead-constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { classifyLead } from '@/lib/leadScoring';

interface AdminLeadsReadOnlyProps {
  franchiseMap: Record<string, string>;
  franchises: { id: string; nome_franquia: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-50 text-blue-700 border-blue-200',
  contatado: 'bg-amber-50 text-amber-700 border-amber-200',
  em_negociacao: 'bg-violet-50 text-violet-700 border-violet-200',
  vendido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perdido: 'bg-red-50 text-red-700 border-red-200',
};

const PAGE_SIZE = 20;

export function AdminLeadsReadOnly({ franchiseMap, franchises }: AdminLeadsReadOnlyProps) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterFranquia, setFilterFranquia] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-leads-readonly', search, filterFranquia, filterStatus, page],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, nome, cidade, telefone, email, status_lead, modelo_recomendado, modelo_vendido, pontuacao_quintal, franquia_id, created_at, respostas_questionario', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (filterFranquia !== 'all') query = query.eq('franquia_id', filterFranquia);
      if (filterStatus !== 'all') query = query.eq('status_lead', filterStatus as any);
      if (search) query = query.or(`nome.ilike.%${search}%,cidade.ilike.%${search}%,email.ilike.%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      return { leads: data ?? [], total: count ?? 0 };
    },
  });

  const leads = result?.leads ?? [];
  const totalCount = result?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const stats = useMemo(() => {
    return {
      total: totalCount,
      hot: leads.filter(l => (l.respostas_questionario as any)?.v2_recommendation?.is_hot_lead).length,
    };
  }, [leads, totalCount]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade ou email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterFranquia} onValueChange={(v) => { setFilterFranquia(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Franquia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as franquias</SelectItem>
                {franchises.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{totalCount} lead{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</span>
        {stats.hot > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
            🔥 {stats.hot} quente{stats.hot !== 1 ? 's' : ''} nesta página
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={10} cols={7} /></div>
          ) : leads.length === 0 ? (
            <p className="text-muted-foreground text-center py-12 text-sm">Nenhum lead encontrado</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Temp.</TableHead>
                      <TableHead className="text-xs">Cidade</TableHead>
                      <TableHead className="text-xs">Franquia</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Modelo</TableHead>
                      <TableHead className="text-xs text-center">Quintal</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => {
                      const temp = classifyLead((lead.respostas_questionario as Record<string, string>) || null, lead.pontuacao_quintal);
                      return (
                        <TableRow key={lead.id} className="group hover:bg-muted/30">
                          <TableCell className="text-sm font-medium">
                            {lead.nome || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                              {temp.emoji} {temp.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {lead.cidade || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {franchiseMap[lead.franquia_id ?? ''] || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[lead.status_lead] || ''}`}>
                              {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {lead.modelo_recomendado || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {lead.pontuacao_quintal != null ? (
                              <span className="text-sm font-medium">{lead.pontuacao_quintal}%</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => navigate(`/admin/lead/${lead.id}`)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border/40">
                {leads.map((lead) => {
                  const isHot = (lead.respostas_questionario as any)?.v2_recommendation?.is_hot_lead;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => navigate(`/admin/lead/${lead.id}`)}
                      className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate flex items-center gap-1">
                          {lead.nome || '—'}
                          {isHot && <span className="text-xs">🔥</span>}
                        </span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[lead.status_lead] || ''}`}>
                          {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {lead.cidade && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />{lead.cidade}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(lead.created_at), "dd/MM", { locale: ptBR })}
                        </span>
                        {lead.pontuacao_quintal != null && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-500" />{lead.pontuacao_quintal}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {franchiseMap[lead.franquia_id ?? ''] || '—'} · {lead.modelo_recomendado || 'Sem modelo'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
