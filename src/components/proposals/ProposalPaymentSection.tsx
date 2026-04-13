import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard } from 'lucide-react';
import type { ProposalFormData } from '@/pages/NewProposal';

interface Props {
  form: ProposalFormData;
  updateForm: (u: Partial<ProposalFormData>) => void;
}

export function ProposalPaymentSection({ form, updateForm }: Props) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Informações de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Forma de Pagamento</Label>
            <Select value={form.payment_method} onValueChange={(v) => updateForm({ payment_method: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cfm">CFM</SelectItem>
                <SelectItem value="cred_window">Cred Window</SelectItem>
                <SelectItem value="compra_programada">Compra Programada</SelectItem>
                <SelectItem value="financiamento_banco">Financiamento via Banco</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">
              Validade da Proposta <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={form.validity_date}
              onChange={(e) => updateForm({ validity_date: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-sm">Condições de Pagamento</Label>
            <Textarea
              value={form.payment_conditions}
              onChange={(e) => updateForm({ payment_conditions: e.target.value })}
              placeholder="Ex: 30% de entrada, saldo na entrega"
              className="mt-1.5 min-h-[60px]"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-sm">Prazo de Entrega</Label>
            <Input
              value={form.delivery_deadline}
              onChange={(e) => updateForm({ delivery_deadline: e.target.value })}
              placeholder="Ex: 30 dias úteis"
              className="mt-1.5"
            />
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
