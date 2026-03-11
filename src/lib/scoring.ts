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
  const uso = answers.uso;

  // Espaço pequeno (até 5m)
  if (espaco === 'ate-3' || espaco === '3-5') {
    if (pref === 'prainha') return 'Nassau'; // borda infinita + prainha, tamanho compacto
    if (pref === 'spa') return 'Navagio'; // moderno, compacto, design premium
    return 'Italiana'; // mais vendida, maior variedade de tamanhos pequenos
  }

  // Espaço médio (5-7m)
  if (espaco === '5-7') {
    if (pref === 'prainha') return 'Tortuga'; // prainha integrada a partir de 5m
    if (pref === 'spa') return 'Bonaire'; // hidromassagem, bordas pastilhadas
    if (uso === 'familia-grande' || uso === 'amigos') return 'Farol da Barra'; // versátil, família
    return 'Tropical'; // elegante, boa variedade
  }

  // Espaço grande (mais de 7m)
  if (pref === 'prainha' && pref !== 'spa') return 'Tortuga'; // prainha até 10m
  if (pref === 'spa') return 'Atalaia'; // SPA + prainha + deck molhado, linha mais completa
  if (pref === 'prainha') return 'Atalaia'; // prainha + SPA integrado
  if (uso === 'familia-grande' || uso === 'amigos') return 'Cancún'; // área útil ampla, até 10m
  return 'Tradicional'; // clássica, elegante, versátil
}
