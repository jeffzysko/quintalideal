import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, TrendingDown, Minus, Sparkles, Target, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FranchiseBenchmarkCardProps {
  franchiseId: string;
}

interface Benchmarks {
  posicao: number;
  total: number;
  percentil: number;
  pontuacao_propria: number;
  media_rede: number;
  maximo_rede: number;
  taxa_conversao_propria: number;
  taxa_conversao_anterior: number;
  taxa_conversao_media: number;
  taxa_conversao_maxima: number;
  leads_30d: number;
  vendas_30d: number;
  window_days: number;
}

function getMotivationalMessage(percentil: number, hasData: boolean): { text: string; tone: 'top' | 'mid' | 'low' | 'empty' } {
  if (!hasData) {
    return {
      text: 'Sem leads suficientes nos últimos 30 dias para comparar com a rede. Foque em receber e converter para entrar no benchmark.',
      tone: 'empty',
    };
  }
  if (percentil >= 80) {
    return { text: 'Você está entre as melhores franquias da rede. Continue assim!', tone: 'top' };
  }
  if (percentil >= 50) {
    return { text: 'Você está acima da média da rede. Há espaço para crescer ainda mais.', tone: 'mid' };
  }
  return { text: 'Com foco nas próximas conversões, você tem tudo para subir na rede.', tone: 'low' };
}

export function FranchiseBenchmarkCard({ franchiseId }: FranchiseBenchmarkCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['franchise-benchmarks', franchiseId],
    queryFn: async (): Promise<Benchmarks | null> => {
      const { data, error } = await supabase.rpc('get_franchise_benchmarks' as never, {
        p_franchise_id: franchiseId,
      } as never);
      if (error) throw error;
      return (data as unknown as Benchmarks) ?? null;
    },
    enabled: !!franchiseId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="card-premium">
        <CardContent className="p-6">
          <div className="h-32 animate-pulse bg-muted/40 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const hasData = data.leads_30d > 0 && data.total > 0;
  const message = getMotivationalMessage(data.percentil, hasData);

  // Conversion variation vs previous window
  const convDelta = data.taxa_conversao_propria - data.taxa_conversao_anterior;
  const convDeltaRounded = Math.round(convDelta);

  // Position of own conv between media and maximo (for the comparative bar)
  const barPercent = (() => {
    if (data.taxa_conversao_maxima <= 0) return 0;
    return Math.min(100, Math.max(0, (data.taxa_conversao_propria / data.taxa_conversao_maxima) * 100));
  })();

  const mediaPercent = (() => {
    if (data.taxa_conversao_maxima <= 0) return 0;
    return Math.min(100, (data.taxa_conversao_media / data.taxa_conversao_maxima) * 100);
  })();

  return (
    <Card className="card-premium overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          Sua posição na rede
          <span className="ml-auto text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Últimos {data.window_days} dias
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* === Hero: percentile === */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-5 text-center"
        >
          {hasData ? (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Seu desempenho está entre os melhores
              </p>
              <p className="text-5xl font-black text-primary leading-none my-2">
                {data.percentil}%
              </p>
              <p className="text-xs text-muted-foreground">
                da rede de {data.total} {data.total === 1 ? 'franquia' : 'franquias'} ativas
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Aguardando dados
              </p>
              <p className="text-3xl font-bold text-muted-foreground my-2">
                Sem ranking ainda
              </p>
              <p className="text-xs text-muted-foreground">
                Receba e converta leads para entrar no benchmark
              </p>
            </>
          )}
        </motion.div>

        {/* === Grid: own metrics === */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border/50 bg-card p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Sua conversão
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {data.taxa_conversao_propria}%
            </p>
            {data.taxa_conversao_anterior > 0 || data.taxa_conversao_propria > 0 ? (
              <div className="mt-1.5 flex items-center gap-1 text-xs font-medium">
                {convDeltaRounded > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600">
                    <TrendingUp className="w-3 h-3" /> +{convDeltaRounded}pp
                  </span>
                ) : convDeltaRounded < 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-destructive">
                    <TrendingDown className="w-3 h-3" /> {convDeltaRounded}pp
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                    <Minus className="w-3 h-3" /> estável
                  </span>
                )}
                <span className="text-muted-foreground font-normal">vs 30d anteriores</span>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">{data.vendas_30d}/{data.leads_30d} vendidos</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-border/50 bg-card p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Score médio do quintal
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">
              {data.pontuacao_propria}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Rede: média {data.media_rede} · topo {data.maximo_rede}
            </p>
          </motion.div>
        </div>

        {/* === Comparative bar: conversion vs network === */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Conversão vs rede
            </span>
            <span className="text-muted-foreground">
              Topo: <span className="font-bold text-foreground">{data.taxa_conversao_maxima}%</span>
            </span>
          </div>

          <div className="relative h-2.5 w-full rounded-full bg-muted overflow-visible">
            {/* Filled bar = own conversion vs max */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
              style={{ width: `${barPercent}%` }}
              aria-label="Sua taxa de conversão"
            />
            {/* Network average marker */}
            {data.taxa_conversao_media > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/60"
                style={{ left: `${mediaPercent}%` }}
                aria-label="Média da rede"
              />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Você: <span className="font-semibold text-primary">{data.taxa_conversao_propria}%</span>
            </span>
            <span className="text-muted-foreground">
              Média: <span className="font-semibold text-foreground">{data.taxa_conversao_media}%</span>
            </span>
          </div>
        </motion.div>

        {/* === Motivational message === */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`rounded-xl p-3 text-xs font-medium border ${
            message.tone === 'top'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : message.tone === 'mid'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : message.tone === 'low'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
              : 'bg-muted/40 border-border/50 text-muted-foreground'
          }`}
        >
          {message.text}
        </motion.div>
      </CardContent>
    </Card>
  );
}
