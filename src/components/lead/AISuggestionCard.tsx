import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface AISuggestionCardProps {
  lead: {
    nome: string | null;
    status_lead: string;
    cidade: string | null;
    pontuacao_quintal: number | null;
    modelo_recomendado: string | null;
    respostas_questionario: Record<string, string> | null;
    telefone: string | null;
    email: string | null;
    lead_origin?: string;
  };
  activitiesCount: number;
  lastActivityDays: number;
  followupsPending: number;
}

export function AISuggestionCard({ lead, activitiesCount, lastActivityDays, followupsPending }: AISuggestionCardProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const respostas = lead.respostas_questionario || {};
      const { data, error } = await supabase.functions.invoke('lead-ai-suggestion', {
        body: {
          lead: {
            nome: lead.nome,
            status_lead: lead.status_lead,
            cidade: lead.cidade,
            pontuacao_quintal: lead.pontuacao_quintal,
            modelo_recomendado: lead.modelo_recomendado,
            orcamento: respostas.orcamento,
            intencao: respostas.intencao,
            espaco: respostas.espaco,
            moradia: respostas.moradia,
            preferencia: respostas.preferencia,
            telefone: lead.telefone,
            email: lead.email,
            lead_origin: lead.lead_origin,
          },
          activities_count: activitiesCount,
          last_activity_days: lastActivityDays,
          followups_pending: followupsPending,
        },
      });

      if (error) throw error;
      setSuggestion(data.suggestion);
    } catch (err: any) {
      if (err?.status === 429) {
        toast.error('Limite de requisições atingido. Tente novamente em alguns minutos.');
      } else if (err?.status === 402) {
        toast.error('Créditos de IA esgotados. Atualize seu plano.');
      } else {
        toast.error('Erro ao gerar sugestão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-violet-200/50 dark:border-violet-800/50">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Sugestão Inteligente</h2>
          </div>
          <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1.5 py-0.5 rounded-full font-medium">
            IA
          </span>
        </div>

        {suggestion ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-xs sm:text-sm text-foreground leading-relaxed mb-3 prose prose-sm prose-violet max-w-none dark:prose-invert [&>p]:mb-3 [&>p:last-child]:mb-0 [&_strong]:text-violet-700 dark:[&_strong]:text-violet-300">
              <ReactMarkdown>{suggestion}</ReactMarkdown>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSuggestion}
              disabled={loading}
              className="text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 gap-1.5 h-7"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Gerar nova sugestão
            </Button>
          </motion.div>
        ) : (
          <Button
            onClick={fetchSuggestion}
            disabled={loading}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white h-9 text-xs"
          >
            {loading ? (
              <>
                <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                Analisando lead...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Sugerir próximo passo
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
