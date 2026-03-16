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
import { MapPin, Calendar, GripVertical, Filter, X, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
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
}: {
  status: string;
  leads: LeadWithQuiz[];
  basePath: string;
  isOverColumn: boolean;
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
function PipelineSummary({ leads }: { leads: LeadWithQuiz[] }) {
  const stats = useMemo(() => {
    let total = 0;
    const temps = { quente: 0, morno: 0, frio: 0 };
    for (const lead of leads) {
      total += estimateLeadValue(lead.respostas_questionario || null);
      const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
      temps[t.temperature]++;
    }
    return { total, temps, count: leads.length };
  }, [leads]);

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
    </div>
  );
}

// ── Main Board ──
export function KanbanBoard({ leads, franchiseId, basePath }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});
  const [tempFilter, setTempFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
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
    return leads.filter((lead) => {
      if (tempFilter !== 'all') {
        const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
        if (t.temperature !== tempFilter) return false;
      }
      if (cityFilter !== 'all') {
        if (lead.cidade !== cityFilter) return false;
      }
      return true;
    });
  }, [leads, tempFilter, cityFilter]);

  const hasActiveFilters = tempFilter !== 'all' || cityFilter !== 'all';

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
      <PipelineSummary leads={filteredLeads} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
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

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setTempFilter('all'); setCityFilter('all'); }}
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
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeLead ? (
          <LeadCard lead={activeLead} basePath={basePath} overlay />
        ) : null}
      </DragOverlay>
      </DndContext>
    </>
  );
}
