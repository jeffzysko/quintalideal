import { useMemo, memo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { LeadCard } from './LeadCard';
import { estimateLeadValue, formatCurrency, type LeadWithQuiz } from './types';

const ESTIMATED_CARD_HEIGHT = 160;
const VIRTUAL_THRESHOLD = 20; // Only virtualize when there are many cards
const COLLAPSED_LIMIT = 10;

export const KanbanColumn = memo(function KanbanColumn({
  status,
  leads,
  basePath,
  isOverColumn,
  franchiseMap,
  onMoveStage,
  franchiseId,
  whatsAppPlanActive,
  selectedIds,
  onToggleSelect,
}: {
  status: string;
  leads: LeadWithQuiz[];
  basePath: string;
  isOverColumn: boolean;
  franchiseMap?: Record<string, string>;
  onMoveStage: (leadId: string, newStatus: string, lossReason?: string) => void;
  franchiseId?: string;
  whatsAppPlanActive?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (leadId: string) => void;
}) {
  const hasSelection = selectedIds && selectedIds.length > 0;
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_CHART_COLORS[status] || '#64748b';
  const highlighted = isOver || isOverColumn;
  const totalValue = useMemo(
    () => leads.reduce((sum, l) => sum + estimateLeadValue(l.respostas_questionario || null), 0),
    [leads]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const useVirtual = leads.length > VIRTUAL_THRESHOLD;
  const showCollapse = !useVirtual && leads.length > COLLAPSED_LIMIT && !expanded;
  const visibleLeads = showCollapse ? leads.slice(0, COLLAPSED_LIMIT) : leads;

  const virtualizer = useVirtualizer({
    count: leads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 3,
    enabled: useVirtual,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-w-[250px] w-[250px] shrink-0 ${
        highlighted
          ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5'
          : 'border-border/40 bg-muted/20'
      }`}
    >
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
          <div className="mt-1.5 text-[11px] font-semibold text-success">
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      <div
        ref={parentRef}
        className="flex flex-col gap-2 p-2 pt-0 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-none"
      >
        {leads.length === 0 ? (
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors animate-fade-in ${
              highlighted ? 'border-primary/40 bg-primary/5' : 'border-border/30'
            }`}
          >
            <p className="text-xs text-muted-foreground">
              {highlighted ? 'Solte aqui' : 'Nenhum lead'}
            </p>
          </div>
        ) : useVirtual ? (
          /* Virtualized list for large datasets */
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const lead = leads[virtualItem.index];
              return (
                <div
                  key={lead.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="pb-2"
                >
                  <LeadCard
                    lead={lead}
                    basePath={basePath}
                    franchiseName={franchiseMap?.[lead.franquia_id || '']}
                    onMoveStage={onMoveStage}
                    franchiseId={franchiseId}
                    whatsAppPlanActive={whatsAppPlanActive}
                    isSelected={selectedIds?.includes(lead.id)}
                    showCheckbox={!!hasSelection}
                    onToggleSelect={onToggleSelect}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard list for small datasets — keeps drag-and-drop smooth */
          <>
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="animate-scale-in">
                <LeadCard
                  lead={lead}
                  basePath={basePath}
                  franchiseName={franchiseMap?.[lead.franquia_id || '']}
                  onMoveStage={onMoveStage}
                  franchiseId={franchiseId}
                  whatsAppPlanActive={whatsAppPlanActive}
                  isSelected={selectedIds?.includes(lead.id)}
                  showCheckbox={!!hasSelection}
                  onToggleSelect={onToggleSelect}
                />
              </div>
            ))}
            {showCollapse && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full mt-1 py-2 rounded-xl border border-dashed border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                Ver mais {leads.length - COLLAPSED_LIMIT} lead{leads.length - COLLAPSED_LIMIT > 1 ? 's' : ''}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
