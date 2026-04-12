import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Package, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProposalFormData, ProposalItem } from '@/pages/NewProposal';

interface Props {
  form: ProposalFormData;
  updateForm: (u: Partial<ProposalFormData>) => void;
  subtotal: number;
  discountAmount: number;
  total: number;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProposalItemsSection({ form, updateForm, subtotal, discountAmount, total }: Props) {
  const updateItem = (id: string, updates: Partial<ProposalItem>) => {
    updateForm({
      items: form.items.map(i => i.id === id ? { ...i, ...updates } : i),
    });
  };

  const addItem = () => {
    updateForm({
      items: [...form.items, { id: crypto.randomUUID(), product_name: '', description: '', quantity: 1, unit_price: 0, discount: 0 }],
    });
  };

  const removeItem = (id: string) => {
    if (form.items.length <= 1) return;
    updateForm({ items: form.items.filter(i => i.id !== id) });
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Itens da Proposta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.items.map((item, idx) => {
          const itemSubtotal = (item.quantity * item.unit_price) - item.discount;
          return (
            <div key={item.id} className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Item {idx + 1}</span>
                {form.items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-sm">Produto/Serviço <span className="text-destructive">*</span></Label>
                <Input
                  value={item.product_name}
                  onChange={(e) => updateItem(item.id, { product_name: e.target.value })}
                  placeholder="Nome do produto ou serviço"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm">Descrição</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  placeholder="Detalhes adicionais (opcional)"
                  className="mt-1.5 min-h-[60px]"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm">Qtd <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                    className="mt-1.5"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label className="text-sm">Valor Un. <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unit_price || ''}
                    onChange={(e) => updateItem(item.id, { unit_price: Math.max(0, Number(e.target.value)) })}
                    placeholder="0,00"
                    className="mt-1.5"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <Label className="text-sm">Desconto</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.discount || ''}
                    onChange={(e) => updateItem(item.id, { discount: Math.max(0, Number(e.target.value)) })}
                    placeholder="0,00"
                    className="mt-1.5"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="text-right text-sm font-medium text-foreground">
                Subtotal: <span className="text-primary">{formatCurrency(Math.max(0, itemSubtotal))}</span>
              </div>
            </div>
          );
        })}

        <Button variant="outline" onClick={addItem} className="w-full border-dashed border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary font-semibold py-6 rounded-xl transition-all">
          <div className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm">Adicionar novo item</span>
          </div>
        </Button>

        {/* Totals */}
        <div className="border-t border-border/50 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <span className="text-sm text-muted-foreground shrink-0">Desconto global</span>
            <div className="flex items-center gap-2">
              <Select
                value={form.global_discount_type}
                onValueChange={(v: 'fixed' | 'percent') => updateForm({ global_discount_type: v })}
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">R$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.global_discount || ''}
                onChange={(e) => updateForm({ global_discount: Math.max(0, Number(e.target.value)) })}
                className="w-28 h-8 text-sm"
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Desconto aplicado</span>
              <span className="text-destructive font-medium">- {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-base font-bold text-foreground">Total da Proposta</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
