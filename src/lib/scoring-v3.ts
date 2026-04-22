/**
 * Motor de Recomendação V3 — Quintal Ideal
 * Pipeline em 3 camadas: filtros eliminatórios → score ponderado → bônus de sinergia.
 * Paralelo ao V2: não quebra nada existente.
 */

import type { PoolModelData } from './scoring-v2';

// ── Public types ──

export type PerfilUso = 'lazer_familia' | 'relaxamento_casal' | 'esporte_natacao' | 'social_festas';
export type Estilo = 'moderno' | 'natural' | 'classico' | 'qualquer';

export interface QuizInputV3 {
  orcamento: number;
  espaco_disponivel: number;
  num_pessoas: number;
  perfil_uso: PerfilUso;
  funcionalidades: string[];
  estilo: Estilo;
}

export type CompatLabel =
  | 'Combinação perfeita'
  | 'Excelente escolha'
  | 'Boa opção'
  | 'Opção alternativa';

export interface ScoreBreakdown {
  orcamento: number;       // 0–10
  espaco: number;          // 0–10
  perfil: number;          // 0–10
  funcionalidades: number; // 0–10
  estilo: number;          // sempre 5
}

export interface ScoredModelV3 {
  model: PoolModelData;
  totalScore: number; // 0–100
  breakdown: ScoreBreakdown;
  synergyBonus: number;
  eliminado: boolean;
  motivo_eliminacao?: string;
  razao_principal: string;
  label_compatibilidade: CompatLabel;
}

export interface RecommendationResultV3 {
  top3: ScoredModelV3[];
  allScored: ScoredModelV3[];
  hasEliminados: boolean;
  mensagemSemResultado?: string;
}

// ── PARTE 1: normalizeQuizToV3 ──
// Adaptado aos buckets reais do quiz atual (não inventa novos).
// Quiz atual: espaco ∈ {ate-3, 3-5, 5-7, mais-7}, orcamento ∈ {ate-18, 18-30, 30-50}

export function normalizeQuizToV3(answers: Record<string, string>): QuizInputV3 {
  // ESPAÇO (metros) — usar o ponto médio razoável de cada bucket
  const spaceMap: Record<string, number> = {
    'ate-3': 3,
    '3-5': 4,
    '5-7': 6,
    'mais-7': 9,
  };
  const espaco_disponivel = spaceMap[answers.espaco] ?? 6;

  // ORÇAMENTO (R$) — meio da faixa do quiz atual
  const budgetMap: Record<string, number> = {
    'ate-18': 15000,
    '18-30': 24000,
    '30-50': 40000,
  };
  const orcamento = budgetMap[answers.orcamento] ?? 24000;

  // PERFIL DE USO + NÚMERO DE PESSOAS
  const uso = (answers.uso || '').toLowerCase();
  let perfil_uso: PerfilUso = 'lazer_familia';
  let num_pessoas = 3;

  if (uso.includes('familia') || uso === 'filhos') {
    perfil_uso = 'lazer_familia';
    num_pessoas = uso === 'familia' ? 5 : 4;
  } else if (uso.includes('casal') || uso === 'relaxar') {
    perfil_uso = 'relaxamento_casal';
    num_pessoas = 2;
  } else if (uso.includes('esporte') || uso.includes('natacao')) {
    perfil_uso = 'esporte_natacao';
    num_pessoas = 2;
  } else if (uso.includes('social') || uso === 'amigos' || uso.includes('festa')) {
    perfil_uso = 'social_festas';
    num_pessoas = 6;
  } else if (uso === 'valorizar') {
    // valorização patrimonial: trate como lazer família como base neutra
    perfil_uso = 'lazer_familia';
    num_pessoas = 4;
  }

  // FUNCIONALIDADES
  const pref = answers.preferencia;
  let funcionalidades: string[] = [];
  if (Array.isArray(pref)) {
    funcionalidades = pref as unknown as string[];
  } else if (typeof pref === 'string') {
    switch (pref) {
      case 'prainha': funcionalidades = ['prainha']; break;
      case 'spa': funcionalidades = ['spa']; break;
      case 'cascata': funcionalidades = ['cascata']; break;
      case 'raia': funcionalidades = ['raia']; break;
      case 'completa': funcionalidades = ['prainha', 'cascata']; break;
      default: funcionalidades = [];
    }
  }

  return {
    orcamento,
    espaco_disponivel,
    num_pessoas,
    perfil_uso,
    funcionalidades,
    estilo: 'qualquer',
  };
}

// ── Helpers ──

function getModelPrice(m: PoolModelData): number | null {
  return m.preco_min ?? m.preco_max ?? null;
}

function getModelLength(m: PoolModelData): number | null {
  return m.comprimento ?? null;
}

function modelHasFeature(m: PoolModelData, feature: string): boolean {
  const f = feature.toLowerCase();
  if (f === 'prainha') return !!m.possui_prainha;
  if (f === 'spa') return !!m.possui_spa;
  // cascata e raia não existem como flag no banco — checa descrição como fallback
  const desc = (m.descricao || '').toLowerCase();
  return desc.includes(f);
}

function normalizeCategoria(m: PoolModelData): 'pequeno' | 'medio' | 'grande' | null {
  const cat = (m.categoria_tamanho || '').toLowerCase();
  if (!cat) return null;
  if (cat.includes('peq') || cat === 'p') return 'pequeno';
  if (cat.includes('med') || cat === 'm') return 'medio';
  if (cat.includes('gra') || cat === 'g') return 'grande';
  return null;
}

// ── CAMADA 1: Filtros eliminatórios ──

function applyHardFilters(m: PoolModelData, input: QuizInputV3): { eliminado: boolean; motivo?: string } {
  const price = getModelPrice(m);
  if (price != null && price > input.orcamento * 1.15) {
    return { eliminado: true, motivo: 'Acima do orçamento disponível' };
  }
  const len = getModelLength(m);
  if (len != null && len > input.espaco_disponivel) {
    return { eliminado: true, motivo: 'Espaço insuficiente para este modelo' };
  }
  return { eliminado: false };
}

// ── CAMADA 2: Sub-scores (0–10) ──

function subScoreOrcamento(m: PoolModelData, input: QuizInputV3): number {
  const price = getModelPrice(m);
  if (price == null) return 5;
  const ratio = price / input.orcamento;
  if (ratio <= 0.70) return 7;
  if (ratio <= 0.85) return 10;
  if (ratio <= 1.00) return 8;
  if (ratio <= 1.15) return 4;
  return 0;
}

function subScoreEspaco(m: PoolModelData, input: QuizInputV3): number {
  const len = getModelLength(m);
  if (len == null) return 5;
  const ratio = len / input.espaco_disponivel;
  if (ratio <= 0.75) return 7;
  if (ratio <= 0.90) return 10;
  if (ratio <= 1.00) return 8;
  return 0;
}

function subScorePerfil(m: PoolModelData, input: QuizInputV3): number {
  const cat = normalizeCategoria(m);
  const len = m.comprimento;
  const hasPrainha = !!m.possui_prainha;
  const hasSpa = !!m.possui_spa;
  const hasCascata = modelHasFeature(m, 'cascata');

  // Sem dados suficientes → neutro
  if (cat == null && len == null) return 5;

  let raw = 0;
  let max = 10; // máximo possível em cada perfil para normalização

  switch (input.perfil_uso) {
    case 'lazer_familia': {
      max = 10;
      if (hasPrainha) raw += 4;
      if (cat === 'medio' || cat === 'grande') raw += 3;
      if (len != null && len >= 7) raw += 3;
      break;
    }
    case 'relaxamento_casal': {
      max = 10;
      if (hasSpa) raw += 5;
      if (cat === 'pequeno' || cat === 'medio') raw += 3;
      if (hasCascata) raw += 2;
      break;
    }
    case 'esporte_natacao': {
      max = 8; // os bônus somam até 8 (5+3); o malus pode reduzir
      if (len != null && len >= 9) raw += 5;
      if (len != null && len >= 7) raw += 3;
      if (hasPrainha) raw -= 3;
      break;
    }
    case 'social_festas': {
      max = 10;
      if (cat === 'grande') raw += 5;
      if (hasPrainha) raw += 3;
      if (hasCascata) raw += 2;
      break;
    }
  }

  const normalized = Math.max(0, Math.min(10, (raw / max) * 10));
  return normalized;
}

function subScoreFuncionalidades(m: PoolModelData, input: QuizInputV3): number {
  if (input.funcionalidades.length === 0) return 5;
  const matches = input.funcionalidades.filter(f => modelHasFeature(m, f)).length;
  return (matches / input.funcionalidades.length) * 10;
}

// ── CAMADA 3: Sinergia ──

function synergyBonus(m: PoolModelData, input: QuizInputV3): number {
  const cat = normalizeCategoria(m);
  const len = m.comprimento ?? 0;
  const hasPrainha = !!m.possui_prainha;
  const hasSpa = !!m.possui_spa;
  const hasCascata = modelHasFeature(m, 'cascata');
  let bonus = 0;

  if (hasPrainha && input.perfil_uso === 'lazer_familia' && input.num_pessoas >= 4) bonus += 15;
  if (hasSpa && input.perfil_uso === 'relaxamento_casal') bonus += 12;
  if (len >= 8 && input.perfil_uso === 'esporte_natacao') bonus += 10;
  if (cat === 'grande' && input.perfil_uso === 'social_festas' && input.num_pessoas >= 5) bonus += 10;
  if (hasCascata && input.perfil_uso === 'relaxamento_casal') bonus += 8;

  if (input.perfil_uso === 'esporte_natacao' && hasPrainha && len < 9) bonus -= 15;
  if (input.perfil_uso === 'lazer_familia' && input.num_pessoas >= 5 && cat === 'pequeno') bonus -= 10;

  return bonus;
}

// ── Label de compatibilidade ──

export function getCompatLabel(score: number): CompatLabel {
  if (score >= 85) return 'Combinação perfeita';
  if (score >= 70) return 'Excelente escolha';
  if (score >= 55) return 'Boa opção';
  return 'Opção alternativa';
}

// ── Razão principal (template literals) ──

function buildRazaoPrincipal(
  m: PoolModelData,
  input: QuizInputV3,
  breakdown: ScoreBreakdown,
): string {
  const cat = normalizeCategoria(m);
  const len = m.comprimento ?? 0;
  const hasPrainha = !!m.possui_prainha;
  const hasSpa = !!m.possui_spa;

  // Casos de alta especificidade primeiro
  if (hasSpa && input.perfil_uso === 'relaxamento_casal') {
    return 'Com spa integrado, perfeita para relaxamento e momentos a dois.';
  }
  if (input.perfil_uso === 'esporte_natacao' && len >= 8) {
    return `Comprimento de ${len}m permite nado contínuo dentro do seu orçamento.`;
  }
  if (cat === 'grande' && input.perfil_uso === 'social_festas') {
    return `Espaço amplo para receber com conforto até ${input.num_pessoas} pessoas.`;
  }
  if (breakdown.orcamento >= 8 && hasPrainha && input.perfil_uso === 'lazer_familia') {
    return 'Ótimo custo-benefício com prainha inclusa, ideal para sua família.';
  }
  if (hasPrainha && input.perfil_uso === 'lazer_familia') {
    return 'Prainha integrada cria uma área segura para crianças aproveitarem com tranquilidade.';
  }

  // Caso o destaque seja orçamento
  const fatores: Array<{ nome: string; valor: number }> = [
    { nome: 'orcamento', valor: breakdown.orcamento },
    { nome: 'espaco', valor: breakdown.espaco },
    { nome: 'perfil', valor: breakdown.perfil },
    { nome: 'funcionalidades', valor: breakdown.funcionalidades },
  ];
  const top = fatores.reduce((a, b) => (b.valor > a.valor ? b : a));

  if (top.nome === 'orcamento' && top.valor >= 8) {
    return 'Excelente custo-benefício dentro do orçamento informado.';
  }
  if (top.nome === 'espaco' && top.valor >= 8) {
    return 'Aproveita muito bem o espaço disponível no seu quintal.';
  }

  return 'Excelente equilíbrio entre tamanho, funcionalidades e orçamento disponível.';
}

// ── Função principal ──

export function recommendPoolsV3(
  input: QuizInputV3,
  models: PoolModelData[],
): RecommendationResultV3 {
  const allScored: ScoredModelV3[] = models.map(m => {
    const filterResult = applyHardFilters(m, input);

    const subO = subScoreOrcamento(m, input);
    const subE = subScoreEspaco(m, input);
    const subP = subScorePerfil(m, input);
    const subF = subScoreFuncionalidades(m, input);
    const subS = 5; // estilo neutro

    const breakdown: ScoreBreakdown = {
      orcamento: subO,
      espaco: subE,
      perfil: subP,
      funcionalidades: subF,
      estilo: subS,
    };

    // Soma ponderada (resultado em 0–10)
    const raw =
      subO * 0.30 +
      subE * 0.25 +
      subP * 0.20 +
      subF * 0.15 +
      subS * 0.10;

    const totalAntesSinergia = raw * 10; // 0–100
    const bonus = synergyBonus(m, input);
    const totalScore = Math.round(Math.max(0, Math.min(100, totalAntesSinergia + bonus)));

    const razao_principal = buildRazaoPrincipal(m, input, breakdown);
    const label_compatibilidade = getCompatLabel(totalScore);

    return {
      model: m,
      totalScore,
      breakdown,
      synergyBonus: bonus,
      eliminado: filterResult.eliminado,
      motivo_eliminacao: filterResult.motivo,
      razao_principal,
      label_compatibilidade,
    };
  });

  const viaveis = allScored
    .filter(s => !s.eliminado)
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    top3: viaveis.slice(0, 3),
    allScored,
    hasEliminados: allScored.some(s => s.eliminado),
    mensagemSemResultado: viaveis.length === 0
      ? 'Nenhum modelo disponível se encaixa no orçamento e espaço informados. Converse com nosso consultor para opções personalizadas.'
      : undefined,
  };
}
