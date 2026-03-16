import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if running in standalone mode (including fullscreen)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // React to display-mode changes
    const mql = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) setIsInstalled(true);
    };
    mql.addEventListener('change', onDisplayChange);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      mql.removeEventListener('change', onDisplayChange);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // Listen for SW updates – poll periodically for standalone apps
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsUpdate(true);
          }
        });
      });

      // Check for updates periodically (every 30 min) for standalone users
      const interval = setInterval(() => {
        reg.update().catch(() => {});
      }, 30 * 60 * 1000);

      return () => clearInterval(interval);
    });
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    return outcome === 'accepted';
  }, [installPrompt]);

  const applyUpdate = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isStandalone,
    needsUpdate,
    promptInstall,
    applyUpdate,
  };
}
