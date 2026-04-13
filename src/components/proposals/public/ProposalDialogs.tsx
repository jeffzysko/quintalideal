import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REFUSE_REASONS, type ProposalData } from './ProposalShared';

interface AcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acceptName: string;
  setAcceptName: (v: string) => void;
  onAccept: () => void;
  submitting: boolean;
}

export function AcceptDialog({ open, onOpenChange, acceptName, setAcceptName, onAccept, submitting }: AcceptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setAcceptName(''); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Confirmar aceite</DialogTitle>
          <DialogDescription>Digite seu nome completo para confirmar a aceitação desta proposta.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Seu nome completo" value={acceptName} onChange={(e) => setAcceptName(e.target.value)} className="rounded-xl" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={onAccept} disabled={!acceptName.trim() || submitting}
            className="bg-gradient-to-r from-success to-success/80 text-success-foreground rounded-xl font-bold">
            {submitting ? 'Enviando...' : 'Confirmar Aceite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RefuseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refuseReason: string;
  setRefuseReason: (v: string) => void;
  customRefuseReason: string;
  setCustomRefuseReason: (v: string) => void;
  onRefuse: () => void;
  submitting: boolean;
}

export function RefuseDialog({ open, onOpenChange, refuseReason, setRefuseReason, customRefuseReason, setCustomRefuseReason, onRefuse, submitting }: RefuseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setRefuseReason(''); setCustomRefuseReason(''); } }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Recusar proposta</DialogTitle>
          <DialogDescription>Nos ajude a melhorar. Qual o motivo da recusa?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {REFUSE_REASONS.map((r) => (
            <Button key={r} variant={refuseReason === r ? 'default' : 'outline'} size="sm" className="rounded-xl"
              onClick={() => { setRefuseReason(r); if (r !== 'Outro') setCustomRefuseReason(''); }}>{r}</Button>
          ))}
        </div>
        {refuseReason === 'Outro' && (
          <Textarea placeholder="Descreva o motivo..." value={customRefuseReason} onChange={(e) => setCustomRefuseReason(e.target.value)} className="rounded-xl" />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button variant="destructive" onClick={onRefuse} className="rounded-xl font-bold"
            disabled={(!refuseReason || (refuseReason === 'Outro' && !customRefuseReason.trim())) || submitting}>
            {submitting ? 'Enviando...' : 'Confirmar Recusa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionText: string;
  setQuestionText: (v: string) => void;
  onQuestion: () => void;
  submitting: boolean;
}

export function QuestionDialog({ open, onOpenChange, questionText, setQuestionText, onQuestion, submitting }: QuestionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuestionText(''); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">💬 Enviar dúvida</DialogTitle>
          <DialogDescription>Escreva sua pergunta e o vendedor responderá em breve.</DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Qual sua dúvida sobre esta proposta?" value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} className="rounded-xl" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={onQuestion} disabled={!questionText.trim() || submitting}
            className="rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold">
            {submitting ? 'Enviando...' : 'Enviar Dúvida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NegotiateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiateItem: string;
  setNegotiateItem: (v: string) => void;
  negotiateValue: string;
  setNegotiateValue: (v: string) => void;
  negotiateMessage: string;
  setNegotiateMessage: (v: string) => void;
  onNegotiate: () => void;
  submitting: boolean;
  items: ProposalData['items'];
}

export function NegotiateDialog({ open, onOpenChange, negotiateItem, setNegotiateItem, negotiateValue, setNegotiateValue, negotiateMessage, setNegotiateMessage, onNegotiate, submitting, items }: NegotiateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setNegotiateItem(''); setNegotiateValue(''); setNegotiateMessage(''); } }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">🔄 Propor Ajuste</DialogTitle>
          <DialogDescription>Selecione o item que deseja negociar e descreva sua contraproposta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-foreground">Item (opcional)</label>
            <Select value={negotiateItem} onValueChange={setNegotiateItem}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Selecione um item..." /></SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.product_name}>{item.product_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Valor proposto (opcional)</label>
            <Input type="number" placeholder="R$ 0,00" value={negotiateValue} onChange={(e) => setNegotiateValue(e.target.value)} className="mt-1 rounded-xl" />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground">Sua proposta *</label>
            <Textarea placeholder="Ex: Consigo fechar se o prazo de entrega for de 30 dias..." value={negotiateMessage} onChange={(e) => setNegotiateMessage(e.target.value)} rows={3} className="mt-1 rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={onNegotiate} disabled={!negotiateMessage.trim() || submitting}
            className="rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold">
            {submitting ? 'Enviando...' : 'Enviar Proposta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
