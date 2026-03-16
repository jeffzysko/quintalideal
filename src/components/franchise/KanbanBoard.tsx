import { useState, useMemo } from 'react';
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

const COLUMNS = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'] as const;

interface KanbanBoardProps {
  leads: (LeadRow & { respostas_questionario?: Record<string, string> | null })[];
  franchiseId: string;
  basePath: string;
}

// ── Draggable Lead Card ──
function LeadCard({
  lead,
  basePath,
  isDragging,
}: {
  lead: LeadRow & { respostas_questionario?: Record<string, string> | null };
  basePath: string;
  isDragging?: boolean;
}) {
  const navigate = useNavigate();
  const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border border-border/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`${basePath}/${lead.id}`)}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{lead.nome || '—'}</p>
        </div>
        <div
          {...listeners}
          {...attributes}
          className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 -m-0.5 rounded hover:bg-muted/60 touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/50" />
        </div>
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
  activeId,
}: {
  status: string;
  leads: (LeadRow & { respostas_questionario?: Record<string, string> | null })[];
  basePath: string;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_CHART_COLORS[status] || '#64748b';

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-all min-w-[260px] w-[260px] shrink-0 ${
        isOver
          ? 'border-primary/40 bg-primary/5 shadow-lg scale-[1.01]'
          : 'border-border/40 bg-muted/30'
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider truncate">
          {STATUS_LABELS[status]}
        </h3>
        <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted/80 rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 pt-0 overflow-y-auto max-h-[calc(100vh-340px)] scrollbar-none">
        {leads.length === 0 ? (
          <div className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isOver ? 'border-primary/40 bg-primary/5' : 'border-border/30'
          }`}>
            <p className="text-xs text-muted-foreground">
              {isOver ? 'Solte aqui' : 'Nenhum lead'}
            </p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              basePath={basePath}
              isDragging={activeId === lead.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Board ──
export function KanbanBoard({ leads, franchiseId, basePath }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const columnData = useMemo(() => {
    const map: Record<string, typeof leads> = {};
    for (const col of COLUMNS) map[col] = [];
    for (const lead of leads) {
      const col = COLUMNS.includes(lead.status_lead as any) ? lead.status_lead : 'novo';
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
  }, [leads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status_lead === newStatus) return;

    // Optimistic update
    const oldStatus = lead.status_lead;
    lead.status_lead = newStatus;
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });

    const { error } = await supabase
      .from('leads')
      .update({ status_lead: newStatus as any })
      .eq('id', leadId);

    if (error) {
      lead.status_lead = oldStatus;
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
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
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
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
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeLead ? (
          <div className="opacity-90 rotate-2 scale-105">
            <LeadCard lead={activeLead} basePath={basePath} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
