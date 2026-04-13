import { useMemo, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { motion, AnimatePresence } from 'framer-motion';
import { LeadCard } from './LeadCard';
import { estimateLeadValue, formatCurrency, type LeadWithQuiz } from './types';

export const KanbanColumn = memo(function KanbanColumn({
  status,
  leads,
  basePath,
  isOverColumn,
  franchiseMap,
  onMoveStage,
}: {
  status: string;
  leads: LeadWithQuiz[];
  basePath: string;
  isOverColumn: boolean;
  franchiseMap?: Record<string, string>;
  onMoveStage: (leadId: string, newStatus: string) => void;
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
                  franchiseName={franchiseMap?.[lead.franquia_id || '']}
                  onMoveStage={onMoveStage}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
