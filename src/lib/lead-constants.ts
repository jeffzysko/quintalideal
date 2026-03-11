export const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  em_negociacao: 'Em Negociação',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

export const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-primary/10 text-primary border-primary/20',
  contatado: 'bg-amber-50 text-amber-700 border-amber-200',
  em_negociacao: 'bg-violet-50 text-violet-700 border-violet-200',
  vendido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perdido: 'bg-red-50 text-red-700 border-red-200',
};

export const STATUS_CHART_COLORS: Record<string, string> = {
  novo: '#0ea5e9',
  contatado: '#f59e0b',
  em_negociacao: '#8b5cf6',
  vendido: '#10b981',
  perdido: '#ef4444',
};

export interface LeadRow {
  id: string;
  nome: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  status_lead: string;
  created_at: string;
  franquia_id: string | null;
  telefone: string | null;
  email: string | null;
  ref_code: string | null;
  referred_by: string | null;
}

export interface Franchise {
  id: string;
  nome_franquia: string;
}
