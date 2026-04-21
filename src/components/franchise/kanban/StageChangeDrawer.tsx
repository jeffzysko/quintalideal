import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { COLUMNS } from './types';
import { ArrowLeft, HelpCircle, DollarSign, PartyPopper } from 'lucide-react';

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
  onConfirm: (leadId: string, newStatus: string, extra?: { lossReason?: string; valorVenda?: number }) => void;
}) {
  const [step, setStep] = useState<'select' | 'loss_reason' | 'sale_value'>('select');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [lossNote, setLossNote] = useState('');
  const [saleValueInput, setSaleValueInput] = useState('');

  const resetAndClose = () => {
    setStep('select');
    setSelectedReasons([]);
    setLossNote('');
    setSaleValueInput('');
    onOpenChange(false);
  };

  const handleSelectStage = (status: string) => {
    if (!leadId) return;
    if (status === 'perdido') {
      setStep('loss_reason');
    } else if (status === 'vendido') {
      setStep('sale_value');
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
    onConfirm(leadId, 'perdido', { lossReason });
    resetAndClose();
  };

  const parsedSaleValue = (() => {
    const cleaned = saleValueInput.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  })();

  const handleConfirmSale = () => {
    if (!leadId) return;
    if (parsedSaleValue <= 0) return;
    onConfirm(leadId, 'vendido', { valorVenda: parsedSaleValue });
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
        {step === 'select' && (
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
                      <p className="text-xs text-muted-foreground mt-0.5">{descriptions[status]}</p>
                    </div>
                    {isActive && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary shrink-0 mt-0.5">
                        Atual
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'loss_reason' && (
          <>
            <DrawerHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('select')} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <DrawerTitle className="text-base">Por que este lead foi perdido?</DrawerTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[220px]">Registrar o motivo ajuda a entender o que melhorar no processo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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

        {step === 'sale_value' && (
          <>
            <DrawerHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('select')} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <PartyPopper className="w-4 h-4 text-emerald-600" />
                    <DrawerTitle className="text-base">Qual o valor total da venda?</DrawerTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Esse valor substitui a estimativa do lead e alimenta os relatórios de receita.
                  </p>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Valor da venda (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={saleValueInput}
                    onChange={(e) => setSaleValueInput(e.target.value)}
                    placeholder="Ex: 35.000,00"
                    className="pl-9 text-base md:text-sm h-11"
                  />
                </div>
                {parsedSaleValue > 0 && (
                  <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                    {parsedSaleValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                )}
              </div>
              <Button
                onClick={handleConfirmSale}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                disabled={parsedSaleValue <= 0}
              >
                <PartyPopper className="w-4 h-4" />
                Registrar venda
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Se houver uma proposta aceita vinculada, o valor é atualizado automaticamente pelo sistema.
              </p>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
