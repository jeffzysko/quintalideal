import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { COLUMNS, type LeadWithQuiz } from './types';
import { X, ArrowRightLeft, MessageCircle, UserPlus, Send, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsAppSend } from '@/hooks/useWhatsAppSend';

interface BulkActionsBarProps {
  selectedIds: string[];
  leads: LeadWithQuiz[];
  franchiseId: string;
  profiles: { user_id: string; full_name: string | null }[];
  whatsAppPlanActive: boolean;
  onClearSelection: () => void;
  onMoveLeads: (ids: string[], status: string) => Promise<void>;
}

export function BulkActionsBar({
  selectedIds,
  leads,
  franchiseId,
  profiles,
  whatsAppPlanActive,
  onClearSelection,
  onMoveLeads,
}: BulkActionsBarProps) {
  const [moveStage, setMoveStage] = useState<string>('');
  const [assignTo, setAssignTo] = useState<string>('');
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const queryClient = useQueryClient();

  if (selectedIds.length === 0) return null;

  const selectedLeads = leads.filter(l => selectedIds.includes(l.id));

  const handleMove = async () => {
    if (!moveStage) return;
    await onMoveLeads(selectedIds, moveStage);
    setMoveStage('');
    onClearSelection();
  };

  const handleAssign = async () => {
    if (!assignTo) return;
    const results = await Promise.allSettled(
      selectedIds.map(id =>
        supabase.from('leads').update({ assigned_to: assignTo }).eq('id', id)
      )
    );
    const success = results.filter(r => r.status === 'fulfilled').length;
    toast.success(`Responsavel atualizado para ${success} leads`);
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });
    setAssignTo('');
    onClearSelection();
  };

  return (
    <>
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/60 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-in">
        <span className="text-sm font-semibold whitespace-nowrap">
          {selectedIds.length} lead{selectedIds.length > 1 ? 's' : ''} selecionado{selectedIds.length > 1 ? 's' : ''}
        </span>

        <div className="h-6 w-px bg-border/50" />

        <div className="flex items-center gap-1.5">
          <Select value={moveStage} onValueChange={setMoveStage}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <ArrowRightLeft className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Mover para..." />
            </SelectTrigger>
            <SelectContent>
              {COLUMNS.map(s => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CHART_COLORS[s] }} />
                    {STATUS_LABELS[s]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {moveStage && (
            <Button size="sm" className="h-8 text-xs" onClick={handleMove}>Mover</Button>
          )}
        </div>

        {whatsAppPlanActive && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setMessageModalOpen(true)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Enviar mensagem
          </Button>
        )}

        {profiles.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <UserPlus className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Atribuir..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name || p.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignTo && (
              <Button size="sm" className="h-8 text-xs" onClick={handleAssign}>Atribuir</Button>
            )}
          </div>
        )}

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-1"
          aria-label="Desmarcar todos"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <BulkMessageModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        leads={selectedLeads}
        franchiseId={franchiseId}
        onDone={onClearSelection}
      />
    </>
  );
}

function BulkMessageModal({
  open,
  onOpenChange,
  leads,
  franchiseId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leads: LeadWithQuiz[];
  franchiseId: string;
  onDone: () => void;
}) {
  const [message, setMessage] = useState('');
  const [personalize, setPersonalize] = useState(true);
  const [sending, setSending] = useState(false);
  const { sendViaZapi } = useWhatsAppSend();

  const withPhone = leads.filter(l => l.telefone);
  const withoutPhone = leads.filter(l => !l.telefone);

  const handleSend = async () => {
    if (!message.trim() || withPhone.length === 0) return;
    setSending(true);

    const results = await Promise.allSettled(
      withPhone.map(lead => {
        const finalMsg = personalize
          ? message.replace(/\{nome\}/g, lead.nome || 'Cliente')
          : message;
        return sendViaZapi({
          phone: lead.telefone!,
          message: finalMsg,
          lead_id: lead.id,
          franchise_id: franchiseId,
        });
      })
    );

    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    setSending(false);
    toast.success(`Mensagens enviadas para ${success} de ${withPhone.length} leads`);
    onOpenChange(false);
    setMessage('');
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar mensagem em massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
            {withPhone.map(l => (
              <div key={l.id} className="flex items-center gap-2">
                <MessageCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate">{l.nome || 'Sem nome'}</span>
                <span className="text-muted-foreground text-xs">{l.telefone}</span>
              </div>
            ))}
            {withoutPhone.map(l => (
              <div key={l.id} className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span className="truncate">{l.nome || 'Sem nome'}</span>
                <span className="text-xs">sem telefone</span>
              </div>
            ))}
          </div>

          {withoutPhone.length > 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {withoutPhone.length} lead{withoutPhone.length > 1 ? 's' : ''} sem telefone sera{withoutPhone.length > 1 ? 'o' : ''} ignorado{withoutPhone.length > 1 ? 's' : ''}.
            </p>
          )}

          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Digite sua mensagem... Use {nome} para personalizar"
            className="min-h-[100px]"
            maxLength={500}
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="personalize"
              checked={personalize}
              onCheckedChange={(c) => setPersonalize(!!c)}
            />
            <label htmlFor="personalize" className="text-sm">
              Personalizar com o nome do lead
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || withPhone.length === 0 || sending}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Enviando...' : `Confirmar envio para ${withPhone.length} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
