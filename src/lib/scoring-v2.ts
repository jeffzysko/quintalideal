/**
 * Motor de Recomendação V2 — Quintal Ideal
 * Sistema de matching inteligente com scoring dinâmico por modelo.
 */

// ── Types ──

export interface QuizInputV2 {
  space_bucket: 'ate_3m' | '3_5m' | '5_7m' | '7m_plus';
  home_status: 'casa_propria' | 'construindo' | 'planejando';
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
  intentScore: number;
  profileBonus: number;
  specialBonus: number;
}

export interface RecommendedSize {
  label: string;
  comprimento?: number;
  largura?: number;
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
  recommended_size: RecommendedSize;
  customer_profile: CustomerProfile;
  alternatives: PoolAlternativeV2[];
  upgrade_option: PoolAlternativeV2 | null;
  /** Legacy score for backward compat (0-100) */
  legacy_score: number;
}

// ── Normalization: map old quiz values to V2 input ──

export function normalizeQuizToV2(answers: Record<string, string>): QuizInputV2 {
  const spaceMap: Record<string, QuizInputV2['space_bucket']> = {
    'ate-3': 'ate_3m', '3-5': '3_5m', '5-7': '5_7m', 'mais-7': '7m_plus',
  };
  const homeMap: Record<string, QuizInputV2['home_status']> = {
    'minha': 'casa_propria', 'construindo': 'construindo', 'planejando': 'planejando',
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

  // Combined uso question maps to both usage_profile and objective_main
  const usoToProfile: Record<string, QuizInputV2['usage_profile']> = {
    'relaxar': 'casal',
    'filhos': 'familia_pequena',
    'familia': 'familia_grande',
    'amigos': 'amigos',
    'valorizar': 'premium',
  };
  const usoToObjective: Record<string, QuizInputV2['objective_main']> = {
    'relaxar': 'relaxar',
    'filhos': 'familia',
    'familia': 'familia',
    'amigos': 'social',
    'valorizar': 'valorizar',
  };

  const usoAnswer = answers.uso || '';

  return {
    space_bucket: spaceMap[answers.espaco] || 'ate_3m',
    home_status: homeMap[answers.moradia] || 'casa_propria',
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
  // PREMIUM first (most specific)
  if (input.budget_range === '30_50k' && input.space_bucket === '7m_plus') return 'PREMIUM';
  if (input.budget_range === '30_50k' && input.objective_main === 'valorizar') return 'PREMIUM';

  // COMPACTO
  if (input.space_bucket === 'ate_3m') return 'COMPACTO';
  if (input.space_bucket === '3_5m' && input.budget_range === 'ate_18k') return 'COMPACTO';

  // RELAXADOR
  if (input.objective_main === 'relaxar') return 'RELAXADOR';
  if (input.pool_preference === 'spa') return 'RELAXADOR';
  if (input.usage_profile === 'casal' && input.pool_preference !== 'prainha') return 'RELAXADOR';

  // SOCIAL
  if (input.usage_profile === 'amigos') return 'SOCIAL';
  if (input.objective_main === 'social') return 'SOCIAL';

  // FAMILIA (default for family usage)
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

/** Min comprimento required per space bucket */
const SPACE_MAX_COMPRIMENTO: Record<QuizInputV2['space_bucket'], number> = {
  'ate_3m': 3.5,
  '3_5m': 5.5,
  '5_7m': 7.5,
  '7m_plus': 999,
};

/** Models known to start at certain min sizes */
const MODEL_MIN_SPACE: Record<string, number> = {
  'Tortuga': 5.0,
  'Atalaia': 7.0,
  'Farol da Barra': 4.0,
};

// ── CAMADA A: Hard Filter ──

export function filterModels(models: PoolModelData[], input: QuizInputV2): PoolModelData[] {
  const maxSpace = SPACE_MAX_COMPRIMENTO[input.space_bucket];
  const budget = BUDGET_RANGES[input.budget_range];

  return models.filter(m => {
    // Space check: model must have a version that fits
    const minSpace = MODEL_MIN_SPACE[m.nome_modelo];
    if (minSpace && minSpace > maxSpace) return false;

    // Special rule: prainha in small space, exclude Tortuga
    if (input.space_bucket === 'ate_3m' && input.pool_preference === 'prainha' && m.nome_modelo === 'Tortuga') {
      return false;
    }

    // Budget check: allow models slightly above budget (for upgrade), eliminate clearly out of range
    if (m.preco_min != null && m.preco_min > budget.max * 1.5) return false;

    return true;
  });
}

// ── CAMADA C: Score per model ──

function scoreSpace(model: PoolModelData, input: QuizInputV2): number {
  const maxSpace = SPACE_MAX_COMPRIMENTO[input.space_bucket];
  const minSpace = MODEL_MIN_SPACE[model.nome_modelo] || 0;
  const modelMin = model.comprimento ? Math.min(model.comprimento, minSpace || model.comprimento) : minSpace;

  // Model fits perfectly
  if (modelMin <= maxSpace * 0.7) return 30;
  // Fits but at the limit
  if (modelMin <= maxSpace) return 22;
  // Partially fits
  if (modelMin <= maxSpace * 1.2) return 10;
  return -999;
}

function scoreBudget(model: PoolModelData, input: QuizInputV2): number {
  const budget = BUDGET_RANGES[input.budget_range];
  if (model.preco_min == null || model.preco_max == null) return 15; // Unknown price = neutral

  // Has versions within budget
  if (model.preco_min <= budget.max && model.preco_max >= budget.min) return 25;
  // Only larger/premium versions available (slightly above)
  if (model.preco_min <= budget.max * 1.3) return 15;
  return -999;
}

const USAGE_AFFINITY: Record<QuizInputV2['usage_profile'], string[]> = {
  'familia_grande': ['Tradicional', 'Bonaire', 'Tropical', 'Tortuga'],
  'familia_pequena': ['Tradicional', 'Tropical', 'Italiana', 'Bonaire'],
  'amigos': ['Cancún', 'Tropical', 'Atalaia', 'Tradicional'],
  'casal': ['Navagio', 'Nassau', 'Italiana', 'Tradicional'],
  'premium': ['Atalaia', 'Nassau', 'Bonaire', 'Navagio', 'Tradicional'],
};

function scoreUsage(model: PoolModelData, input: QuizInputV2): number {
  const favored = USAGE_AFFINITY[input.usage_profile] || [];
  if (favored.includes(model.nome_modelo)) return 20;
  return 10;
}

const PREFERENCE_AFFINITY: Record<QuizInputV2['pool_preference'], string[]> = {
  'prainha': ['Tortuga', 'Nassau', 'Atalaia', 'Tradicional'],
  'spa': ['Navagio', 'Tradicional', 'Atalaia', 'Bonaire'],
  'classica': ['Italiana', 'Tropical', 'Cancún', 'Tradicional', 'Farol da Barra'],
  'indeciso': [],
};

function scorePreference(model: PoolModelData, input: QuizInputV2): number {
  if (input.pool_preference === 'indeciso') return 8; // Neutral
  const favored = PREFERENCE_AFFINITY[input.pool_preference] || [];
  if (favored.includes(model.nome_modelo)) return 15;

  // Also check actual features
  if (input.pool_preference === 'prainha' && model.possui_prainha) return 12;
  if (input.pool_preference === 'spa' && model.possui_spa) return 12;

  return 5;
}

function scoreIntent(model: PoolModelData, input: QuizInputV2): number {
  const budget = BUDGET_RANGES[input.budget_range];
  const isAffordable = model.preco_min != null && model.preco_min <= budget.max;

  switch (input.purchase_intent) {
    case '2026':
      return isAffordable ? 10 : 5;
    case '2026_2027':
      return 6;
    case 'pesquisando':
      return 3;
    default:
      return 3;
  }
}

const PROFILE_AFFINITY: Record<CustomerProfile, string[]> = {
  'RELAXADOR': ['Navagio', 'Nassau', 'Tradicional'],
  'FAMILIA': ['Tradicional', 'Bonaire', 'Tropical', 'Tortuga'],
  'SOCIAL': ['Cancún', 'Tropical', 'Atalaia', 'Tradicional'],
  'PREMIUM': ['Atalaia', 'Nassau', 'Bonaire', 'Navagio', 'Tradicional'],
  'COMPACTO': ['Italiana', 'Navagio', 'Tropical', 'Cancún'],
};

function profileBonus(model: PoolModelData, profile: CustomerProfile): number {
  const favored = PROFILE_AFFINITY[profile] || [];
  return favored.includes(model.nome_modelo) ? 10 : 0;
}

function specialBonus(model: PoolModelData, input: QuizInputV2): number {
  let bonus = 0;

  // Rule 1: Navagio relax compacta
  if (
    (input.space_bucket === 'ate_3m' || input.space_bucket === '3_5m') &&
    input.objective_main === 'relaxar' &&
    model.nome_modelo === 'Navagio'
  ) {
    bonus += 20;
  }

  // Rule 3: Premium grande
  if (
    input.space_bucket === '7m_plus' &&
    input.budget_range === '30_50k' &&
    model.nome_modelo === 'Atalaia'
  ) {
    bonus += 15;
  }

  // Rule 4: Sofisticação compacta
  if (
    input.space_bucket === '3_5m' &&
    input.objective_main === 'valorizar' &&
    input.budget_range !== 'ate_18k' &&
    ['Nassau', 'Navagio', 'Bonaire'].includes(model.nome_modelo)
  ) {
    bonus += 10;
  }

  // Rule 5: Família orçamento controlado
  if (
    (input.usage_profile === 'familia_pequena' || input.usage_profile === 'familia_grande') &&
    (input.budget_range === 'ate_18k' || input.budget_range === '18_30k') &&
    ['Tradicional', 'Tropical', 'Italiana', 'Cancún'].includes(model.nome_modelo)
  ) {
    bonus += 8;
  }

  // Rule 6: Valorizar — boost premium/sophisticated models
  if (input.objective_main === 'valorizar') {
    const premiumModels = ['Atalaia', 'Nassau', 'Bonaire', 'Navagio', 'Tradicional'];
    if (premiumModels.includes(model.nome_modelo)) {
      bonus += 10;
    }
    // Extra boost for models with premium features
    if (model.possui_spa || model.possui_prainha) {
      bonus += 5;
    }
  }

  return bonus;
}

export function calculateModelScore(model: PoolModelData, input: QuizInputV2, profile: CustomerProfile): ScoredModel {
  const ss = scoreSpace(model, input);
  const bs = scoreBudget(model, input);
  const us = scoreUsage(model, input);
  const ps = scorePreference(model, input);
  const is_ = scoreIntent(model, input);
  const pb = profileBonus(model, profile);
  const sb = specialBonus(model, input);

  const rawScore = ss + bs + us + ps + is_ + pb + sb;

  return {
    model,
    score: Math.min(100, Math.max(0, rawScore)),
    spaceScore: ss,
    budgetScore: bs,
    usageScore: us,
    preferenceScore: ps,
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

  // Find best match for space bucket
  const match = entries.find(e => e.space === input.space_bucket);
  // Fallback to nearest smaller bucket
  const bucketOrder: QuizInputV2['space_bucket'][] = ['ate_3m', '3_5m', '5_7m', '7m_plus'];
  const idx = bucketOrder.indexOf(input.space_bucket);

  let sizes: string[] = [];
  if (match) {
    sizes = match.sizes;
  } else {
    // Try smaller buckets
    for (let i = idx - 1; i >= 0; i--) {
      const fallback = entries.find(e => e.space === bucketOrder[i]);
      if (fallback) { sizes = fallback.sizes; break; }
    }
    // Try larger buckets
    if (!sizes.length) {
      for (let i = idx + 1; i < bucketOrder.length; i++) {
        const fallback = entries.find(e => e.space === bucketOrder[i]);
        if (fallback) { sizes = fallback.sizes; break; }
      }
    }
  }

  if (!sizes.length) return { label: '' };

  // Budget-aware: prefer smaller (cheaper) sizes for lower budgets
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

const PREFERENCE_LABELS: Record<QuizInputV2['pool_preference'], Record<string, string>> = {
  'prainha': { pt: 'prainha', es: 'playa' },
  'spa': { pt: 'spa e hidromassagem', es: 'spa e hidromasaje' },
  'classica': { pt: 'piscina clássica', es: 'piscina clásica' },
  'indeciso': { pt: 'uma piscina versátil', es: 'una piscina versátil' },
};

const OBJECTIVE_LABELS: Record<QuizInputV2['objective_main'], Record<string, string>> = {
  'relaxar': { pt: 'relaxar e descansar', es: 'relajarse y descansar' },
  'familia': { pt: 'curtir mais a família', es: 'disfrutar más en familia' },
  'social': { pt: 'receber amigos e celebrar', es: 'recibir amigos y celebrar' },
  'valorizar': { pt: 'valorizar seu imóvel', es: 'valorizar tu inmueble' },
};

export function generateReasoning(modelName: string, input: QuizInputV2, profile: CustomerProfile, lang: 'pt' | 'es' = 'pt'): string {
  const space = SPACE_LABELS[input.space_bucket]?.[lang] || '';
  const pref = PREFERENCE_LABELS[input.pool_preference]?.[lang] || '';
  const profileLabel = PROFILE_LABELS[profile]?.[lang] || '';
  const objective = OBJECTIVE_LABELS[input.objective_main]?.[lang] || '';

  if (lang === 'es') {
    return `Elegimos la ${modelName} porque tu espacio de ${space} se adapta muy bien a este modelo, demostraste interés por ${pref} y tu perfil indica ${profileLabel}. Es una elección muy alineada con tu objetivo de ${objective}.`;
  }

  return `Escolhemos a ${modelName} porque seu espaço de ${space} comporta muito bem esse modelo, você demonstrou interesse por ${pref} e seu perfil indica ${profileLabel}. É uma escolha muito alinhada ao seu objetivo de ${objective}.`;
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
  switch (input.home_status) {
    case 'casa_propria': score += 15; break;
    case 'construindo': score += 11; break;
    case 'planejando': score += 6; break;
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
    case 'casal': score += 9; break;
  }
  switch (input.budget_range) {
    case '30_50k': score += 20; break;
    case '18_30k': score += 12; break;
    case 'ate_18k': score += 5; break;
  }
  return score;
}

// ── Main Recommendation Function ──

export function recommendPoolsV2(input: QuizInputV2, allModels: PoolModelData[]): RecommendationResultV2 {
  const profile = detectCustomerProfile(input);

  // Camada A: Hard filter
  const eligible = filterModels(allModels, input);

  // Camada C: Score each model
  const scored = eligible.map(m => calculateModelScore(m, input, profile));

  // Camada D: Rank
  const ranked = rankModels(scored);

  // Select primary (must have fit level)
  const primary = ranked[0];
  const primaryFitLevel = primary ? (getFitLevel(primary.score) || 'BOM') : 'BOM';

  const primaryModel = primary?.model || allModels[0];
  const primaryScore = primary?.score || 0;

  // Size recommendation
  const recommendedSize = recommendBestSize(primaryModel.nome_modelo, input);

  // Reasoning
  const reasoning = generateReasoning(primaryModel.nome_modelo, input, profile);

  // Alternatives: next 2 models with different names
  const alternatives: PoolAlternativeV2[] = ranked
    .slice(1)
    .filter(m => m.model.nome_modelo !== primaryModel.nome_modelo && m.score >= 40)
    .slice(0, 2)
    .map(m => ({
      model: m.model,
      score: m.score,
      fitLevel: getFitLevel(m.score) || 'BOM',
      recommendedSize: recommendBestSize(m.model.nome_modelo, input),
    }));

  // Upgrade option: model slightly above budget with high perceived value
  let upgrade_option: PoolAlternativeV2 | null = null;
  const budget = BUDGET_RANGES[input.budget_range];
  if (input.budget_range !== '30_50k') {
    // Look for models just above budget with high score
    const upgradeCandidate = ranked.find(m =>
      m.model.nome_modelo !== primaryModel.nome_modelo &&
      m.model.preco_min != null &&
      m.model.preco_min > budget.max &&
      m.model.preco_min <= budget.max * 1.4 &&
      m.score >= 60
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

  return {
    primary_model: primaryModel,
    primary_score: primaryScore,
    fit_level: primaryFitLevel,
    reasoning,
    recommended_size: recommendedSize,
    customer_profile: profile,
    alternatives,
    upgrade_option,
    legacy_score: calculateLegacyScore(input),
  };
}
