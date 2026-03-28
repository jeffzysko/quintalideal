import { useMemo } from 'react';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LeadLike {
  status_lead: string;
  pontuacao_quintal?: number | null;
  cidade?: string | null;
  created_at: string;
}

interface FranchiseLike {
  id: string;
  nome_franquia: string;
  ativa: boolean;
  last_accessed_at?: string | null;
  last_lead_activity_at?: string | null;
}

interface Props {
  currentLeads: LeadLike[];
  previousLeads: LeadLike[];
  franchiseCount: number;
  cityCount: number;
  franchises?: FranchiseLike[];
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function ExecutiveSummary({ currentLeads, previousLeads, franchiseCount, cityCount, franchises }: Props) {
  const phrases = useMemo(() => {
    const result: string[] = [];
    const total = currentLeads.length;
    const prevTotal = previousLeads.length;

    // 1. Volume trend
    if (prevTotal > 0) {
      const pctChange = Math.round(((total - prevTotal) / prevTotal) * 100);
      if (pctChange > 0) {
        result.push(`📈 Volume de leads cresceu ${pctChange}% em relação ao período anterior, com ${total} novos quintais explorados.`);
      } else if (pctChange < 0) {
        result.push(`📉 Volume de leads caiu ${Math.abs(pctChange)}% em relação ao período anterior (${total} vs ${prevTotal}).`);
      } else {
        result.push(`📊 Volume estável com ${total} leads no período, mesmo patamar do anterior.`);
      }
    } else {
      result.push(`📊 ${total} quintais explorados no período atual em ${cityCount} cidades e ${franchiseCount} franquias ativas.`);
    }

    // 2. Conversion insight
    const vendidos = currentLeads.filter(l => l.status_lead === 'vendido').length;
    const contatados = currentLeads.filter(l => l.status_lead !== 'novo').length;
    if (total > 0) {
      const convRate = Math.round((vendidos / total) * 100);
      const contactRate = Math.round((contatados / total) * 100);
      if (vendidos > 0) {
        result.push(`🎯 Taxa de conversão em ${convRate}% (${vendidos} vendas). ${contactRate}% dos leads foram contatados.`);
      } else {
        result.push(`📞 ${contactRate}% dos leads foram contatados, mas nenhuma venda registrada no período — oportunidade de melhoria no follow-up.`);
      }
    }

    // 3. Quality/opportunity
    const avgScore = total > 0 ? Math.round(currentLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / total) : 0;
    const hotLeads = currentLeads.filter(l => (l.pontuacao_quintal || 0) >= 85).length;
    const novosParados = currentLeads.filter(l => {
      if (l.status_lead !== 'novo') return false;
      const age = Date.now() - new Date(l.created_at).getTime();
      return age > 48 * 60 * 60 * 1000;
    }).length;

    if (novosParados > 5) {
      result.push(`⚠️ ${novosParados} leads novos sem contato há mais de 48h — risco de perda. Score médio da rede: ${avgScore}%.`);
    } else if (hotLeads > 0) {
      result.push(`🔥 ${hotLeads} leads quentes (score ≥85) prontos para ação. Score médio da rede: ${avgScore}%.`);
    } else {
      result.push(`💡 Score médio da rede em ${avgScore}%. Nenhum alerta crítico no momento.`);
    }

    return result;
  }, [currentLeads, previousLeads, franchiseCount, cityCount]);

  // Network health: inactive franchises
  const networkHealth = useMemo(() => {
    if (!franchises || franchises.length === 0) return null;
    const active = franchises.filter(f => f.ativa);
    const inactive7d: string[] = [];
    const neverAccessed: string[] = [];

    for (const f of active) {
      const accessDays = daysSince(f.last_accessed_at);
      const activityDays = daysSince(f.last_lead_activity_at);
      if (accessDays === null && activityDays === null) {
        neverAccessed.push(f.nome_franquia);
      } else {
        const worst = Math.max(accessDays ?? 0, activityDays ?? 0);
        if (worst >= 7) inactive7d.push(f.nome_franquia);
      }
    }

    const totalInactive = inactive7d.length + neverAccessed.length;
    if (totalInactive === 0) return null;

    return { inactive7d, neverAccessed, totalInactive, totalActive: active.length };
  }, [franchises]);

  return (
    <div className="space-y-3 mb-4 sm:mb-6">
      {/* Executive Summary */}
      <Card className="card-premium border-primary/20 bg-primary/[0.03]">
        <CardContent className="px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Resumo Executivo</h3>
          </div>
          <div className="space-y-2">
            {phrases.map((phrase, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{phrase}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Health Card */}
      {networkHealth && (
        <Card className="card-premium border-amber-500/20 bg-amber-500/[0.03]">
          <CardContent className="px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Saúde da Rede</h3>
              <span className="text-[10px] text-amber-600 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full ml-auto">
                {networkHealth.totalInactive}/{networkHealth.totalActive} inativas
              </span>
            </div>
            <div className="space-y-2">
              {networkHealth.neverAccessed.length > 0 && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  🚨 <strong className="text-destructive">{networkHealth.neverAccessed.length} franquia{networkHealth.neverAccessed.length > 1 ? 's' : ''} nunca acessa{networkHealth.neverAccessed.length > 1 ? 'ram' : 'ou'}</strong> o sistema: {networkHealth.neverAccessed.slice(0, 5).join(', ')}{networkHealth.neverAccessed.length > 5 ? ` e +${networkHealth.neverAccessed.length - 5}` : ''}.
                </p>
              )}
              {networkHealth.inactive7d.length > 0 && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ⚠️ <strong className="text-amber-600">{networkHealth.inactive7d.length} franquia{networkHealth.inactive7d.length > 1 ? 's' : ''} inativa{networkHealth.inactive7d.length > 1 ? 's' : ''} há 7+ dias</strong>: {networkHealth.inactive7d.slice(0, 5).join(', ')}{networkHealth.inactive7d.length > 5 ? ` e +${networkHealth.inactive7d.length - 5}` : ''}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
