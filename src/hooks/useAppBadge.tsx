import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Sets the PWA app badge (icon bubble) to the unread notification count.
 * Supported on Android Chrome, Edge, and iOS 16.4+ PWAs.
 */
export function useAppBadge() {
  const { user, franchiseId, role } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  const updateBadge = useCallback(async () => {
    if (!user || !('setAppBadge' in navigator)) return;

    try {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false);

      if (!isAdmin && franchiseId) {
        query = query.eq('franchise_id', franchiseId);
      }

      const { count } = await query;
      const unread = count ?? 0;

      if (unread > 0) {
        await (navigator as any).setAppBadge(unread);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch {
      // Badge API not available or failed
    }
  }, [user, franchiseId, isAdmin]);

  // Update on mount and periodically
  useEffect(() => {
    if (!user || !('setAppBadge' in navigator)) return;

    updateBadge();
    const interval = setInterval(updateBadge, 60_000); // every 60s

    return () => clearInterval(interval);
  }, [user, updateBadge]);

  // Update on realtime notification inserts
  useEffect(() => {
    if (!user || !('setAppBadge' in navigator)) return;

    const channel = supabase
      .channel('badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          ...((!isAdmin && franchiseId) ? { filter: `franchise_id=eq.${franchiseId}` } : {}),
        },
        () => updateBadge()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, franchiseId, isAdmin, updateBadge]);

  return { updateBadge };
}
