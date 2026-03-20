import { describe, it, expect } from "vitest";
import {
  normalizeQuizToV2,
  detectCustomerProfile,
  calculateModelScore,
  filterModels,
  rankModels,
  getFitLevel,
  recommendPoolsV2,
  type QuizInputV2,
  type PoolModelData,
} from "@/lib/scoring-v2";

// ── Helper: base quiz answers ──
const baseAnswers = (overrides: Record<string, string> = {}): Record<string, string> => ({
  espaco: '3-5',
  moradia: 'minha',
  intencao: '2026',
  uso: 'relaxar',
  orcamento: '18-30',
  preferencia: 'spa',
  cidade: 'São Paulo',
  ...overrides,
});

// ── Helper: mock pool model ──
const mockModel = (overrides: Partial<PoolModelData> = {}): PoolModelData => ({
  nome_modelo: 'Tradicional',
  categoria_tamanho: 'media',
  tamanho: '5,00 x 2,50m',
  preco_min: 15000,
  preco_max: 35000,
  possui_prainha: false,
  possui_spa: false,
  profundidade: 1.3,
  comprimento: 5,
  largura: 2.5,
  descricao: null,
  ...overrides,
});

const allMockModels: PoolModelData[] = [
  mockModel({ nome_modelo: 'Tradicional', preco_min: 12000, preco_max: 40000 }),
  mockModel({ nome_modelo: 'Navagio', preco_min: 18000, preco_max: 25000, comprimento: 3.25, largura: 2.25 }),
  mockModel({ nome_modelo: 'Nassau', preco_min: 25000, preco_max: 35000, possui_prainha: true, comprimento: 4, largura: 3 }),
  mockModel({ nome_modelo: 'Italiana', preco_min: 10000, preco_max: 30000, comprimento: 3, largura: 2 }),
  mockModel({ nome_modelo: 'Tortuga', preco_min: 20000, preco_max: 45000, possui_prainha: true, comprimento: 5, largura: 2.3 }),
  mockModel({ nome_modelo: 'Atalaia', preco_min: 35000, preco_max: 50000, possui_spa: true, possui_prainha: true, comprimento: 7, largura: 4 }),
  mockModel({ nome_modelo: 'Bonaire', preco_min: 14000, preco_max: 38000, possui_spa: true, comprimento: 3, largura: 2 }),
  mockModel({ nome_modelo: 'Cancún', preco_min: 12000, preco_max: 35000, comprimento: 3, largura: 2 }),
  mockModel({ nome_modelo: 'Tropical', preco_min: 11000, preco_max: 32000, comprimento: 3.5, largura: 2 }),
  mockModel({ nome_modelo: 'Farol da Barra', preco_min: 15000, preco_max: 40000, comprimento: 4, largura: 2.5 }),
];

// ═══════════════════════════════════════════
// 1. normalizeQuizToV2 — mapeamento uso+objetivo
// ═══════════════════════════════════════════

describe('normalizeQuizToV2 — mapeamento combinado uso+objetivo', () => {
  it('relaxar → usage_profile=casal, objective_main=relaxar', () => {
    const result = normalizeQuizToV2(baseAnswers({ uso: 'relaxar' }));
    expect(result.usage_profile).toBe('casal');
    expect(result.objective_main).toBe('relaxar');
  });

  it('filhos → usage_profile=familia_pequena, objective_main=familia', () => {
    const result = normalizeQuizToV2(baseAnswers({ uso: 'filhos' }));
    expect(result.usage_profile).toBe('familia_pequena');
    expect(result.objective_main).toBe('familia');
  });

  it('familia → usage_profile=familia_grande, objective_main=familia', () => {
    const result = normalizeQuizToV2(baseAnswers({ uso: 'familia' }));
    expect(result.usage_profile).toBe('familia_grande');
    expect(result.objective_main).toBe('familia');
  });

  it('amigos → usage_profile=amigos, objective_main=social', () => {
    const result = normalizeQuizToV2(baseAnswers({ uso: 'amigos' }));
    expect(result.usage_profile).toBe('amigos');
    expect(result.objective_main).toBe('social');
  });

  it('valorizar → usage_profile=premium, objective_main=valorizar', () => {
    const result = normalizeQuizToV2(baseAnswers({ uso: 'valorizar' }));
    expect(result.usage_profile).toBe('premium');
    expect(result.objective_main).toBe('valorizar');
  });

  it('valor desconhecido → fallback casal/relaxar', () => {
    const result = normalizeQuizToV2(baseAnswers({ uso: 'xyz' }));
    expect(result.usage_profile).toBe('casal');
    expect(result.objective_main).toBe('relaxar');
  });
});

// ═══════════════════════════════════════════
// 2. normalizeQuizToV2 — outros campos
// ═══════════════════════════════════════════

describe('normalizeQuizToV2 — campos gerais', () => {
  it('mapeia espaço corretamente', () => {
    expect(normalizeQuizToV2(baseAnswers({ espaco: 'ate-3' })).space_bucket).toBe('ate_3m');
    expect(normalizeQuizToV2(baseAnswers({ espaco: '3-5' })).space_bucket).toBe('3_5m');
    expect(normalizeQuizToV2(baseAnswers({ espaco: '5-7' })).space_bucket).toBe('5_7m');
    expect(normalizeQuizToV2(baseAnswers({ espaco: 'mais-7' })).space_bucket).toBe('7m_plus');
  });

  it('mapeia orçamento corretamente', () => {
    expect(normalizeQuizToV2(baseAnswers({ orcamento: 'ate-18' })).budget_range).toBe('ate_18k');
    expect(normalizeQuizToV2(baseAnswers({ orcamento: '18-30' })).budget_range).toBe('18_30k');
    expect(normalizeQuizToV2(baseAnswers({ orcamento: '30-50' })).budget_range).toBe('30_50k');
  });

  it('mapeia preferência corretamente', () => {
    expect(normalizeQuizToV2(baseAnswers({ preferencia: 'prainha' })).pool_preference).toBe('prainha');
    expect(normalizeQuizToV2(baseAnswers({ preferencia: 'spa' })).pool_preference).toBe('spa');
    expect(normalizeQuizToV2(baseAnswers({ preferencia: 'simples' })).pool_preference).toBe('classica');
    expect(normalizeQuizToV2(baseAnswers({ preferencia: 'nao-sei' })).pool_preference).toBe('indeciso');
  });
});

// ═══════════════════════════════════════════
// 3. detectCustomerProfile
// ═══════════════════════════════════════════

describe('detectCustomerProfile', () => {
  it('PREMIUM — orçamento alto + espaço grande', () => {
    const input: QuizInputV2 = { space_bucket: '7m_plus', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'casal', budget_range: '30_50k', pool_preference: 'spa', objective_main: 'relaxar' };
    expect(detectCustomerProfile(input)).toBe('PREMIUM');
  });

  it('PREMIUM — orçamento alto + valorizar', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'premium', budget_range: '30_50k', pool_preference: 'classica', objective_main: 'valorizar' };
    expect(detectCustomerProfile(input)).toBe('PREMIUM');
  });

  it('COMPACTO — espaço até 3m', () => {
    const input: QuizInputV2 = { space_bucket: 'ate_3m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'familia_pequena', budget_range: '18_30k', pool_preference: 'classica', objective_main: 'familia' };
    expect(detectCustomerProfile(input)).toBe('COMPACTO');
  });

  it('RELAXADOR — objetivo relaxar', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'casal', budget_range: '18_30k', pool_preference: 'spa', objective_main: 'relaxar' };
    expect(detectCustomerProfile(input)).toBe('RELAXADOR');
  });

  it('SOCIAL — amigos', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'amigos', budget_range: '18_30k', pool_preference: 'classica', objective_main: 'social' };
    expect(detectCustomerProfile(input)).toBe('SOCIAL');
  });

  it('FAMILIA — família grande', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'familia_grande', budget_range: '18_30k', pool_preference: 'classica', objective_main: 'familia' };
    expect(detectCustomerProfile(input)).toBe('FAMILIA');
  });
});

// ═══════════════════════════════════════════
// 4. Scoring & ranking
// ═══════════════════════════════════════════

describe('calculateModelScore', () => {
  it('retorna score entre 0 e 100', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'familia_grande', budget_range: '18_30k', pool_preference: 'classica', objective_main: 'familia' };
    const scored = calculateModelScore(allMockModels[0], input, 'FAMILIA');
    expect(scored.score).toBeGreaterThanOrEqual(0);
    expect(scored.score).toBeLessThanOrEqual(100);
  });

  it('bonus valorizar para modelos premium', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'premium', budget_range: '30_50k', pool_preference: 'classica', objective_main: 'valorizar' };
    const nassau = calculateModelScore(allMockModels[2], input, 'PREMIUM'); // Nassau
    const italiana = calculateModelScore(allMockModels[3], input, 'PREMIUM'); // Italiana
    expect(nassau.specialBonus).toBeGreaterThan(italiana.specialBonus);
  });
});

describe('filterModels', () => {
  it('exclui Tortuga para espaço ate_3m com prainha', () => {
    const input: QuizInputV2 = { space_bucket: 'ate_3m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'casal', budget_range: '18_30k', pool_preference: 'prainha', objective_main: 'relaxar' };
    const filtered = filterModels(allMockModels, input);
    expect(filtered.find(m => m.nome_modelo === 'Tortuga')).toBeUndefined();
  });
});

describe('rankModels', () => {
  it('ordena por score decrescente', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'familia_grande', budget_range: '18_30k', pool_preference: 'classica', objective_main: 'familia' };
    const scored = allMockModels.map(m => calculateModelScore(m, input, 'FAMILIA'));
    const ranked = rankModels(scored);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });
});

// ═══════════════════════════════════════════
// 5. getFitLevel
// ═══════════════════════════════════════════

describe('getFitLevel', () => {
  it('90+ → PERFEITO', () => expect(getFitLevel(95)).toBe('PERFEITO'));
  it('75-89 → OTIMO', () => expect(getFitLevel(80)).toBe('OTIMO'));
  it('60-74 → BOM', () => expect(getFitLevel(65)).toBe('BOM'));
  it('<60 → null', () => expect(getFitLevel(50)).toBeNull());
});

// ═══════════════════════════════════════════
// 6. recommendPoolsV2 — integração
// ═══════════════════════════════════════════

describe('recommendPoolsV2', () => {
  it('retorna resultado completo sem erros', () => {
    const input: QuizInputV2 = { space_bucket: '5_7m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'familia_grande', budget_range: '18_30k', pool_preference: 'classica', objective_main: 'familia' };
    const result = recommendPoolsV2(input, allMockModels);
    expect(result.primary_model).toBeDefined();
    expect(result.primary_score).toBeGreaterThan(0);
    expect(result.fit_level).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(10);
    expect(result.customer_profile).toBe('FAMILIA');
    expect(result.alternatives.length).toBeLessThanOrEqual(2);
  });

  it('valorizar prioriza modelos premium', () => {
    const input: QuizInputV2 = { space_bucket: '3_5m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'premium', budget_range: '30_50k', pool_preference: 'classica', objective_main: 'valorizar' };
    const result = recommendPoolsV2(input, allMockModels);
    const premiumModels = ['Atalaia', 'Nassau', 'Bonaire', 'Navagio', 'Tradicional'];
    expect(premiumModels).toContain(result.primary_model.nome_modelo);
  });

  it('Navagio priorizada para espaço pequeno + relaxar', () => {
    const input: QuizInputV2 = { space_bucket: 'ate_3m', home_status: 'casa_propria', purchase_intent: '2026', usage_profile: 'casal', budget_range: '18_30k', pool_preference: 'spa', objective_main: 'relaxar' };
    const result = recommendPoolsV2(input, allMockModels);
    // Navagio should be top or among alternatives
    const allNames = [result.primary_model.nome_modelo, ...result.alternatives.map(a => a.model.nome_modelo)];
    expect(allNames).toContain('Navagio');
  });
});
