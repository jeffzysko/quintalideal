import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
import type { ProposalFormData } from '@/pages/NewProposal';

interface ProposalScoreProps {
  form: ProposalFormData;
  subtotal: number;
}

interface Suggestion {
  text: string;
  type: 'warning' | 'tip' | 'success';
}

function calculateScore(form: ProposalFormData, _subtotal: number): { score: number; suggestions: Suggestion[] } {
  let score = 0;
  const suggestions: Suggestion[] = [];
  const max = 100;

  // Items with description (20 pts)
  const itemsWithDesc = form.items.filter(i => i.description.trim().length > 0).length;
  const itemsTotal = form.items.filter(i => i.product_name.trim().length > 0).length;
  if (itemsTotal > 0) {
    const descRatio = itemsWithDesc / itemsTotal;
    score += Math.round(descRatio * 20);
    if (descRatio < 1) {
      suggestions.push({ text: 'Adicione descrições a todos os itens para maior clareza', type: 'warning' });
    } else {
      suggestions.push({ text: 'Todos os itens possuem descrição — ótimo!', type: 'success' });
    }
  }

  // Validity date (15 pts)
  if (form.validity_date) {
    score += 15;
    suggestions.push({ text: 'Data de validade definida', type: 'success' });
  } else {
    suggestions.push({ text: 'Defina uma data de validade para criar urgência', type: 'warning' });
  }

  // Payment conditions (15 pts)
  if (form.payment_conditions.trim().length > 10) {
    score += 15;
    suggestions.push({ text: 'Condições de pagamento detalhadas', type: 'success' });
  } else if (form.payment_conditions.trim()) {
    score += 8;
    suggestions.push({ text: 'Detalhe mais as condições de pagamento', type: 'tip' });
  } else {
    suggestions.push({ text: 'Adicione condições de pagamento para transparência', type: 'warning' });
  }

  // Payment method (10 pts)
  if (form.payment_method) {
    score += 10;
  } else {
    suggestions.push({ text: 'Informe a forma de pagamento', type: 'warning' });
  }

  // Delivery deadline (10 pts)
  if (form.delivery_deadline.trim()) {
    score += 10;
    suggestions.push({ text: 'Prazo de entrega definido', type: 'success' });
  } else {
    suggestions.push({ text: 'Defina um prazo de entrega para alinhar expectativas', type: 'tip' });
  }

  // Video URL (10 pts) — uses extended form field
  if ((form as any).video_url?.trim()) {
    score += 10;
    suggestions.push({ text: 'Vídeo de apresentação adicionado — diferencial competitivo!', type: 'success' });
  } else {
    suggestions.push({ text: 'Propostas com vídeo têm taxa de aceite 40% maior', type: 'tip' });
  }

  // Discount configured (5 pts)
  if (form.global_discount > 0 || form.items.some(i => i.discount > 0)) {
    score += 5;
  }

  // Observations (10 pts)
  if (form.observations.trim().length > 20) {
    score += 10;
    suggestions.push({ text: 'Observações detalhadas', type: 'success' });
  } else if (form.observations.trim()) {
    score += 5;
    suggestions.push({ text: 'Enriqueça as observações com mais detalhes', type: 'tip' });
  } else {
    suggestions.push({ text: 'Adicione observações para personalizar a proposta', type: 'tip' });
  }

  // Client document (5 pts)
  if (form.client_document.trim()) {
    score += 5;
  }

  return { score: Math.min(score, max), suggestions };
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 71) return { label: 'Proposta Excelente', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (score >= 41) return { label: 'Proposta Boa', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
  return { label: 'Proposta Fraca', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
}

export function ProposalScore({ form, subtotal }: ProposalScoreProps) {
  const { score, suggestions } = calculateScore(form, subtotal);
  const { label, color } = getScoreLabel(score);

  const iconMap = {
    warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />,
    tip: <Lightbulb className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />,
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Score da Proposta
          <Badge className={`${color} border-0 text-[10px] ml-auto`}>{label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-foreground">{score}</span>
          <div className="flex-1">
            <Progress value={score} className="h-2.5" />
          </div>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>

        <div className="space-y-2">
          {suggestions.filter(s => s.type !== 'success').map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              {iconMap[s.type]}
              <span>{s.text}</span>
            </div>
          ))}
          {suggestions.filter(s => s.type === 'success').slice(0, 3).map((s, i) => (
            <div key={`s-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
              {iconMap[s.type]}
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Standalone version for ProposalDetail (read-only, from DB data)
export function ProposalScoreReadonly({ proposal, items }: {
  proposal: {
    payment_method: string | null;
    payment_conditions: string | null;
    validity_date: string | null;
    delivery_deadline: string | null;
    observations: string | null;
    global_discount: number;
    video_url?: string | null;
  };
  items: Array<{ product_name: string; description: string | null; discount: number }>;
}) {
  const mockForm: ProposalFormData = {
    lead_id: null,
    person_type: 'pf',
    client_name: 'x',
    client_document: '',
    client_contact_name: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    items: items.map(i => ({
      id: '',
      product_name: i.product_name,
      description: i.description || '',
      quantity: 1,
      unit_price: 0,
      discount: i.discount,
    })),
    payment_method: proposal.payment_method || '',
    payment_conditions: proposal.payment_conditions || '',
    validity_date: proposal.validity_date || '',
    delivery_deadline: proposal.delivery_deadline || '',
    status: 'rascunho',
    global_discount: Number(proposal.global_discount) || 0,
    global_discount_type: 'fixed',
    observations: proposal.observations || '',
    video_url: (proposal as any).video_url || '',
  } as any;

  return <ProposalScore form={mockForm} subtotal={0} />;
}
