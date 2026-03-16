/**
 * Smart Tags — Computes automatic behavioral tags for leads.
 * These tags are derived from lead data at render-time (no DB storage needed).
 */

export interface SmartTag {
  key: string;
  label: string;
  emoji: string;
  /** Tailwind text class */
  color: string;
  /** Tailwind bg class */
  bg: string;
  /** Priority for display ordering (higher = more important) */
  priority: number;
}

const DAY_MS = 86_400_000;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
}

interface TagInput {
  status_lead: string;
  created_at: string;
  updated_at?: string;
  pontuacao_quintal: number | null;
  telefone?: string | null;
  email?: string | null;
  referred_by?: string | null;
  respostas_questionario?: Record<string, string> | null;
}

export function computeSmartTags(lead: TagInput): SmartTag[] {
  const tags: SmartTag[] = [];
  const created = daysSince(lead.created_at);
  const updated = lead.updated_at ? daysSince(lead.updated_at) : created;
  const score = lead.pontuacao_quintal ?? 0;
  const isOpen = ['novo', 'contatado', 'em_negociacao'].includes(lead.status_lead);

  // ── Urgency tags ──

  if (isOpen && lead.status_lead === 'novo' && created >= 3) {
    tags.push({
      key: 'sem_contato',
      label: created >= 7 ? `Sem contato há ${created}d` : `Novo há ${created}d`,
      emoji: created >= 7 ? '🔴' : '🟡',
      color: created >= 7 ? 'text-destructive' : 'text-amber-600',
      bg: created >= 7 ? 'bg-destructive/10' : 'bg-amber-500/10',
      priority: created >= 7 ? 10 : 7,
    });
  }

  if (isOpen && lead.status_lead !== 'novo' && updated >= 5) {
    tags.push({
      key: 'inativo',
      label: `Parado há ${updated}d`,
      emoji: '⏸️',
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
      priority: 8,
    });
  }

  // ── Quality tags ──

  if (score >= 80) {
    tags.push({
      key: 'alto_potencial',
      label: 'Alto potencial',
      emoji: '⭐',
      color: 'text-primary',
      bg: 'bg-primary/10',
      priority: 6,
    });
  }

  if (lead.respostas_questionario?.orcamento === '30-50') {
    tags.push({
      key: 'alto_ticket',
      label: 'Alto ticket',
      emoji: '💰',
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
      priority: 5,
    });
  }

  // ── Context tags ──

  if (lead.referred_by) {
    tags.push({
      key: 'indicacao',
      label: 'Indicação',
      emoji: '🤝',
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
      priority: 4,
    });
  }

  if (!lead.telefone && !lead.email) {
    tags.push({
      key: 'sem_contato_info',
      label: 'Sem contato',
      emoji: '📭',
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
      priority: 3,
    });
  }

  if (lead.status_lead === 'novo' && created === 0) {
    tags.push({
      key: 'recem_chegou',
      label: 'Recém-chegou',
      emoji: '🆕',
      color: 'text-primary',
      bg: 'bg-primary/10',
      priority: 9,
    });
  }

  // Sort by priority descending
  return tags.sort((a, b) => b.priority - a.priority);
}

/** Get only the top N most relevant tags */
export function getTopTags(lead: TagInput, max = 2): SmartTag[] {
  return computeSmartTags(lead).slice(0, max);
}
