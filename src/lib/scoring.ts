export interface QuizAnswers {
  espaco: string;
  moradia: string;
  intencao: string;
  uso: string;
  preferencia: string;
  orcamento: string;
  cidade: string;
}

export function calculateScore(answers: QuizAnswers): number {
  let score = 0;

  // Espaço (max 35)
  switch (answers.espaco) {
    case 'mais-7': score += 35; break;
    case '5-7': score += 26; break;
    case '3-5': score += 18; break;
    case 'ate-3': score += 10; break;
  }

  // Moradia (max 15)
  switch (answers.moradia) {
    case 'minha': score += 15; break;
    case 'construindo': score += 11; break;
    case 'planejando': score += 6; break;
  }

  // Intenção (max 15)
  switch (answers.intencao) {
    case '2026': score += 15; break;
    case '2026-2027': score += 9; break;
    case 'pesquisando': score += 4; break;
  }

  // Uso (max 15)
  switch (answers.uso) {
    case 'familia-grande': score += 15; break;
    case 'amigos': score += 13; break;
    case 'familia-pequena': score += 11; break;
    case 'casal': score += 9; break;
  }

  // Orçamento (max 20)
  switch (answers.orcamento) {
    case '30-50': score += 20; break;
    case '18-30': score += 12; break;
    case 'ate-18': score += 5; break;
  }

  return score;
}

/** Returns a recommended size string based on user's available space and pool model */
export function recommendSize(espaco: string, poolName: string): string {
  const sizeMap: Record<string, Record<string, string>> = {
    'ate-3': {
      'Tortuga': '3,00 x 2,00m',
      'Navagio': '3,00 x 2,00m',
      'Italiana': '3,00 x 2,00m',
      'default': '3,00 x 2,00m',
    },
    '3-5': {
      'Tortuga': '4,50 x 2,50m',
      'Navagio': '4,00 x 2,50m',
      'Italiana': '4,00 x 2,20m',
      'default': '4,00 x 2,50m',
    },
    '5-7': {
      'Tortuga': '6,00 x 3,00m',
      'Bonaire': '6,00 x 3,00m',
      'Farol da Barra': '6,00 x 3,00m',
      'Tropical': '6,00 x 3,00m',
      'default': '6,00 x 3,00m',
    },
    'mais-7': {
      'Tortuga': '8,00 x 3,50m',
      'Atalaia': '8,00 x 4,00m',
      'Cancún': '8,00 x 3,50m',
      'Tradicional': '8,00 x 3,50m',
      'default': '8,00 x 3,50m',
    },
  };

  const sizes = sizeMap[espaco];
  if (!sizes) return '';
  return sizes[poolName] || sizes['default'] || '';
}

/** Budget range mapped to numeric values (in R$) for price validation */
export function getBudgetRange(orcamento: string): { min: number; max: number } {
  switch (orcamento) {
    case 'ate-18': return { min: 0, max: 18000 };
    case '18-30': return { min: 18000, max: 30000 };
    case '30-50': return { min: 30000, max: 50000 };
    default: return { min: 0, max: 50000 };
  }
}

export interface PoolPriceInfo {
  nome_modelo: string;
  preco_min: number | null;
  preco_max: number | null;
}

/**
 * Checks if a pool model fits within the lead's budget range.
 * If no price data is available for the model, it's considered compatible.
 */
export function isWithinBudget(poolName: string, orcamento: string, poolPrices: PoolPriceInfo[]): boolean {
  const pool = poolPrices.find(p => p.nome_modelo === poolName);
  if (!pool || pool.preco_min == null || pool.preco_max == null) return true; // No price data = compatible
  const budget = getBudgetRange(orcamento);
  // Pool fits if there's overlap between pool price range and budget range
  return pool.preco_min <= budget.max && pool.preco_max >= budget.min;
}

export function recommendPool(answers: QuizAnswers, poolPrices: PoolPriceInfo[] = []): string {
  const espaco = answers.espaco;
  const pref = answers.preferencia;
  const uso = answers.uso;
  const orcamento = answers.orcamento;

  const isFamilyOrFriends = uso === 'familia-grande' || uso === 'amigos';
  const isHighBudget = orcamento === '30-50';

  /** Returns the pool name if it fits the budget, otherwise the fallback */
  const pick = (name: string, fallback?: string): string => {
    if (isWithinBudget(name, orcamento, poolPrices)) return name;
    if (fallback && isWithinBudget(fallback, orcamento, poolPrices)) return fallback;
    return name; // Return original if fallback also doesn't fit
  };

  // Espaço pequeno (até 5m)
  if (espaco === 'ate-3' || espaco === '3-5') {
    if (pref === 'prainha') return pick('Tortuga');
    if (pref === 'spa') return pick('Navagio');
    return pick('Italiana');
  }

  // Espaço médio (5-7m)
  if (espaco === '5-7') {
    if (pref === 'prainha') return pick('Tortuga');
    if (pref === 'spa') return pick('Tradicional', 'Bonaire');
    if (isFamilyOrFriends && isHighBudget) return pick('Bonaire', 'Tradicional');
    if (isFamilyOrFriends) return pick('Tradicional', 'Tropical');
    return pick('Tropical');
  }

  // Espaço grande (mais de 7m)
  if (pref === 'prainha') return pick('Tortuga');
  if (pref === 'spa') return pick('Atalaia');
  if (isHighBudget && isFamilyOrFriends) return pick('Atalaia', 'Cancún');
  if (isFamilyOrFriends) return pick('Cancún');
  return pick('Tradicional');
}
