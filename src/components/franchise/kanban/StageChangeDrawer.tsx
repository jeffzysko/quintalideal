import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { COLUMNS } from './types';
import { ArrowLeft } from 'lucide-react';

const LOSS_REASONS = [
  { key: 'preco_alto', emoji: '💰', label: 'Preço alto' },
  { key: 'nao_momento', emoji: '⏳', label: 'Não é o momento' },
  { key: 'concorrente', emoji: '🏆', label: 'Escolheu concorrente' },
  { key: 'espaco_insuficiente', emoji: '📐', label: 'Espaço insuficiente' },
  { key: 'sem_retorno', emoji: '👻', label: 'Sem retorno / sumiu' },
  { key: 'desconhecido', emoji: '❓', label: 'Motivo desconhecido' },
] as const;

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
  onConfirm: (leadId: string, newStatus: string, lossReason?: string) => void;
}) {
  const [step, setStep] = useState<'select' | 'loss_reason'>('select');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [lossNote, setLossNote] = useState('');

  const resetAndClose = () => {
    setStep('select');
    setSelectedReasons([]);
    setLossNote('');
    onOpenChange(false);
  };

  const handleSelectStage = (status: string) => {
    if (!leadId) return;
    if (status === 'perdido') {
      setStep('loss_reason');
    } else {
      onConfirm(leadId, status);
      resetAndClose();
    }
  };

  const handleConfirmLoss = () => {
    if (!leadId) return;
    const reasons = selectedReasons.map(key => LOSS_REASONS.find(r => r.key === key)?.label || key);
    const parts = [...reasons];
    if (lossNote.trim()) parts.push(lossNote.trim());
    const lossReason = parts.join(' | ') || 'Motivo desconhecido';
    onConfirm(leadId, 'perdido', lossReason);
    resetAndClose();
  };

  const toggleReason = (key: string) => {
    setSelectedReasons(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) resetAndClose(); else onOpenChange(o); }}>
      <DrawerContent>
        {step === 'select' ? (
          <>
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
                    onClick={() => handleSelectStage(status)}
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
          </>
        ) : (
          <>
            <DrawerHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('select')} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div>
                  <DrawerTitle className="text-base">Por que este lead foi perdido?</DrawerTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Selecione um ou mais motivos para registrar.</p>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {LOSS_REASONS.map((reason) => {
                  const selected = selectedReasons.includes(reason.key);
                  return (
                    <button
                      key={reason.key}
                      onClick={() => toggleReason(reason.key)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border text-left transition-all active:scale-[0.97]",
                        selected
                          ? "border-destructive/40 bg-destructive/5 text-destructive"
                          : "border-border/40 hover:border-border text-foreground"
                      )}
                    >
                      <span className="text-base">{reason.emoji}</span>
                      <span className="text-xs font-medium">{reason.label}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observação adicional (opcional)</label>
                <Textarea
                  value={lossNote}
                  onChange={(e) => setLossNote(e.target.value)}
                  placeholder="Ex: Cliente disse que vai esperar para o próximo ano..."
                  className="text-base md:text-sm min-h-[60px] resize-none"
                  maxLength={500}
                />
              </div>
              <Button
                onClick={handleConfirmLoss}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
                disabled={selectedReasons.length === 0 && !lossNote.trim()}
              >
                Confirmar perda
              </Button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
