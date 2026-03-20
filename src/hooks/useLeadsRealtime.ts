import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Subscribes to real-time changes on the `leads` table and invalidates
 * the relevant React Query caches so the UI stays up to date without polling.
 *
 * @param franchiseId - When provided, limits the subscription and invalidation
 *                      to that specific franchise (used in FranchiseDashboard).
 *                      Pass null/undefined for the admin view (all leads).
 */
export function useLeadsRealtime(franchiseId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = franchiseId
      ? `leads-realtime-franchise-${franchiseId}`
      : 'leads-realtime-admin';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          ...(franchiseId ? { filter: `franquia_id=eq.${franchiseId}` } : {}),
        },
        () => {
          // Only refetch queries that are currently mounted (refetchType: 'active')
          // to avoid triggering hidden/background tabs
          if (franchiseId) {
            queryClient.invalidateQueries({
              queryKey: ['franchise-leads-all', franchiseId],
              refetchType: 'active',
            });
            queryClient.invalidateQueries({
              queryKey: ['franchise-leads-table', franchiseId],
              refetchType: 'active',
            });
          } else {
            queryClient.invalidateQueries({
              queryKey: ['admin-leads-all'],
              refetchType: 'active',
            });
            queryClient.invalidateQueries({
              queryKey: ['admin-leads-table'],
              refetchType: 'active',
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [franchiseId, queryClient]);
}
