import { useMemo } from 'react';
import { classifyLead } from '@/lib/leadScoring';
import { estimateLeadValue, formatCurrency, type LeadWithQuiz } from './types';

export function PipelineSummary({ leads, franchiseMap }: { leads: LeadWithQuiz[]; franchiseMap?: Record<string, string> }) {
  const stats = useMemo(() => {
    let total = 0;
    const temps = { quente: 0, morno: 0, frio: 0 };
    const byFranchise: Record<string, { total: number; count: number }> = {};
    for (const lead of leads) {
      const val = estimateLeadValue(lead.respostas_questionario || null, (lead as any).valor_venda);
      total += val;
      const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
      temps[t.temperature]++;
      if (franchiseMap && lead.franquia_id) {
        if (!byFranchise[lead.franquia_id]) byFranchise[lead.franquia_id] = { total: 0, count: 0 };
        byFranchise[lead.franquia_id].total += val;
        byFranchise[lead.franquia_id].count++;
      }
    }
    return { total, temps, count: leads.length, byFranchise };
  }, [leads, franchiseMap]);

  const franchiseEntries = useMemo(() => {
    if (!franchiseMap) return [];
    return Object.entries(stats.byFranchise)
      .map(([id, data]) => ({ id, name: franchiseMap[id] || id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [stats.byFranchise, franchiseMap]);

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 p-3 rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pipeline Total</span>
        <span className="text-lg font-bold text-foreground">{formatCurrency(stats.total)}</span>
        <span className="text-xs text-muted-foreground">{stats.count} leads</span>
      </div>
      <div className="h-10 w-px bg-border/50 hidden sm:block" />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔥</span>
          <span className="text-sm font-bold text-warning">{stats.temps.quente}</span>
          <span className="text-xs text-muted-foreground">Quentes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">☀️</span>
          <span className="text-sm font-bold text-warning">{stats.temps.morno}</span>
          <span className="text-xs text-muted-foreground">Mornos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">❄️</span>
          <span className="text-sm font-bold text-info">{stats.temps.frio}</span>
          <span className="text-xs text-muted-foreground">Frios</span>
        </div>
      </div>
      {franchiseEntries.length > 0 && (
        <>
          <div className="h-10 w-px bg-border/50 hidden sm:block" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Franquias</span>
            {franchiseEntries.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground truncate max-w-[120px]">{f.name}</span>
                <span className="font-semibold text-foreground">{formatCurrency(f.total)}</span>
                <span className="text-muted-foreground">({f.count})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
