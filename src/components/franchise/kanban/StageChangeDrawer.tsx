import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { COLUMNS } from './types';

export function StageChangeDrawer({
  open,
  onOpenChange,
  leadId,
  currentStatus,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  currentStatus: string;
  onConfirm: (leadId: string, newStatus: string) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">Para qual etapa deseja mover este lead?</DrawerTitle>
          <p className="text-xs text-muted-foreground mt-1">Selecione a nova etapa do lead no processo de vendas.</p>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          {COLUMNS.map((status) => {
            const color = STATUS_CHART_COLORS[status] || '#64748b';
            const isActive = status === currentStatus;
            const descriptions: Record<string, string> = {
              novo: 'Lead acabou de chegar, ainda não foi contatado',
              contatado: 'Você já entrou em contato com o lead',
              em_negociacao: 'Lead demonstrou interesse, negociação em andamento',
              vendido: 'Venda concluída com sucesso! 🎉',
              perdido: 'Lead desistiu ou não tem mais interesse',
            };
            return (
              <button
                key={status}
                disabled={isActive}
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all min-h-[48px]",
                  isActive
                    ? "border-primary/30 bg-primary/5 cursor-default"
                    : "border-border/40 hover:border-primary/30 hover:bg-primary/5 cursor-pointer active:scale-[0.98]"
                )}
                onClick={() => {
                  if (leadId && !isActive) {
                    onConfirm(leadId, status);
                    onOpenChange(false);
                  }
                }}
              >
                <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: color }} />
                <div className="flex-1 text-left">
                  <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>
                    {STATUS_LABELS[status]}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{descriptions[status]}</p>
                </div>
                {isActive && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary shrink-0 mt-0.5">
                    Atual
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
