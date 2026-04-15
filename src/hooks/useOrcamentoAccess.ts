import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function useOrcamentoAccess() {
  const { franchiseId, role } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['orcamento-access', franchiseId],
    queryFn: async () => {
      if (isAdmin) return true;
      if (!franchiseId) return false;

      const { data: franchise, error } = await supabase
        .from('franchises')
        .select('orcamento_plan_active, whatsapp_plan_active')
        .eq('id', franchiseId)
        .maybeSingle();

      if (error || !franchise) return false;
      return franchise.orcamento_plan_active || franchise.whatsapp_plan_active;
    },
    enabled: !!franchiseId || isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasAccess: isAdmin ? true : !!data,
    loading: isLoading,
  };
}
