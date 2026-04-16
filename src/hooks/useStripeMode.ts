import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StripeMode {
  mode: 'live' | 'test' | 'unknown';
  configured: boolean;
}

export function useStripeMode() {
  return useQuery<StripeMode>({
    queryKey: ['stripe-mode'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stripe-mode');
      if (error) throw error;
      return data as StripeMode;
    },
    staleTime: 1000 * 60 * 10, // 10 min
  });
}
