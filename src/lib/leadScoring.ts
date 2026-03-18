/**
 * Lead scoring: classifies leads as hot/warm/cold based on quiz answers.
 */

export type LeadTemperature = 'quente' | 'morno' | 'frio';

export interface LeadScoreResult {
  temperature: LeadTemperature;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  sortOrder: number;
}

const SCORING: Record<LeadTemperature, LeadScoreResult> = {
  quente: { temperature: 'quente', label: 'Quente', emoji: '🔥', color: 'text-orange-950 dark:text-orange-200', bgColor: 'bg-orange-100 border-orange-300 dark:bg-orange-900/40 dark:border-orange-700', sortOrder: 0 },
  morno: { temperature: 'morno', label: 'Morno', emoji: '☀️', color: 'text-amber-950 dark:text-amber-200', bgColor: 'bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700', sortOrder: 1 },
  frio: { temperature: 'frio', label: 'Frio', emoji: '❄️', color: 'text-sky-950 dark:text-sky-200', bgColor: 'bg-sky-100 border-sky-300 dark:bg-sky-900/40 dark:border-sky-700', sortOrder: 2 },
};

export function classifyLead(respostas: Record<string, string> | null, pontuacao: number | null): LeadScoreResult {
  // Check for manual temperature override first
  if (respostas?.temperatura_manual) {
    const manual = respostas.temperatura_manual as LeadTemperature;
    if (SCORING[manual]) return SCORING[manual];
  }

  // If there are any scoring fields (from quiz or mini-quiz), compute score
  const hasFields = respostas && (respostas.orcamento || respostas.intencao || respostas.espaco || respostas.moradia);
  if (!hasFields) return SCORING.frio;

  let score = 0;

  // High budget = +3
  if (respostas.orcamento === '30-50') score += 3;
  else if (respostas.orcamento === '18-30') score += 1;

  // Intent this year = +3
  if (respostas.intencao === '2026') score += 3;
  else if (respostas.intencao === '2026-2027') score += 1;

  // Large space = +2
  if (respostas.espaco === 'mais-7') score += 2;
  else if (respostas.espaco === '5-7') score += 1;

  // Owns house = +1
  if (respostas.moradia === 'minha') score += 1;

  // High quiz score bonus
  if ((pontuacao || 0) >= 80) score += 1;

  if (score >= 7) return SCORING.quente;
  if (score >= 4) return SCORING.morno;
  return SCORING.frio;
}

export function getScoreResult(temp: LeadTemperature): LeadScoreResult {
  return SCORING[temp];
}
