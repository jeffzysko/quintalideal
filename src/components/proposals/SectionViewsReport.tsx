import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, TrendingUp, Layout } from 'lucide-react';

interface SectionViewsReportProps {
  proposalId: string;
}

export function SectionViewsReport({ proposalId }: SectionViewsReportProps) {
  const { data: sectionViews, isLoading } = useQuery({
    queryKey: ['proposal-section-views', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_section_views')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('viewed_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!proposalId
  });

  if (isLoading) return <div className="animate-pulse h-24 bg-muted rounded-lg" />;

  const sectionLabels: Record<string, string> = {
    items: 'Itens da Proposta',
    total: 'Resumo de Valores',
    payment: 'Condições de Pagamento',
    video: 'Vídeo de Apresentação',
    actions: 'Botões de Ação'
  };

  if (!sectionViews || sectionViews.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
        <Layout className="w-8 h-8 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Nenhuma interação por seção registrada ainda.</p>
      </div>
    );
  }

  // Count unique sections viewed
  const uniqueSections = new Set(sectionViews.map(v => v.section));
  const engagementScore = Math.round((uniqueSections.size / 5) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Engajamento de Leitura</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black">{engagementScore}%</span>
            <Badge variant={engagementScore > 60 ? 'default' : 'secondary'} className="rounded-full">
              {engagementScore > 80 ? 'Altíssimo' : engagementScore > 50 ? 'Bom' : 'Baixo'}
            </Badge>
          </div>
        </div>
        <TrendingUp className="w-8 h-8 text-primary/20" />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Ordem de leitura do cliente:</p>
        <ScrollArea className="h-40 pr-4">
          <div className="space-y-2">
            {sectionViews.map((view, idx) => (
              <div key={view.id} className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-lg border border-border/50">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{sectionLabels[view.section] || view.section}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(view.viewed_at), "HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <p className="text-[10px] text-muted-foreground italic">
        * Ajuda a entender quais partes da proposta despertaram mais interesse.
      </p>
    </div>
  );
}
