/**
 * Cards de recomendação V3 — exibe top3 modelos com badge de compatibilidade,
 * barra de progresso, razão principal e tratamento de estado vazio.
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { getPoolImage } from '@/lib/poolImages';
import type { CompatLabel, RecommendationResultV3 } from '@/lib/scoring-v3';
import { type Lang } from '@/lib/i18n';

interface Props {
  result: RecommendationResultV3;
  whatsappNumber?: string;
  leadName?: string;
  lang?: Lang;
}

// Mapeamento de label → classes Tailwind (semantic tokens onde possível).
// Usa cores diretas (verde/azul/cinza) por serem específicas do sistema de
// compatibilidade — não fazem parte do design system genérico.
function labelClasses(label: CompatLabel): { badge: string; bar: string } {
  switch (label) {
    case 'Combinação perfeita':
      return {
        badge: 'bg-emerald-700 text-white',
        bar: '[&>div]:bg-emerald-700',
      };
    case 'Excelente escolha':
      return {
        badge: 'bg-emerald-500 text-white',
        bar: '[&>div]:bg-emerald-500',
      };
    case 'Boa opção':
      return {
        badge: 'bg-blue-500 text-white',
        bar: '[&>div]:bg-blue-500',
      };
    case 'Opção alternativa':
      return {
        badge: 'bg-muted text-foreground',
        bar: '[&>div]:bg-muted-foreground',
      };
  }
}

export function RecommendationCardsV3({ result, whatsappNumber, leadName, lang = 'pt' }: Props) {
  // Estado sem resultados
  if (result.top3.length === 0) {
    const waUrl = whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
          `Olá! ${leadName ? `Sou ${leadName}. ` : ''}Gostaria de conversar sobre opções personalizadas de piscina.`,
        )}`
      : undefined;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-2xl p-6 text-center border border-border bg-card"
      >
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-foreground mb-4">
          {result.mensagemSemResultado ||
            'Nenhum modelo disponível se encaixa no orçamento e espaço informados. Converse com nosso consultor para opções personalizadas.'}
        </p>
        {waUrl && (
          <Button asChild className="gap-2">
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              {lang === 'es' ? 'Hablar con consultor' : 'Falar com consultor'}
            </a>
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
        {lang === 'es' ? 'Recomendaciones para ti' : 'Recomendações para você'}
      </p>
      <div className="space-y-3">
        {result.top3.map((scored, i) => {
          const cls = labelClasses(scored.label_compatibilidade);
          const img = getPoolImage(scored.model.nome_modelo);
          return (
            <motion.div
              key={scored.model.nome_modelo}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl overflow-hidden border border-border bg-card"
            >
              {img && (
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={img}
                    alt={scored.model.nome_modelo}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="mb-2">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls.badge}`}
                  >
                    {scored.label_compatibilidade}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  {scored.model.nome_modelo}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {scored.razao_principal}
                </p>
                <div className="space-y-1">
                  <Progress value={scored.totalScore} className={cls.bar} />
                  <p className="text-xs text-muted-foreground">
                    {scored.totalScore}% {lang === 'es' ? 'de compatibilidad' : 'de compatibilidade'}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {result.hasEliminados && (
        <p className="text-[11px] text-muted-foreground/70 italic text-center mt-3 px-2">
          {lang === 'es'
            ? 'Algunos modelos fueron ocultados por no encajar en el presupuesto o espacio disponible.'
            : 'Alguns modelos foram ocultados por não se encaixarem no orçamento ou espaço disponível.'}
        </p>
      )}
    </div>
  );
}
