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
  novo: 'hsl(199, 89%, 48%)',
  contatado: 'hsl(38, 92%, 50%)',
  em_negociacao: 'hsl(258, 90%, 66%)',
  vendido: 'hsl(160, 84%, 39%)',
  perdido: 'hsl(0, 84%, 60%)',
};

export const TERRITORY_LABELS: Record<string, string> = {
  matched_unique_franchise: 'Cidade exclusiva',
  matched_multiple_franchises: 'Múltiplas franquias',
  kept_with_origin_franchise: 'Mantido com origem',
  no_city_match_found: 'Sem cobertura',
};

export const TERRITORY_COLORS: Record<string, string> = {
  matched_unique_franchise: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  matched_multiple_franchises: 'bg-amber-50 text-amber-700 border-amber-200',
  kept_with_origin_franchise: 'bg-primary/10 text-primary border-primary/20',
  no_city_match_found: 'bg-red-50 text-red-700 border-red-200',
};

export interface LeadRow {
  id: string;
  nome: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  modelo_vendido: string | null;
  status_lead: string;
  created_at: string;
  franquia_id: string | null;
  origin_franchise_id: string | null;
  territory_match_status: string | null;
  coverage_match_count: number | null;
  distribution_rule_used: string | null;
  telefone: string | null;
  email: string | null;
  ref_code: string | null;
  referred_by: string | null;
  lead_origin?: string;
}

export interface Franchise {
  id: string;
  nome_franquia: string;
}
