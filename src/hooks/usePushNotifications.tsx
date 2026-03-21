import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { VAPID_PUBLIC_KEY } from '@/lib/vapid';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user, franchiseId } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const supported = 'serviceWorker' in navigator && 'PushManager' in window;

  const persistSubscription = useCallback(
    async (subscription: PushSubscription) => {
      if (!user) return;

      const json = subscription.toJSON();
      const keys = json.keys;

      if (!json.endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error('Assinatura push inválida para persistência.');
      }

      const effectiveFranchiseId = franchiseId || '00000000-0000-0000-0000-000000000000';

      const { error: deleteError } = await supabase
        .from('push_subscriptions' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', json.endpoint);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('push_subscriptions' as any).insert({
        user_id: user.id,
        franchise_id: effectiveFranchiseId,
        endpoint: json.endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
      });

      if (insertError) throw insertError;
    },
    [franchiseId, user]
  );

  // Check existing subscription on mount
  useEffect(() => {
    if (!supported || !user) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);

      if (sub) {
        try {
          await persistSubscription(sub);
        } catch (err) {
          console.error('Push subscription sync failed:', err);
        }
      }
    });
  }, [persistSubscription, supported, user]);

  const subscribe = useCallback(async () => {
    if (!supported || !user) return false;
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.ready;

      // Unsubscribe old if exists
      const existing = await reg.pushManager.getSubscription();
      const previousEndpoint = existing?.endpoint;

      if (existing) await existing.unsubscribe();

      if (previousEndpoint) {
        const { error: cleanupError } = await supabase
          .from('push_subscriptions' as any)
          .delete()
          .eq('endpoint', previousEndpoint)
          .eq('user_id', user.id);

        if (cleanupError) throw cleanupError;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      await persistSubscription(subscription);

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [persistSubscription, supported, user]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase
          .from('push_subscriptions' as any)
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', user.id);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  return {
    supported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}
