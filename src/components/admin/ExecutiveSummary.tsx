import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LeadLike {
  status_lead: string;
  pontuacao_quintal?: number | null;
  cidade?: string | null;
  created_at: string;
}

interface Props {
  currentLeads: LeadLike[];
  previousLeads: LeadLike[];
  franchiseCount: number;
  cityCount: number;
}

export function ExecutiveSummary({ currentLeads, previousLeads, franchiseCount, cityCount }: Props) {
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

  return (
    <Card className="card-premium mb-4 sm:mb-6 border-primary/20 bg-primary/[0.03]">
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
  );
}
