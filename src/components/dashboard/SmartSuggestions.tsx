import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  MessageCircle, Phone, ArrowRight, Lightbulb, TrendingUp,
  AlertCircle, Clock, Flame, CalendarPlus,
  Zap, Star, List, ChevronRight,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';
import type { LeadRow } from '@/lib/lead-constants';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/lead-constants';
import { cn } from '@/lib/utils';

// ── Types ──
interface Followup {
  id: string;
  lead_id: string;
  scheduled_at: string;
  completed: boolean;
}

interface LeadActivity {
  lead_id: string;
  activity_type: string;
  created_at: string;
}

type LeadWithQuiz = LeadRow & { respostas_questionario?: Record<string, string> | null };

export interface SmartSuggestionsProps {
  leads: LeadWithQuiz[];
  followups: Followup[];
  activities: LeadActivity[];
  basePath: string;
}

// ── Suggestion engine ──
type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low';

interface Suggestion {
  id: string;
  priority: SuggestionPriority;
  icon: typeof Phone;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  /** Single lead to navigate to */
  leadId?: string;
  leadName?: string;
  /** Multiple affected leads — shows "Ver X leads" linking to filtered list */
  affectedLeadIds?: string[];
  action?: { label: string; onClick: () => void };
  metric?: string;
}

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_BADGE: Record<SuggestionPriority, { label: string; className: string }> = {
  critical: { label: 'Urgente', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  high: { label: 'Alta', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  medium: { label: 'Média', className: 'bg-primary/10 text-primary border-primary/20' },
  low: { label: 'Dica', className: 'bg-muted text-muted-foreground border-border/40' },
};

function generateSuggestions(
  leads: LeadWithQuiz[],
  followups: Followup[],
  activities: LeadActivity[],
  handleWhatsApp: (lead: LeadRow) => void,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const now = new Date();

  const leadFollowupMap = new Map<string, boolean>();
  followups.forEach(f => {
    if (!f.completed) leadFollowupMap.set(f.lead_id, true);
  });

  const lastActivityMap = new Map<string, Date>();
  activities.forEach(a => {
    const existing = lastActivityMap.get(a.lead_id);
    const actDate = new Date(a.created_at);
    if (!existing || actDate > existing) {
      lastActivityMap.set(a.lead_id, actDate);
    }
  });

  const activeLeads = leads.filter(l =>
    ['novo', 'contatado', 'em_negociacao'].includes(l.status_lead)
  );

  // ── Rule 1: Hot leads without contact ──
  const hotNoContact = activeLeads.filter(l => {
    const score = l.pontuacao_quintal || 0;
    return score >= 70 && l.status_lead === 'novo';
  });
  if (hotNoContact.length > 0) {
    const top = hotNoContact[0];
    suggestions.push({
      id: `hot-no-contact-${top.id}`,
      priority: 'critical',
      icon: Flame,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      title: hotNoContact.length === 1
        ? `${top.nome || 'Lead'} tem score ${top.pontuacao_quintal}% e ainda não foi contatado`
        : `${hotNoContact.length} leads quentes aguardando primeiro contato`,
      description: 'Leads quentes devem ser contatados nas primeiras horas para maximizar conversão.',
      leadId: hotNoContact.length === 1 ? top.id : undefined,
      leadName: hotNoContact.length === 1 ? (top.nome || undefined) : undefined,
      affectedLeadIds: hotNoContact.length > 1 ? hotNoContact.map(l => l.id) : undefined,
      metric: `${hotNoContact.length} lead${hotNoContact.length > 1 ? 's' : ''} quente${hotNoContact.length > 1 ? 's' : ''}`,
      action: hotNoContact.length === 1 && top.telefone ? {
        label: 'WhatsApp',
        onClick: () => handleWhatsApp(top),
      } : undefined,
    });
  }

  // ── Rule 2: Leads stuck in "em_negociacao" for 14+ days ──
  const stuckNegociacao = activeLeads.filter(l => {
    if (l.status_lead !== 'em_negociacao') return false;
    const lastAct = lastActivityMap.get(l.id);
    const ref = lastAct || new Date(l.created_at);
    return differenceInDays(now, ref) >= 14;
  });
  if (stuckNegociacao.length > 0) {
    suggestions.push({
      id: 'stuck-negociacao',
      priority: 'high',
      icon: AlertCircle,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600',
      title: `${stuckNegociacao.length} lead${stuckNegociacao.length > 1 ? 's' : ''} parado${stuckNegociacao.length > 1 ? 's' : ''} em negociação há +14 dias`,
      description: 'Considere fazer um novo contato ou marcar como perdido para manter seu funil limpo.',
      leadId: stuckNegociacao.length === 1 ? stuckNegociacao[0].id : undefined,
      affectedLeadIds: stuckNegociacao.length > 1 ? stuckNegociacao.map(l => l.id) : undefined,
      metric: `${stuckNegociacao.length} estagnado${stuckNegociacao.length > 1 ? 's' : ''}`,
    });
  }

  // ── Rule 3: Contacted leads without follow-up scheduled ──
  const noFollowup = activeLeads.filter(l => {
    return l.status_lead === 'contatado' && !leadFollowupMap.has(l.id);
  });
  if (noFollowup.length > 0) {
    suggestions.push({
      id: 'no-followup',
      priority: 'high',
      icon: CalendarPlus,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: `${noFollowup.length} lead${noFollowup.length > 1 ? 's' : ''} contatado${noFollowup.length > 1 ? 's' : ''} sem follow-up agendado`,
      description: 'Agende um follow-up para não perder o timing com esses leads.',
      leadId: noFollowup.length === 1 ? noFollowup[0].id : undefined,
      affectedLeadIds: noFollowup.length > 1 ? noFollowup.map(l => l.id) : undefined,
      metric: `${noFollowup.length} sem agenda`,
    });
  }

  // ── Rule 4: Leads without any activity in 7+ days ──
  const ghostedLeads = activeLeads.filter(l => {
    if (l.status_lead === 'novo') return false;
    const lastAct = lastActivityMap.get(l.id);
    if (!lastAct) return differenceInDays(now, new Date(l.created_at)) >= 7;
    return differenceInDays(now, lastAct) >= 7;
  });
  if (ghostedLeads.length > 0) {
    suggestions.push({
      id: 'ghosted-leads',
      priority: 'medium',
      icon: Clock,
      iconBg: 'bg-muted',
      iconColor: 'text-muted-foreground',
      title: `${ghostedLeads.length} lead${ghostedLeads.length > 1 ? 's' : ''} sem interação há +7 dias`,
      description: 'Uma mensagem rápida pode reativar o interesse.',
      leadId: ghostedLeads.length === 1 ? ghostedLeads[0].id : undefined,
      affectedLeadIds: ghostedLeads.length > 1 ? ghostedLeads.map(l => l.id) : undefined,
      metric: `${ghostedLeads.length} inativos`,
    });
  }

  // ── Rule 5: High conversion opportunity ──
  const negociacaoLeads = activeLeads.filter(l => l.status_lead === 'em_negociacao');
  const highValueNeg = negociacaoLeads.filter(l => (l.pontuacao_quintal || 0) >= 60);
  if (highValueNeg.length > 0) {
    const bestLead = highValueNeg.sort((a, b) => (b.pontuacao_quintal || 0) - (a.pontuacao_quintal || 0))[0];
    const lastAct = lastActivityMap.get(bestLead.id);
    const daysSinceLast = lastAct ? differenceInDays(now, lastAct) : differenceInDays(now, new Date(bestLead.created_at));
    if (daysSinceLast < 14) {
      suggestions.push({
        id: `high-value-${bestLead.id}`,
        priority: 'medium',
        icon: Star,
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600',
        title: `${bestLead.nome || 'Lead'} tem alta chance de conversão (${bestLead.pontuacao_quintal}%)`,
        description: 'Priorize este lead — um contato proativo pode fechar a venda.',
        leadId: bestLead.id,
        leadName: bestLead.nome || undefined,
        action: bestLead.telefone ? {
          label: 'Ligar',
          onClick: () => {
            const phone = bestLead.telefone!.replace(/\D/g, '');
            window.open(`tel:+55${phone}`, '_self');
          },
        } : undefined,
      });
    }
  }

  // ── Rule 6: Pipeline health tip ──
  const totalActive = activeLeads.length;
  const novoCount = activeLeads.filter(l => l.status_lead === 'novo').length;
  if (totalActive > 5 && novoCount / totalActive > 0.6) {
    suggestions.push({
      id: 'pipeline-heavy-novo',
      priority: 'low',
      icon: TrendingUp,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: `${Math.round(novoCount / totalActive * 100)}% dos seus leads estão parados em "Novo"`,
      description: 'Tente mover mais leads para "Contatado" para manter o funil saudável.',
      metric: `${novoCount}/${totalActive} em Novo`,
    });
  }

  // ── Rule 7: Celebrate wins ──
  const recentWins = leads.filter(l =>
    l.status_lead === 'vendido' && differenceInDays(now, new Date(l.created_at)) <= 7
  );
  if (recentWins.length > 0) {
    suggestions.push({
      id: 'recent-wins',
      priority: 'low',
      icon: Zap,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      title: `🎉 ${recentWins.length} venda${recentWins.length > 1 ? 's' : ''} fechada${recentWins.length > 1 ? 's' : ''} nos últimos 7 dias!`,
      description: 'Continue assim! Peça indicações para esses clientes satisfeitos.',
    });
  }

  return suggestions.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).slice(0, 5);
}

// ── Component ──
export function SmartSuggestions({ leads, followups, activities, basePath }: SmartSuggestionsProps) {
  const navigate = useNavigate();

  const handleWhatsApp = (lead: LeadRow) => {
    if (!lead.telefone) return;
    const phone = lead.telefone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem?`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const suggestions = useMemo(
    () => generateSuggestions(leads, followups, activities, handleWhatsApp),
    [leads, followups, activities],
  );

  if (suggestions.length === 0) return null;

  const handleCardClick = (suggestion: Suggestion) => {
    if (suggestion.leadId) {
      navigate(`${basePath}/${suggestion.leadId}`);
    }
    // multi-lead: no card-level click, user uses the "Ver leads" button
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Sugestões inteligentes</h3>
        <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{suggestions.length}</Badge>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, i) => {
            const Icon = suggestion.icon;
            const priorityBadge = PRIORITY_BADGE[suggestion.priority];
            const isMultiLead = (suggestion.affectedLeadIds?.length || 0) > 1;
            const isClickable = !!suggestion.leadId;

            return (
              <motion.div
                key={suggestion.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card
                  className={cn(
                    'card-premium overflow-hidden transition-all',
                    isClickable && 'hover:shadow-md cursor-pointer',
                    suggestion.priority === 'critical' && 'border-destructive/30 ring-1 ring-destructive/10',
                    suggestion.priority === 'high' && 'border-amber-500/30',
                  )}
                  onClick={() => isClickable && handleCardClick(suggestion)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', suggestion.iconBg)}>
                        <Icon className={cn('w-4.5 h-4.5', suggestion.iconColor)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] font-bold px-1.5 py-0', priorityBadge.className)}
                          >
                            {priorityBadge.label}
                          </Badge>
                          {suggestion.metric && (
                            <span className="text-[10px] text-muted-foreground font-medium">{suggestion.metric}</span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-foreground leading-snug">{suggestion.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{suggestion.description}</p>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2 mt-2.5">
                          {suggestion.action && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs rounded-lg gap-1.5 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                suggestion.action!.onClick();
                              }}
                            >
                              {suggestion.action.label === 'WhatsApp' ? (
                                <MessageCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Phone className="w-3.5 h-3.5" />
                              )}
                              {suggestion.action.label}
                            </Button>
                          )}
                          {isMultiLead && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs rounded-lg gap-1.5 px-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Navigate to the first lead as entry point
                                navigate(`${basePath}/${suggestion.affectedLeadIds![0]}`);
                              }}
                            >
                              <List className="w-3.5 h-3.5" />
                              Ver {suggestion.affectedLeadIds!.length} leads
                            </Button>
                          )}
                          {suggestion.leadId && !isMultiLead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs rounded-lg gap-1 text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`${basePath}/${suggestion.leadId}`);
                              }}
                            >
                              Ver lead
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
