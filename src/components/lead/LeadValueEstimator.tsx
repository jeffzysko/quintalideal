import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';

interface LeadValueEstimatorProps {
  respostas: Record<string, string> | null;
  modeloRecomendado: string | null;
}

function estimateValue(respostas: Record<string, string> | null): { min: number; max: number; label: string; confidence: 'alta' | 'media' | 'baixa' } {
  if (!respostas) return { min: 0, max: 0, label: 'Sem dados', confidence: 'baixa' };

  const budget = respostas.orcamento;
  const space = respostas.espaco;
  const pref = respostas.preferencia;

  let min = 15000;
  let max = 25000;

  // Budget-based estimation
  if (budget === '30-50') { min = 30000; max = 50000; }
  else if (budget === '18-30') { min = 18000; max = 30000; }
  else if (budget === 'ate-18') { min = 12000; max = 18000; }

  // Adjust for premium features
  if (pref === 'spa') { min *= 1.15; max *= 1.15; }
  if (pref === 'prainha') { min *= 1.1; max *= 1.1; }

  // Adjust for space (larger spaces often mean bigger pools)
  if (space === 'mais-7') { min *= 1.1; max *= 1.1; }

  min = Math.round(min / 1000) * 1000;
  max = Math.round(max / 1000) * 1000;

  const hasAllData = budget && space;
  const confidence = hasAllData ? 'alta' : budget ? 'media' : 'baixa';

  return { min, max, label: `R$ ${(min / 1000).toFixed(0)} - ${(max / 1000).toFixed(0)} mil`, confidence };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export function LeadValueEstimator({ respostas, modeloRecomendado }: LeadValueEstimatorProps) {
  const estimate = estimateValue(respostas);
  if (estimate.min === 0) return null;

  const confidenceConfig = {
    alta: { label: 'Alta', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    media: { label: 'Média', color: 'text-amber-600', bg: 'bg-amber-500/10' },
    baixa: { label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted/50' },
  };

  const conf = confidenceConfig[estimate.confidence];

  return (
    <Card className="glass-card border-success/20">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Valor Estimado</h2>
          </div>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>
            Confiança {conf.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-success shrink-0" />
          <div>
            <p className="text-lg sm:text-xl font-bold text-foreground">
              {formatCurrency(estimate.min)} — {formatCurrency(estimate.max)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Estimativa baseada no orçamento e preferências do lead
              {modeloRecomendado && <> · Modelo: <strong>{modeloRecomendado}</strong></>}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
