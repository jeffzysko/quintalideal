import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getPrefKeyForType } from '@/lib/notification-pref-map';

type ChannelPrefs = { push?: boolean; email?: boolean; whatsapp?: boolean };
type PrefsMap = Record<string, ChannelPrefs>;

/**
 * Hook that loads user notification preferences and provides
 * a filter function to hide notifications the user has disabled.
 */
export function useNotificationFilter() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<PrefsMap | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('notification_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();
        setPrefs((data?.preferences as PrefsMap) ?? null);
      } catch {
        setPrefs(null);
      } finally {
        setLoaded(true);
      }
    })();
  }, [user]);

  /**
   * Returns true if a notification of the given type should be shown
   * based on user preferences. If no prefs are saved, defaults to showing all.
   */
  function shouldShow(notificationType: string): boolean {
    if (!prefs) return true; // no prefs = show all (default ON)
    const prefKey = getPrefKeyForType(notificationType);
    if (!prefKey) return true; // unmapped types always shown
    const channelPref = prefs[prefKey];
    if (!channelPref || channelPref.push === undefined) return true; // not configured = default ON
    return channelPref.push;
  }

  return { shouldShow, loaded };
}
