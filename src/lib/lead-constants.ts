export const LEAD_STATUS_CONFIG = {
  novo: { label: 'Novo', badge: 'bg-muted text-muted-foreground border-border', dot: 'bg-gray-400', chart: 'hsl(199, 89%, 48%)' },
  contatado: { label: 'Contatado', badge: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', dot: 'bg-sky-500', chart: 'hsl(38, 92%, 50%)' },
  em_negociacao: { label: 'Em Negociação', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-500', chart: 'hsl(258, 90%, 66%)' },
  vendido: { label: 'Vendido', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500', chart: 'hsl(160, 84%, 39%)' },
  perdido: { label: 'Perdido', badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', dot: 'bg-red-500', chart: 'hsl(0, 84%, 60%)' },
} as const;

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => [k, v.label])
);

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => [k, v.badge])
);

export const STATUS_CHART_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => [k, v.chart])
);

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
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

export interface Franchise {
  id: string;
  nome_franquia: string;
}
