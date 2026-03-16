import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Target, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface LeadLike {
  status_lead: string;
  created_at: string;
  updated_at?: string;
  pontuacao_quintal?: number | null;
  respostas_questionario?: Record<string, string> | null;
}

interface Insight {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bg: string;
  priority: number;
}

const DAY_MS = 86_400_000;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
}

function computeInsights(leads: LeadLike[], previousLeads?: LeadLike[]): Insight[] {
  const insights: Insight[] = [];

  const currentTotal = leads.length;
  const prevTotal = previousLeads?.length || 0;

  // 1. Conversion rate change
  const currentSold = leads.filter(l => l.status_lead === 'vendido').length;
  const prevSold = previousLeads?.filter(l => l.status_lead === 'vendido').length || 0;
  const currentRate = currentTotal > 0 ? (currentSold / currentTotal) * 100 : 0;
  const prevRate = prevTotal > 0 ? (prevSold / prevTotal) * 100 : 0;

  if (prevRate > 0 && currentRate > 0) {
    const diff = currentRate - prevRate;
    if (Math.abs(diff) >= 5) {
      insights.push({
        key: 'conversion_change',
        icon: diff > 0 ? TrendingUp : TrendingDown,
        title: diff > 0
          ? `Suas vendas estão crescendo!`
          : `Atenção: menos vendas neste período`,
        description: diff > 0
          ? `Você fechou mais negócios que no período anterior. Continue assim!`
          : `Revise seus leads abertos e retome o contato com quem está em negociação.`,
        color: diff > 0 ? 'text-emerald-600' : 'text-destructive',
        bg: diff > 0 ? 'bg-emerald-500/10' : 'bg-destructive/10',
        priority: 9,
      });
    }
  }

  // 2. Lead volume spike
  if (prevTotal > 0) {
    const growth = ((currentTotal - prevTotal) / prevTotal) * 100;
    if (growth >= 30) {
      insights.push({
        key: 'lead_spike',
        icon: Zap,
        title: `Muitos leads novos chegando!`,
        description: `Você recebeu ${currentTotal} leads neste período. Não deixe nenhum esfriar — entre em contato agora!`,
        color: 'text-primary',
        bg: 'bg-primary/10',
        priority: 7,
      });
    }
  }

  // 3. Stalled pipeline
  const openLeads = leads.filter(l => ['novo', 'contatado', 'em_negociacao'].includes(l.status_lead));
  const stalledLeads = openLeads.filter(l => {
    const updated = l.updated_at || l.created_at;
    return daysSince(updated) >= 7;
  });
  if (stalledLeads.length >= 3) {
    insights.push({
      key: 'stalled_pipeline',
      icon: AlertTriangle,
      title: `${stalledLeads.length} leads parados — retome o contato!`,
      description: 'Esses leads não recebem atenção há mais de 7 dias. Ligue ou mande mensagem hoje!',
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
      priority: 8,
    });
  }

  // 4. High-value leads opportunity
  const highValueNew = leads.filter(l => {
    const score = l.pontuacao_quintal ?? 0;
    return l.status_lead === 'novo' && score >= 70;
  });
  if (highValueNew.length > 0) {
    insights.push({
      key: 'high_value_opportunity',
      icon: Target,
      title: `${highValueNew.length} lead${highValueNew.length > 1 ? 's' : ''} quente${highValueNew.length > 1 ? 's' : ''} — ligue agora!`,
      description: 'Esses leads têm alto interesse e ainda não foram contatados. Priorize-os!',
      color: 'text-primary',
      bg: 'bg-primary/10',
      priority: 10,
    });
  }

  // 5. Lost leads spike
  const currentLost = leads.filter(l => l.status_lead === 'perdido').length;
  const prevLost = previousLeads?.filter(l => l.status_lead === 'perdido').length || 0;
  if (prevLost > 0 && currentLost > prevLost * 1.5 && currentLost >= 3) {
    insights.push({
      key: 'lost_spike',
      icon: TrendingDown,
      title: `Aumento de leads perdidos`,
      description: `${currentLost} perdidos neste período vs. ${prevLost} no anterior. Analise as causas.`,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      priority: 8,
    });
  }

  // 6. Good conversion rate
  if (currentRate >= 20 && currentTotal >= 5) {
    insights.push({
      key: 'good_conversion',
      icon: BarChart3,
      title: `Taxa de conversão em ${currentRate.toFixed(0)}%`,
      description: 'Excelente performance! Sua taxa está acima da média do mercado.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
      priority: 3,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

interface InsightCardsProps {
  leads: LeadLike[];
  previousLeads?: LeadLike[];
  maxCards?: number;
}

export function InsightCards({ leads, previousLeads, maxCards = 3 }: InsightCardsProps) {
  const insights = useMemo(
    () => computeInsights(leads, previousLeads).slice(0, maxCards),
    [leads, previousLeads, maxCards]
  );

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
      {insights.map((insight, i) => {
        const Icon = insight.icon;
        return (
          <motion.div
            key={insight.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl border border-border/40 p-4 ${insight.bg} backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${insight.bg}`}>
                <Icon className={`w-4 h-4 ${insight.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${insight.color}`}>{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
