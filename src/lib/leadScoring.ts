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
  quente: { temperature: 'quente', label: 'Quente', emoji: '🔥', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', sortOrder: 0 },
  morno: { temperature: 'morno', label: 'Morno', emoji: '☀️', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', sortOrder: 1 },
  frio: { temperature: 'frio', label: 'Frio', emoji: '❄️', color: 'text-sky-700', bgColor: 'bg-sky-50 border-sky-200', sortOrder: 2 },
};

export function classifyLead(respostas: Record<string, string> | null, pontuacao: number | null): LeadScoreResult {
  if (!respostas) return SCORING.frio;

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
