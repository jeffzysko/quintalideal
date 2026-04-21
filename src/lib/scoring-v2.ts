/**
 * Motor de Recomendação V2 — Quintal Ideal
 * Sistema de matching inteligente com scoring dinâmico por modelo.
 */

// ── Types ──

export interface QuizInputV2 {
  space_bucket: 'ate_3m' | '3_5m' | '5_7m' | '7m_plus';
  /** @deprecated Removed from quiz. Optional; default 'casa_propria' when absent. */
  home_status?: 'casa_propria' | 'construindo' | 'planejando';
  purchase_intent: '2026' | '2026_2027' | 'pesquisando';
  usage_profile: 'casal' | 'familia_pequena' | 'familia_grande' | 'amigos' | 'premium';
  budget_range: 'ate_18k' | '18_30k' | '30_50k';
  pool_preference: 'spa' | 'prainha' | 'classica' | 'indeciso';
  objective_main: 'relaxar' | 'familia' | 'social' | 'valorizar';
  cidade?: string;
}

export type CustomerProfile = 'RELAXADOR' | 'FAMILIA' | 'SOCIAL' | 'PREMIUM' | 'COMPACTO';

export type FitLevel = 'PERFEITO' | 'OTIMO' | 'BOM';

export interface PoolModelData {
  nome_modelo: string;
  categoria_tamanho: string;
  tamanho: string | null;
  preco_min: number | null;
  preco_max: number | null;
  possui_prainha: boolean | null;
  possui_spa: boolean | null;
  profundidade: number | null;
  comprimento: number | null;
  largura: number | null;
  descricao: string | null;
}

export interface ScoredModel {
  model: PoolModelData;
  score: number;
  spaceScore: number;
  budgetScore: number;
  usageScore: number;
  preferenceScore: number;
  objectiveScore: number;
  intentScore: number;
  profileBonus: number;
  specialBonus: number;
}

export interface RecommendedSize {
  label: string;
}

export interface PoolAlternativeV2 {
  model: PoolModelData;
  score: number;
  fitLevel: FitLevel;
  recommendedSize: RecommendedSize;
}

export interface RecommendationResultV2 {
  primary_model: PoolModelData;
  primary_score: number;
  fit_level: FitLevel;
  reasoning: string;
  closing_phrase: string;
  recommended_size: RecommendedSize;
  customer_profile: CustomerProfile;
  alternatives: PoolAlternativeV2[];
  upgrade_option: PoolAlternativeV2 | null;
  is_hot_lead: boolean;
  is_weak_recommendation: boolean;
  sales_script: string;
  legacy_score: number;
}

// ── Input Normalization ──

export function normalizeQuizToV2(answers: Record<string, string>): QuizInputV2 {
  const spaceMap: Record<string, QuizInputV2['space_bucket']> = {
    'ate-3': 'ate_3m', '3-5': '3_5m', '5-7': '5_7m', 'mais-7': '7m_plus',
  };
  const intentMap: Record<string, QuizInputV2['purchase_intent']> = {
    '2026': '2026', '2026-2027': '2026_2027', 'pesquisando': 'pesquisando',
  };
  const budgetMap: Record<string, QuizInputV2['budget_range']> = {
    'ate-18': 'ate_18k', '18-30': '18_30k', '30-50': '30_50k',
  };
  const prefMap: Record<string, QuizInputV2['pool_preference']> = {
    'prainha': 'prainha', 'spa': 'spa', 'simples': 'classica', 'nao-sei': 'indeciso',
  };

  const usoToProfile: Record<string, QuizInputV2['usage_profile']> = {
    'relaxar': 'casal', 'filhos': 'familia_pequena', 'familia': 'familia_grande',
    'amigos': 'amigos', 'valorizar': 'premium',
  };
  const usoToObjective: Record<string, QuizInputV2['objective_main']> = {
    'relaxar': 'relaxar', 'filhos': 'familia', 'familia': 'familia',
    'amigos': 'social', 'valorizar': 'valorizar',
  };

  const usoAnswer = answers.uso || '';

  return {
    space_bucket: spaceMap[answers.espaco] || 'ate_3m',
    purchase_intent: intentMap[answers.intencao] || 'pesquisando',
    usage_profile: usoToProfile[usoAnswer] || 'casal',
    budget_range: budgetMap[answers.orcamento] || 'ate_18k',
    pool_preference: prefMap[answers.preferencia] || 'indeciso',
    objective_main: usoToObjective[usoAnswer] || 'relaxar',
    cidade: answers.cidade,
  };
}

// ── Profile Detection ──

export function detectCustomerProfile(input: QuizInputV2): CustomerProfile {
  if (input.budget_range === '30_50k' && input.space_bucket === '7m_plus') return 'PREMIUM';
  if (input.budget_range === '30_50k' && input.objective_main === 'valorizar') return 'PREMIUM';
  if (input.space_bucket === 'ate_3m') return 'COMPACTO';
  if (input.space_bucket === '3_5m' && input.budget_range === 'ate_18k') return 'COMPACTO';
  if (input.objective_main === 'relaxar') return 'RELAXADOR';
  if (input.pool_preference === 'spa') return 'RELAXADOR';
  if (input.usage_profile === 'casal' && input.pool_preference !== 'prainha') return 'RELAXADOR';
  if (input.usage_profile === 'amigos') return 'SOCIAL';
  if (input.objective_main === 'social') return 'SOCIAL';
  if (input.usage_profile === 'familia_pequena' || input.usage_profile === 'familia_grande') return 'FAMILIA';
  if (input.objective_main === 'familia') return 'FAMILIA';
  return 'FAMILIA';
}

// ── Budget helpers ──

const BUDGET_RANGES: Record<QuizInputV2['budget_range'], { min: number; max: number }> = {
  'ate_18k': { min: 0, max: 18000 },
  '18_30k': { min: 18000, max: 30000 },
  '30_50k': { min: 30000, max: 50000 },
};

// ── Space compatibility ──

const SPACE_MAX_COMPRIMENTO: Record<QuizInputV2['space_bucket'], number> = {
  'ate_3m': 3.5, '3_5m': 5.5, '5_7m': 7.5, '7m_plus': 999,
};

// ── CAMADA A: Hard Filter (brand-agnostic, attribute-based) ──

export function filterModels(models: PoolModelData[], input: QuizInputV2): PoolModelData[] {
  const maxSpace = SPACE_MAX_COMPRIMENTO[input.space_bucket];
  const budget = BUDGET_RANGES[input.budget_range];

  return models.filter(m => {
    // Attribute-based: model length must fit (with small tolerance via scoring)
    if (m.comprimento != null && m.comprimento > maxSpace * 1.15) return false;

    // Models with prainha need decent length: avoid in tiny spaces (<3m) when prainha is preferred and model is too long
    if (input.space_bucket === 'ate_3m' && input.pool_preference === 'prainha' && m.possui_prainha && m.comprimento != null && m.comprimento > 3.5) {
      return false;
    }

    // Flexible budget: allow up to +35% above for upgrade consideration
    if (m.preco_min != null && m.preco_min > budget.max * 1.35) return false;

    return true;
  });
}

// ── CAMADA C: Score per model ──

function scoreSpace(model: PoolModelData, input: QuizInputV2): number {
  const maxSpace = SPACE_MAX_COMPRIMENTO[input.space_bucket];
  const modelLen = model.comprimento ?? 0;

  if (modelLen === 0) return 14; // unknown = neutral
  if (modelLen <= maxSpace * 0.7) return 28;
  if (modelLen <= maxSpace) return 21;
  if (modelLen <= maxSpace * 1.15) return 10;
  return -999;
}

function scoreBudget(model: PoolModelData, input: QuizInputV2): number {
  const budget = BUDGET_RANGES[input.budget_range];
  if (model.preco_min == null || model.preco_max == null) return 14; // Unknown price = neutral

  // Has versions within budget
  if (model.preco_min <= budget.max && model.preco_max >= budget.min) return 22;
  // Up to +20% above budget
  if (model.preco_min <= budget.max * 1.2) return 16;
  // Up to +35% above budget
  if (model.preco_min <= budget.max * 1.35) return 8;
  return -999;
}

// Categorize model by size attributes (brand-agnostic)
function modelSizeBucket(model: PoolModelData): 'compact' | 'medium' | 'large' | 'xlarge' {
  const len = model.comprimento ?? 0;
  if (len > 0) {
    if (len <= 3.5) return 'compact';
    if (len <= 5.5) return 'medium';
    if (len <= 7.5) return 'large';
    return 'xlarge';
  }
  // Fallback to categoria_tamanho enum
  const cat = (model.categoria_tamanho || '').toLowerCase();
  if (cat.includes('peq') || cat === 'p') return 'compact';
  if (cat.includes('med') || cat === 'm') return 'medium';
  if (cat.includes('gra') || cat === 'g') return 'large';
  return 'xlarge';
}

function scoreUsage(model: PoolModelData, input: QuizInputV2): number {
  const bucket = modelSizeBucket(model);

  switch (input.usage_profile) {
    case 'familia_grande':
      if (bucket === 'large' || bucket === 'xlarge') return 20;
      if (bucket === 'medium') return 14;
      return 6;
    case 'familia_pequena':
      if (bucket === 'medium' || bucket === 'large') return 20;
      return 12;
    case 'amigos':
      if (bucket === 'large' || bucket === 'xlarge') return 20;
      if (model.possui_prainha) return 16;
      return 10;
    case 'casal':
      if (bucket === 'compact' || bucket === 'medium') return 20;
      if (model.possui_spa) return 16;
      return 8;
    case 'premium':
      if (model.possui_spa || model.possui_prainha) return 20;
      if (bucket === 'large' || bucket === 'xlarge') return 16;
      return 10;
  }
}

function scorePreference(model: PoolModelData, input: QuizInputV2): number {
  if (input.pool_preference === 'indeciso') return 6;

  if (input.pool_preference === 'prainha') {
    if (model.possui_prainha) return 12;
    return 4;
  }
  if (input.pool_preference === 'spa') {
    if (model.possui_spa) return 12;
    return 4;
  }
  // Classica: prefer models without prainha/spa (cleaner classic shape)
  if (input.pool_preference === 'classica') {
    if (!model.possui_prainha && !model.possui_spa) return 12;
    return 6;
  }
  return 4;
}

// ── Objective Score ──

function scoreObjective(model: PoolModelData, input: QuizInputV2): number {
  const bucket = modelSizeBucket(model);
  const hasPremiumFeatures = !!(model.possui_spa || model.possui_prainha);
  const priceMax = model.preco_max ?? 0;

  switch (input.objective_main) {
    case 'valorizar': {
      let s = 4;
      if (hasPremiumFeatures) s += 5;
      if (bucket === 'large' || bucket === 'xlarge') s += 4;
      if (priceMax >= 35000) s += 3;
      return Math.min(15, s);
    }
    case 'familia':
      if (bucket === 'medium' || bucket === 'large') return 12;
      return 6;
    case 'social':
      if (bucket === 'large' || bucket === 'xlarge') return 12;
      if (model.possui_prainha) return 10;
      return 6;
    case 'relaxar':
      if (model.possui_spa) return 12;
      if (bucket === 'compact' || bucket === 'medium') return 10;
      return 6;
  }
}

function scoreIntent(model: PoolModelData, input: QuizInputV2): number {
  const budget = BUDGET_RANGES[input.budget_range];
  const isAffordable = model.preco_min != null && model.preco_min <= budget.max;

  switch (input.purchase_intent) {
    case '2026': return isAffordable ? 6 : 3;
    case '2026_2027': return 4;
    case 'pesquisando': return 2;
    default: return 2;
  }
}

function profileBonus(model: PoolModelData, profile: CustomerProfile): number {
  const bucket = modelSizeBucket(model);
  const hasPremium = !!(model.possui_spa || model.possui_prainha);

  switch (profile) {
    case 'RELAXADOR':
      if (model.possui_spa) return 10;
      if (bucket === 'compact' || bucket === 'medium') return 6;
      return 0;
    case 'FAMILIA':
      if (bucket === 'medium' || bucket === 'large') return 10;
      return 0;
    case 'SOCIAL':
      if (bucket === 'large' || bucket === 'xlarge') return 10;
      if (model.possui_prainha) return 7;
      return 0;
    case 'PREMIUM':
      if (hasPremium && (bucket === 'large' || bucket === 'xlarge')) return 10;
      if (hasPremium || bucket === 'xlarge') return 7;
      return 0;
    case 'COMPACTO':
      if (bucket === 'compact') return 10;
      if (bucket === 'medium') return 5;
      return 0;
  }
}

function specialBonus(model: PoolModelData, input: QuizInputV2): number {
  let bonus = 0;
  const bucket = modelSizeBucket(model);

  // Rule 1: Compact + relax → small pools (with spa bonus)
  if (
    (input.space_bucket === 'ate_3m' || input.space_bucket === '3_5m') &&
    input.objective_main === 'relaxar' &&
    bucket === 'compact'
  ) {
    bonus += 15;
    if (model.possui_spa) bonus += 5;
  }

  // Rule 2: Large space + high budget + premium attributes → premium boost
  if (
    input.space_bucket === '7m_plus' &&
    input.budget_range === '30_50k' &&
    (bucket === 'xlarge' || bucket === 'large') &&
    (model.possui_spa || model.possui_prainha)
  ) {
    bonus += 15;
  }

  // Rule 3: Sofisticação compacta — small space, premium objective, mid+ budget
  if (
    input.space_bucket === '3_5m' &&
    input.objective_main === 'valorizar' &&
    input.budget_range !== 'ate_18k' &&
    bucket === 'compact' &&
    (model.possui_spa || model.possui_prainha || (model.preco_max ?? 0) >= 25000)
  ) {
    bonus += 10;
  }

  // Rule 4: Family + controlled budget → medium/large affordable models
  if (
    (input.usage_profile === 'familia_pequena' || input.usage_profile === 'familia_grande') &&
    (input.budget_range === 'ate_18k' || input.budget_range === '18_30k') &&
    (bucket === 'medium' || bucket === 'large') &&
    model.preco_min != null && model.preco_min <= 25000
  ) {
    bonus += 8;
  }

  // Rule 5: Valorizar — boost premium-featured models
  if (input.objective_main === 'valorizar') {
    if (model.possui_spa || model.possui_prainha) bonus += 8;
    if ((model.preco_max ?? 0) >= 35000) bonus += 5;
    if (bucket === 'large' || bucket === 'xlarge') bonus += 3;
  }

  return bonus;
}

export function calculateModelScore(model: PoolModelData, input: QuizInputV2, profile: CustomerProfile): ScoredModel {
  const ss = scoreSpace(model, input);
  const bs = scoreBudget(model, input);
  const us = scoreUsage(model, input);
  const ps = scorePreference(model, input);
  const os = scoreObjective(model, input);
  const is_ = scoreIntent(model, input);
  const pb = profileBonus(model, profile);
  const sb = specialBonus(model, input);

  const rawScore = ss + bs + us + ps + os + is_ + pb + sb;

  return {
    model,
    score: Math.min(100, Math.max(0, rawScore)),
    spaceScore: ss,
    budgetScore: bs,
    usageScore: us,
    preferenceScore: ps,
    objectiveScore: os,
    intentScore: is_,
    profileBonus: pb,
    specialBonus: sb,
  };
}

// ── CAMADA D: Ranking ──

export function rankModels(scoredModels: ScoredModel[]): ScoredModel[] {
  return [...scoredModels]
    .filter(m => m.spaceScore > -999 && m.budgetScore > -999)
    .sort((a, b) => b.score - a.score);
}

// ── Fit Level ──

export function getFitLevel(score: number): FitLevel | null {
  if (score >= 90) return 'PERFEITO';
  if (score >= 75) return 'OTIMO';
  if (score >= 60) return 'BOM';
  return null;
}

export function getFitLevelLabel(fitLevel: FitLevel, lang: 'pt' | 'es' = 'pt'): string {
  const labels: Record<FitLevel, Record<string, string>> = {
    'PERFEITO': { pt: 'Encaixe Perfeito', es: 'Ajuste Perfecto' },
    'OTIMO': { pt: 'Ótima Escolha', es: 'Excelente Opción' },
    'BOM': { pt: 'Boa Opção', es: 'Buena Opción' },
  };
  return labels[fitLevel]?.[lang] || labels[fitLevel]?.pt || '';
}

export function getFitLevelEmoji(fitLevel: FitLevel): string {
  switch (fitLevel) {
    case 'PERFEITO': return '🏆';
    case 'OTIMO': return '⭐';
    case 'BOM': return '👍';
  }
}

// ── Size Recommendation ──

const MODEL_SIZES: Record<string, { space: string; sizes: string[] }[]> = {
  'Tortuga': [
    { space: '5_7m', sizes: ['5,00 x 2,30m', '7,00 x 3,30m'] },
    { space: '7m_plus', sizes: ['7,00 x 3,30m', '9,00 x 3,30m', '10,00 x 3,30m'] },
  ],
  'Tradicional': [
    { space: 'ate_3m', sizes: ['3,50 x 2,00m'] },
    { space: '3_5m', sizes: ['3,50 x 2,00m', '5,00 x 2,50m'] },
    { space: '5_7m', sizes: ['5,00 x 2,50m', '6,00 x 2,50m', '7,00 x 2,75m'] },
    { space: '7m_plus', sizes: ['7,00 x 2,75m', '8,00 x 2,75m', '9,00 x 2,75m'] },
  ],
  'Italiana': [
    { space: 'ate_3m', sizes: ['2,50 x 1,80m', '3,00 x 2,00m'] },
    { space: '3_5m', sizes: ['3,00 x 2,00m', '4,00 x 2,40m'] },
    { space: '5_7m', sizes: ['5,00 x 2,50m', '6,00 x 2,80m'] },
    { space: '7m_plus', sizes: ['6,00 x 2,80m', '8,00 x 2,80m'] },
  ],
  'Navagio': [
    { space: 'ate_3m', sizes: ['3,25 x 2,25m'] },
    { space: '3_5m', sizes: ['3,25 x 2,25m'] },
  ],
  'Nassau': [
    { space: '3_5m', sizes: ['4,00 x 3,00m'] },
    { space: '5_7m', sizes: ['4,00 x 3,00m'] },
    { space: '7m_plus', sizes: ['4,00 x 3,00m'] },
  ],
  'Bonaire': [
    { space: 'ate_3m', sizes: ['3,00 x 2,00m'] },
    { space: '3_5m', sizes: ['3,00 x 2,00m', '4,00 x 2,50m'] },
    { space: '5_7m', sizes: ['5,00 x 2,50m', '6,00 x 3,00m'] },
    { space: '7m_plus', sizes: ['6,00 x 3,00m', '8,00 x 3,00m'] },
  ],
  'Cancún': [
    { space: 'ate_3m', sizes: ['3,00 x 2,00m'] },
    { space: '3_5m', sizes: ['3,00 x 2,00m', '4,00 x 2,50m'] },
    { space: '5_7m', sizes: ['5,00 x 2,50m', '6,00 x 3,00m'] },
    { space: '7m_plus', sizes: ['6,00 x 3,00m', '8,00 x 3,50m', '10,00 x 3,50m'] },
  ],
  'Tropical': [
    { space: 'ate_3m', sizes: ['3,50 x 2,00m'] },
    { space: '3_5m', sizes: ['3,50 x 2,00m', '4,50 x 2,40m'] },
    { space: '5_7m', sizes: ['5,00 x 2,50m', '6,00 x 2,60m'] },
    { space: '7m_plus', sizes: ['6,00 x 2,60m', '8,00 x 2,80m', '10,00 x 2,80m'] },
  ],
  'Atalaia': [
    { space: '7m_plus', sizes: ['7,00 x 4,00m', '9,00 x 4,00m'] },
  ],
  'Farol da Barra': [
    { space: '3_5m', sizes: ['4,00 x 2,50m'] },
    { space: '5_7m', sizes: ['5,00 x 2,50m', '6,00 x 3,00m'] },
    { space: '7m_plus', sizes: ['6,00 x 3,00m', '8,00 x 3,50m', '10,00 x 3,50m'] },
  ],
};

export function recommendBestSize(modelName: string, input: QuizInputV2): RecommendedSize {
  const entries = MODEL_SIZES[modelName];
  if (!entries) return { label: '' };

  const match = entries.find(e => e.space === input.space_bucket);
  const bucketOrder: QuizInputV2['space_bucket'][] = ['ate_3m', '3_5m', '5_7m', '7m_plus'];
  const idx = bucketOrder.indexOf(input.space_bucket);

  let sizes: string[] = [];
  if (match) {
    sizes = match.sizes;
  } else {
    for (let i = idx - 1; i >= 0; i--) {
      const fallback = entries.find(e => e.space === bucketOrder[i]);
      if (fallback) { sizes = fallback.sizes; break; }
    }
    if (!sizes.length) {
      for (let i = idx + 1; i < bucketOrder.length; i++) {
        const fallback = entries.find(e => e.space === bucketOrder[i]);
        if (fallback) { sizes = fallback.sizes; break; }
      }
    }
  }

  if (!sizes.length) return { label: '' };

  if (input.budget_range === 'ate_18k') return { label: sizes[0] };
  if (input.budget_range === '18_30k') return { label: sizes[Math.min(1, sizes.length - 1)] };
  return { label: sizes[sizes.length - 1] };
}

// ── Reasoning Text ──

const PROFILE_LABELS: Record<CustomerProfile, Record<string, string>> = {
  'RELAXADOR': { pt: 'relaxamento e bem-estar', es: 'relajación y bienestar' },
  'FAMILIA': { pt: 'família e convivência', es: 'familia y convivencia' },
  'SOCIAL': { pt: 'momentos sociais e celebrações', es: 'momentos sociales y celebraciones' },
  'PREMIUM': { pt: 'sofisticação e valorização', es: 'sofisticación y valorización' },
  'COMPACTO': { pt: 'praticidade e bom aproveitamento', es: 'practicidad y buen aprovechamiento' },
};

const SPACE_LABELS: Record<QuizInputV2['space_bucket'], Record<string, string>> = {
  'ate_3m': { pt: 'até 3 metros', es: 'hasta 3 metros' },
  '3_5m': { pt: 'entre 3 e 5 metros', es: 'entre 3 y 5 metros' },
  '5_7m': { pt: 'entre 5 e 7 metros', es: 'entre 5 y 7 metros' },
  '7m_plus': { pt: 'mais de 7 metros', es: 'más de 7 metros' },
};

const OBJECTIVE_LABELS: Record<QuizInputV2['objective_main'], Record<string, string>> = {
  'relaxar': { pt: 'relaxar e descansar', es: 'relajarse y descansar' },
  'familia': { pt: 'curtir mais a família', es: 'disfrutar más en familia' },
  'social': { pt: 'receber amigos e celebrar', es: 'recibir amigos y celebrar' },
  'valorizar': { pt: 'valorizar seu imóvel', es: 'valorizar tu inmueble' },
};

export function generateReasoning(modelName: string, input: QuizInputV2, profile: CustomerProfile, lang: 'pt' | 'es' = 'pt'): string {
  const space = SPACE_LABELS[input.space_bucket]?.[lang] || '';
  const profileLabel = PROFILE_LABELS[profile]?.[lang] || '';
  const objective = OBJECTIVE_LABELS[input.objective_main]?.[lang] || '';

  if (input.objective_main === 'valorizar') {
    if (lang === 'es') {
      return `Elegimos la ${modelName} porque aprovecha muy bien tu espacio de ${space}, atiende tu objetivo de ${objective} y entrega un excelente equilibrio entre confort y funcionalidad. Además, este modelo trae un visual sofisticado y contribuye a valorizar aún más el ambiente de tu casa.`;
    }
    return `Escolhemos a ${modelName} porque ela aproveita muito bem o seu espaço de ${space}, atende ao seu objetivo de ${objective} e entrega um excelente equilíbrio entre conforto e funcionalidade. Além disso, esse modelo traz um visual sofisticado e contribui para valorizar ainda mais o ambiente da sua casa.`;
  }

  if (lang === 'es') {
    return `Elegimos la ${modelName} porque aprovecha muy bien tu espacio de ${space}, tu perfil indica ${profileLabel} y es una elección muy alineada con tu objetivo de ${objective}. Entrega un excelente equilibrio entre confort y funcionalidad.`;
  }

  return `Escolhemos a ${modelName} porque ela aproveita muito bem o seu espaço de ${space}, seu perfil indica ${profileLabel} e é uma escolha muito alinhada ao seu objetivo de ${objective}. Entrega um excelente equilíbrio entre conforto e funcionalidade.`;
}

// ── Hot Lead Detection ──

export function detectHotLead(input: QuizInputV2, score: number): boolean {
  if (input.purchase_intent !== '2026') return false;
  if (score < 85) return false;

  const budget = BUDGET_RANGES[input.budget_range];
  // Considered hot if budget is at least mid-range or space is significant
  if (budget.max >= 18000 || input.space_bucket === '5_7m' || input.space_bucket === '7m_plus') {
    return true;
  }

  return false;
}

// ── Sales Script Generation ──

const USAGE_LABELS_SCRIPT: Record<QuizInputV2['objective_main'], Record<string, string>> = {
  'relaxar': { pt: 'relaxar e curtir momentos de descanso', es: 'relajarse y disfrutar momentos de descanso' },
  'familia': { pt: 'aproveitar mais a família', es: 'disfrutar más la familia' },
  'social': { pt: 'receber amigos e celebrar', es: 'recibir amigos y celebrar' },
  'valorizar': { pt: 'valorizar a casa', es: 'valorizar la casa' },
};

const MODEL_BENEFITS: Record<string, Record<string, string>> = {
  'Supreme': { pt: 'entrega SPA e prainha integrados com acabamento premium', es: 'entrega SPA y playa integrados con acabado premium' },
  'Borda Infinita': { pt: 'tem borda infinita e prainha em um design sofisticado e compacto', es: 'tiene borde infinito y playa en un diseño sofisticado y compacto' },
  'Compacta Premium': { pt: 'é moderna, compacta e com porcelana inclusa em todas as versões', es: 'es moderna, compacta y con porcelana incluida en todas las versiones' },
  'Prainha': { pt: 'tem prainha integrada com ótimo aproveitamento do espaço', es: 'tiene playa integrada con excelente aprovechamiento del espacio' },
  'Retangular': { pt: 'oferece grande versatilidade e ampla gama de tamanhos e acabamentos', es: 'ofrece gran versatilidad y amplia gama de tamaños y acabados' },
  'Elegance': { pt: 'tem bordas pastilhadas e hidromassagem com visual diferenciado', es: 'tiene bordes pastillados e hidromasaje con visual diferenciado' },
  'Family': { pt: 'é o modelo mais popular, com ótima adaptabilidade', es: 'es el modelo más popular, con excelente adaptabilidad' },
  'Confort': { pt: 'é completa para relaxar em família com boa amplitude de tamanhos', es: 'es completa para relajarse en familia con buena amplitud de tamaños' },
  'Retangular Plus': { pt: 'tem banco com hidro e escadas integrados, ideal para convivência', es: 'tiene banco con hidro y escaleras integrados, ideal para convivencia' },
  'Versátil': { pt: 'oferece ótimo custo-benefício com bom aproveitamento de espaço', es: 'ofrece excelente costo-beneficio con buen aprovechamiento de espacio' },
};

export function generateSalesScript(leadName: string, input: QuizInputV2, modelName: string, lang: 'pt' | 'es' = 'pt'): string {
  const firstName = leadName?.split(' ')[0] || '';
  const uso = USAGE_LABELS_SCRIPT[input.objective_main]?.[lang] || '';
  const benefit = MODEL_BENEFITS[modelName]?.[lang] || (lang === 'es' ? 'se adapta perfectamente a lo que buscas' : 'se encaixa perfeitamente no que você busca');

  if (lang === 'es') {
    return `Hola ${firstName}, vi que estás buscando una piscina para ${uso}. La ${modelName} que sugerimos es perfecta porque ${benefit}. Se adapta muy bien a tu espacio y atiende exactamente lo que buscas.`;
  }

  return `Oi ${firstName}, vi que você está buscando uma piscina para ${uso}. A ${modelName} que sugerimos é perfeita porque ${benefit}. Ela se encaixa muito bem no seu espaço e atende exatamente o que você busca.`;
}

// ── Legacy Score (backward compat) ──

export function calculateLegacyScore(input: QuizInputV2): number {
  let score = 0;
  switch (input.space_bucket) {
    case '7m_plus': score += 35; break;
    case '5_7m': score += 26; break;
    case '3_5m': score += 18; break;
    case 'ate_3m': score += 10; break;
  }
  switch (input.purchase_intent) {
    case '2026': score += 15; break;
    case '2026_2027': score += 9; break;
    case 'pesquisando': score += 4; break;
  }
  switch (input.usage_profile) {
    case 'familia_grande': score += 15; break;
    case 'amigos': score += 13; break;
    case 'familia_pequena': score += 11; break;
    case 'premium': score += 15; break;
    case 'casal': score += 9; break;
  }
  switch (input.budget_range) {
    case '30_50k': score += 20; break;
    case '18_30k': score += 12; break;
    case 'ate_18k': score += 5; break;
  }
  // Normalize to 0-100 (max possible without moradia: 35+15+15+20 = 85)
  // Scale up so a perfect quiz still reads ~100%.
  return Math.min(100, Math.round((score / 85) * 100));
}

// ── Main Recommendation Function ──

export function recommendPoolsV2(input: QuizInputV2, allModels: PoolModelData[]): RecommendationResultV2 {
  const profile = detectCustomerProfile(input);

  const eligible = filterModels(allModels, input);
  const scored = eligible.map(m => calculateModelScore(m, input, profile));
  const ranked = rankModels(scored);

  const primary = ranked[0];
  const primaryScore = primary?.score || 0;
  const primaryModel = primary?.model || allModels[0];
  const isWeak = primaryScore < 70;
  const primaryFitLevel = primary ? (getFitLevel(primary.score) || 'BOM') : 'BOM';

  const recommendedSize = recommendBestSize(primaryModel.nome_modelo, input);
  const reasoning = generateReasoning(primaryModel.nome_modelo, input, profile);
  const closingPhrase = generateClosingPhrase(input);

  // Diverse alternatives: filter out same-category models
  const alternatives: PoolAlternativeV2[] = selectDiverseAlternatives(ranked, primaryModel, isWeak ? 3 : 2);

  // Upgrade: model slightly above budget with high perceived value (within +20%)
  let upgrade_option: PoolAlternativeV2 | null = null;
  const budget = BUDGET_RANGES[input.budget_range];
  if (input.budget_range !== '30_50k') {
    const upgradeCandidate = ranked.find(m =>
      m.model.nome_modelo !== primaryModel.nome_modelo &&
      m.model.preco_min != null &&
      m.model.preco_min > budget.max &&
      m.model.preco_min <= budget.max * 1.2 &&
      m.score >= 55
    );
    if (upgradeCandidate) {
      upgrade_option = {
        model: upgradeCandidate.model,
        score: upgradeCandidate.score,
        fitLevel: getFitLevel(upgradeCandidate.score) || 'BOM',
        recommendedSize: recommendBestSize(upgradeCandidate.model.nome_modelo, input),
      };
    }
  }

  const isHot = detectHotLead(input, primaryScore);
  const salesScript = generateSalesScript('', input, primaryModel.nome_modelo);

  return {
    primary_model: primaryModel,
    primary_score: primaryScore,
    fit_level: primaryFitLevel,
    reasoning,
    closing_phrase: closingPhrase,
    recommended_size: recommendedSize,
    customer_profile: profile,
    alternatives,
    upgrade_option,
    is_hot_lead: isHot,
    is_weak_recommendation: isWeak,
    sales_script: salesScript,
    legacy_score: calculateLegacyScore(input),
  };
}

// ── Diverse Alternatives Selection ──

function selectDiverseAlternatives(ranked: ScoredModel[], primaryModel: PoolModelData, count: number): PoolAlternativeV2[] {
  const result: PoolAlternativeV2[] = [];
  const usedCategories = new Set<string>();
  const primaryKey = `${primaryModel.categoria_tamanho}-${primaryModel.possui_spa}-${primaryModel.possui_prainha}`;
  usedCategories.add(primaryKey);

  for (const m of ranked) {
    if (result.length >= count) break;
    if (m.model.nome_modelo === primaryModel.nome_modelo) continue;
    if (m.score < 40) continue;

    const key = `${m.model.categoria_tamanho}-${m.model.possui_spa}-${m.model.possui_prainha}`;
    // Prefer diverse categories, but allow same category if we can't find enough
    const isDiverse = !usedCategories.has(key);

    if (isDiverse || result.length < count - 1) {
      result.push({
        model: m.model,
        score: m.score,
        fitLevel: getFitLevel(m.score) || 'BOM',
        recommendedSize: recommendBestSize(m.model.nome_modelo, { ...({} as QuizInputV2), space_bucket: 'ate_3m', home_status: 'casa_propria', purchase_intent: 'pesquisando', usage_profile: 'casal', budget_range: 'ate_18k', pool_preference: 'indeciso', objective_main: 'relaxar' }),
      });
      usedCategories.add(key);
    }
  }

  return result;
}

// ── Closing Phrase ──

const CLOSING_PHRASES_PT = [
  'Pelo que você nos contou, essa é uma escolha muito segura e assertiva para o seu perfil.',
  'Se você busca exatamente isso, essa é uma das melhores decisões para o seu espaço.',
  'Esse modelo atende muito bem o que você procura e tende a ser uma escolha extremamente satisfatória.',
  'Com base no seu perfil, temos muita confiança de que essa é a opção certa para você.',
  'Essa recomendação foi pensada especialmente para o que você busca — aproveite!',
];

const CLOSING_PHRASES_ES = [
  'Según lo que nos contaste, esta es una elección muy segura y acertada para tu perfil.',
  'Si buscas exactamente esto, esta es una de las mejores decisiones para tu espacio.',
  'Este modelo atiende muy bien lo que buscas y tiende a ser una elección extremadamente satisfactoria.',
];

export function generateClosingPhrase(input: QuizInputV2, lang: 'pt' | 'es' = 'pt'): string {
  const phrases = lang === 'es' ? CLOSING_PHRASES_ES : CLOSING_PHRASES_PT;
  // Deterministic selection based on input to avoid randomness on re-renders
  const idx = (input.space_bucket.length + input.objective_main.length + input.usage_profile.length) % phrases.length;
  return phrases[idx];
}
