import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { classifyLead } from '@/lib/leadScoring';
import { STATUS_LABELS, STATUS_CHART_COLORS, type LeadRow } from '@/lib/lead-constants';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, GripVertical, Filter, X, Building2, Search, CalendarIcon, MessageCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'] as const;

type LeadWithQuiz = LeadRow & { respostas_questionario?: Record<string, string> | null };

const BUDGET_RANGES: Record<string, [number, number]> = {
  '30-50': [30000, 50000],
  '18-30': [18000, 30000],
  'ate-18': [5000, 18000],
};

function estimateLeadValue(respostas: Record<string, string> | null): number {
  if (!respostas?.orcamento) return 15000; // default estimate
  const range = BUDGET_RANGES[respostas.orcamento];
  if (!range) return 15000;
  return (range[0] + range[1]) / 2;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

interface KanbanBoardProps {
  leads: LeadWithQuiz[];
  franchiseId: string;
  basePath: string;
  franchiseMap?: Record<string, string>;
}

// ── Draggable Lead Card ──
function LeadCard({
  lead,
  basePath,
  overlay,
  franchiseName,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  overlay?: boolean;
  franchiseName?: string;
}) {
  const navigate = useNavigate();
  const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = !overlay
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        transition: isDragging ? 'opacity 150ms ease' : undefined,
      }
    : undefined;

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={style}
      className={`bg-card border rounded-xl p-3 shadow-sm transition-all ${
        overlay
          ? 'shadow-xl border-primary/30 scale-105 rotate-1 ring-2 ring-primary/20'
          : isDragging
          ? 'border-primary/20'
          : 'border-border/50 hover:shadow-md hover:border-border cursor-pointer'
      }`}
      onClick={!overlay ? () => navigate(`${basePath}/${lead.id}`) : undefined}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{lead.nome || '—'}</p>
        </div>
        {!overlay && (
          <div
            {...listeners}
            {...attributes}
            className="shrink-0 cursor-grab active:cursor-grabbing p-1 -m-1 rounded-lg hover:bg-muted/80 touch-none transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <Badge
          className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`}
          variant="outline"
        >
          {temp.emoji} {temp.label}
        </Badge>
        <span className="text-xs font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
      </div>

      <div className="space-y-1">
        {lead.cidade && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.cidade}</span>
          </div>
        )}
        {franchiseName && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{franchiseName}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          {lead.telefone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const phone = lead.telefone!.replace(/\D/g, '');
                const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
                window.open(`https://wa.me/${fullPhone}`, '_blank');
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Enviar WhatsApp"
            >
              <MessageCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column ──
function KanbanColumn({
  status,
  leads,
  basePath,
  isOverColumn,
  franchiseMap,
}: {
  status: string;
  leads: LeadWithQuiz[];
  basePath: string;
  isOverColumn: boolean;
  franchiseMap?: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_CHART_COLORS[status] || '#64748b';
  const highlighted = isOver || isOverColumn;
  const totalValue = useMemo(
    () => leads.reduce((sum, l) => sum + estimateLeadValue(l.respostas_questionario || null), 0),
    [leads]
  );

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-w-[250px] w-[250px] shrink-0 ${
        highlighted
          ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5'
          : 'border-border/40 bg-muted/20'
      }`}
    >
      {/* Column header */}
      <div className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
            {STATUS_LABELS[status]}
          </h3>
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted/80 rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        </div>
        {leads.length > 0 && (
          <div className="mt-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 pt-0 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-none">
        <AnimatePresence mode="popLayout">
          {leads.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                highlighted ? 'border-primary/40 bg-primary/5' : 'border-border/30'
              }`}
            >
              <p className="text-xs text-muted-foreground">
                {highlighted ? 'Solte aqui' : 'Nenhum lead'}
              </p>
            </motion.div>
          ) : (
            leads.map((lead) => (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <LeadCard
                  lead={lead}
                  basePath={basePath}
                  franchiseName={franchiseMap?.[lead.franquia_id || ''] }
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Pipeline Summary ──
function PipelineSummary({ leads, franchiseMap }: { leads: LeadWithQuiz[]; franchiseMap?: Record<string, string> }) {
  const stats = useMemo(() => {
    let total = 0;
    const temps = { quente: 0, morno: 0, frio: 0 };
    const byFranchise: Record<string, { total: number; count: number }> = {};
    for (const lead of leads) {
      const val = estimateLeadValue(lead.respostas_questionario || null);
      total += val;
      const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
      temps[t.temperature]++;
      if (franchiseMap && lead.franquia_id) {
        if (!byFranchise[lead.franquia_id]) byFranchise[lead.franquia_id] = { total: 0, count: 0 };
        byFranchise[lead.franquia_id].total += val;
        byFranchise[lead.franquia_id].count++;
      }
    }
    return { total, temps, count: leads.length, byFranchise };
  }, [leads, franchiseMap]);

  const franchiseEntries = useMemo(() => {
    if (!franchiseMap) return [];
    return Object.entries(stats.byFranchise)
      .map(([id, data]) => ({ id, name: franchiseMap[id] || id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [stats.byFranchise, franchiseMap]);

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-xl border border-border/40 bg-muted/20">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pipeline Total</span>
        <span className="text-lg font-bold text-foreground">{formatCurrency(stats.total)}</span>
        <span className="text-[11px] text-muted-foreground">{stats.count} leads</span>
      </div>
      <div className="h-10 w-px bg-border/50 hidden sm:block" />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔥</span>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{stats.temps.quente}</span>
          <span className="text-[11px] text-muted-foreground">Quentes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">☀️</span>
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.temps.morno}</span>
          <span className="text-[11px] text-muted-foreground">Mornos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">❄️</span>
          <span className="text-sm font-bold text-sky-600 dark:text-sky-400">{stats.temps.frio}</span>
          <span className="text-[11px] text-muted-foreground">Frios</span>
        </div>
      </div>
      {franchiseEntries.length > 0 && (
        <>
          <div className="h-10 w-px bg-border/50 hidden sm:block" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top Franquias</span>
            {franchiseEntries.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground truncate max-w-[120px]">{f.name}</span>
                <span className="font-semibold text-foreground">{formatCurrency(f.total)}</span>
                <span className="text-muted-foreground">({f.count})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Board ──
export function KanbanBoard({ leads, franchiseId, basePath, franchiseMap }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});
  const [tempFilter, setTempFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [franchiseFilter, setFranchiseFilter] = useState<string>('all');
  const [nameSearch, setNameSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalStatusOverrides({});
  }, [leads]);

  // Unique cities for filter
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.cidade) set.add(l.cidade);
    return Array.from(set).sort();
  }, [leads]);

  // Apply filters
  const filteredLeads = useMemo(() => {
    const search = nameSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (search && !(lead.nome || '').toLowerCase().includes(search)) return false;
      if (tempFilter !== 'all') {
        const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
        if (t.temperature !== tempFilter) return false;
      }
      if (cityFilter !== 'all') {
        if (lead.cidade !== cityFilter) return false;
      }
      if (franchiseFilter !== 'all' && franchiseMap) {
        if (lead.franquia_id !== franchiseFilter) return false;
      }
      if (dateFrom) {
        if (new Date(lead.created_at) < dateFrom) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(lead.created_at) > end) return false;
      }
      return true;
    });
  }, [leads, tempFilter, cityFilter, franchiseFilter, nameSearch, dateFrom, dateTo, franchiseMap]);

  const hasActiveFilters = tempFilter !== 'all' || cityFilter !== 'all' || franchiseFilter !== 'all' || nameSearch.trim() !== '' || !!dateFrom || !!dateTo;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const columnData = useMemo(() => {
    const map: Record<string, LeadWithQuiz[]> = {};
    for (const col of COLUMNS) map[col] = [];
    for (const lead of filteredLeads) {
      const effectiveStatus = localStatusOverrides[lead.id] || lead.status_lead;
      const col = COLUMNS.includes(effectiveStatus as any) ? effectiveStatus : 'novo';
      (map[col] ??= []).push(lead);
    }
    for (const col of COLUMNS) {
      map[col].sort((a, b) => {
        const sa = classifyLead(a.respostas_questionario || null, a.pontuacao_quintal);
        const sb = classifyLead(b.respostas_questionario || null, b.pontuacao_quintal);
        return sa.sortOrder - sb.sortOrder;
      });
    }
    return map;
  }, [filteredLeads, localStatusOverrides]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverColumnId(event.over?.id as string || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const oldStatus = localStatusOverrides[leadId] || lead.status_lead;
    if (oldStatus === newStatus) return;

    // Optimistic: update local state immediately
    setLocalStatusOverrides((prev) => ({ ...prev, [leadId]: newStatus }));

    const { error } = await supabase
      .from('leads')
      .update({ status_lead: newStatus as any })
      .eq('id', leadId);

    if (error) {
      // Rollback
      setLocalStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
      toast.error('Erro ao atualizar status');
      return;
    }

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: user.id,
        activity_type: 'status_change',
        content: `${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}`,
      });
    }

    toast.success(`Lead movido para ${STATUS_LABELS[newStatus]}`);

    // Refetch in background
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
  }, [leads, localStatusOverrides, franchiseId, queryClient]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  return (
    <>
      <PipelineSummary leads={filteredLeads} franchiseMap={franchiseMap} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="w-[160px] h-8 text-xs pl-7"
          />
        </div>

        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Temperatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas temperaturas</SelectItem>
            <SelectItem value="quente">🔥 Quente</SelectItem>
            <SelectItem value="morno">☀️ Morno</SelectItem>
            <SelectItem value="frio">❄️ Frio</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {franchiseMap && Object.keys(franchiseMap).length > 0 && (
          <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Franquia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas franquias</SelectItem>
              {Object.entries(franchiseMap).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", dateFrom && "text-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", dateTo && "text-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setTempFilter('all'); setCityFilter('all'); setFranchiseFilter('all'); setNameSearch(''); setDateFrom(undefined); setDateTo(undefined); }}
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}

        {hasActiveFilters && (
          <span className="text-[11px] text-muted-foreground">
            {filteredLeads.length} de {leads.length} leads
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-2 px-2">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={columnData[status]}
            basePath={basePath}
            isOverColumn={overColumnId === status}
            franchiseMap={franchiseMap}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeLead ? (
          <LeadCard lead={activeLead} basePath={basePath} overlay franchiseName={franchiseMap?.[activeLead.franquia_id || '']} />
        ) : null}
      </DragOverlay>
      </DndContext>
    </>
  );
}
