export interface QuizAnswers {
  espaco: string;
  moradia: string;
  intencao: string;
  uso: string;
  preferencia: string;
  cidade: string;
}

export function calculateScore(answers: QuizAnswers): number {
  let score = 0;

  // Espaço (max 40)
  switch (answers.espaco) {
    case 'mais-7': score += 40; break;
    case '5-7': score += 30; break;
    case '3-5': score += 20; break;
    case 'ate-3': score += 10; break;
  }

  // Moradia (max 20)
  switch (answers.moradia) {
    case 'minha': score += 20; break;
    case 'construindo': score += 15; break;
    case 'planejando': score += 8; break;
  }

  // Intenção (max 20)
  switch (answers.intencao) {
    case '2026': score += 20; break;
    case '2026-2027': score += 12; break;
    case 'pesquisando': score += 5; break;
  }

  // Uso (max 20)
  switch (answers.uso) {
    case 'familia-grande': score += 20; break;
    case 'amigos': score += 18; break;
    case 'familia-pequena': score += 15; break;
    case 'casal': score += 12; break;
  }

  return score;
}

export function recommendPool(answers: QuizAnswers): string {
  const espaco = answers.espaco;
  const pref = answers.preferencia;

  if (espaco === 'ate-3' || espaco === '3-5') {
    if (pref === 'prainha') return 'Tortuga';
    if (pref === 'spa') return 'Cancún';
    return 'Italiana';
  }

  if (espaco === '5-7') {
    if (pref === 'prainha') return 'Tortuga';
    if (pref === 'spa') return 'Cancún';
    return 'Tortuga';
  }

  // mais-7
  // Large space with premium features
  if (pref === 'prainha') return 'Bahamas';
  if (pref === 'spa') return 'Bahamas';
  return 'Tradicional';
}
