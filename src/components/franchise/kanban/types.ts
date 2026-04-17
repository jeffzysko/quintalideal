import type { LeadRow } from '@/lib/lead-constants';

export type LeadWithQuiz = LeadRow & {
  respostas_questionario?: Record<string, string> | null;
  valor_venda?: number | null;
};

export const COLUMNS = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'] as const;

const BUDGET_RANGES: Record<string, [number, number]> = {
  '30-50': [30000, 50000],
  '18-30': [18000, 30000],
  'ate-18': [5000, 18000],
};

/**
 * Returns the lead's value. Prefers real sale value (valor_venda) once concrete
 * data is available (closed sale or accepted proposal); otherwise falls back to
 * the estimate based on the budget question.
 */
export function estimateLeadValue(
  respostas: Record<string, string> | null,
  valorVenda?: number | null,
): number {
  if (typeof valorVenda === 'number' && valorVenda > 0) return valorVenda;
  if (!respostas?.orcamento) return 15000;
  const range = BUDGET_RANGES[respostas.orcamento];
  if (!range) return 15000;
  return (range[0] + range[1]) / 2;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
