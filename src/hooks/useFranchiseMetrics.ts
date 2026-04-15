import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface UsageMetrics {
  orcamentoSent: number;
  orcamentoAccepted: number;
  orcamentoRejected: number;
  whatsappSent: number;
  totalOrcamentoHistoric: number;
  totalWhatsappHistoric: number;
  monthlyOrcamento: { month: string; count: number }[];
}

export function useFranchiseMetrics(franchiseId: string | null) {
  return useQuery({
    queryKey: ['franchise-metrics', franchiseId],
    queryFn: async (): Promise<UsageMetrics> => {
      if (!franchiseId) throw new Error('No franchise');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all usage logs for this franchise
      const { data: logs, error } = await supabase
        .from('usage_logs')
        .select('event_type, created_at')
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allLogs = logs ?? [];

      // Current month metrics
      const thisMonth = allLogs.filter(l => l.created_at >= monthStart);
      const orcamentoSent = thisMonth.filter(l => l.event_type === 'orcamento_sent').length;
      const orcamentoAccepted = thisMonth.filter(l => l.event_type === 'orcamento_accepted').length;
      const orcamentoRejected = thisMonth.filter(l => l.event_type === 'orcamento_rejected').length;
      const whatsappSent = thisMonth.filter(l => l.event_type === 'whatsapp_message_sent').length;

      // Historic totals
      const totalOrcamentoHistoric = allLogs.filter(l => l.event_type === 'orcamento_sent').length;
      const totalWhatsappHistoric = allLogs.filter(l => l.event_type === 'whatsapp_message_sent').length;

      // Last 6 months orcamento by month
      const monthlyOrcamento: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
        const count = allLogs.filter(l => l.event_type === 'orcamento_sent' && l.created_at >= start && l.created_at < end).length;
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        monthlyOrcamento.push({ month: label, count });
      }

      return {
        orcamentoSent,
        orcamentoAccepted,
        orcamentoRejected,
        whatsappSent,
        totalOrcamentoHistoric,
        totalWhatsappHistoric,
        monthlyOrcamento,
      };
    },
    enabled: !!franchiseId,
    staleTime: 60_000,
  });
}
