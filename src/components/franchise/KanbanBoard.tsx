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
import { MapPin, Calendar, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'] as const;

type LeadWithQuiz = LeadRow & { respostas_questionario?: Record<string, string> | null };

interface KanbanBoardProps {
  leads: LeadWithQuiz[];
  franchiseId: string;
  basePath: string;
}

// ── Draggable Lead Card ──
function LeadCard({
  lead,
  basePath,
  overlay,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  overlay?: boolean;
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
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
          {STATUS_LABELS[status]}
        </h3>
        <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted/80 rounded-full px-2 py-0.5">
          {leads.length}
        </span>
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

// ── Main Board ──
export function KanbanBoard({ leads, franchiseId, basePath }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  // Local optimistic state for immediate UI updates
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Reset overrides when props change (after refetch)
  useEffect(() => {
    setLocalStatusOverrides({});
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const columnData = useMemo(() => {
    const map: Record<string, LeadWithQuiz[]> = {};
    for (const col of COLUMNS) map[col] = [];
    for (const lead of leads) {
      // Use local override if available, otherwise use lead's status
      const effectiveStatus = localStatusOverrides[lead.id] || lead.status_lead;
      const col = COLUMNS.includes(effectiveStatus as any) ? effectiveStatus : 'novo';
      (map[col] ??= []).push(lead);
    }
    // Sort each column by temperature
    for (const col of COLUMNS) {
      map[col].sort((a, b) => {
        const sa = classifyLead(a.respostas_questionario || null, a.pontuacao_quintal);
        const sb = classifyLead(b.respostas_questionario || null, b.pontuacao_quintal);
        return sa.sortOrder - sb.sortOrder;
      });
    }
    return map;
  }, [leads, localStatusOverrides]);

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
            activeId={activeId}
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
  );
}
