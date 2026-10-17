import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useToast } from '../context/ToastContext';

const UPDATE_CHECK_MS = 60 * 60 * 1000; // installed apps can stay open for days
const LEGACY_CACHE_PREFIX = 'sf-v1-'; // caches from the hand-written sw.js before Workbox

/**
 * Registers the Workbox service worker (production builds only) and tells the
 * user when the app works offline or when a new version is waiting.
 */
export function useServiceWorker() {
  const toast = useToast();

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let timer;
    let prompted = false; // the plugin can report one external update twice
    const updateSW = registerSW({
      onOfflineReady() {
        toast('SomeFolio is ready to use offline.');
      },
      onNeedRefresh() {
        if (prompted) return;
        prompted = true;
        toast('A new version of SomeFolio is available.', {
          action: {
            label: 'Reload',
            onClick() {
              // The plugin only reloads for updates found at registration; ones found
              // by the hourly check below count as "external", so reload ourselves.
              navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
              updateSW();
            },
          },
          duration: Infinity,
        });
      },
      onRegisteredSW(_url, registration) {
        if (registration) timer = setInterval(() => navigator.onLine && registration.update(), UPDATE_CHECK_MS);
      },
      onRegisterError(err) {
        console.warn('Service worker registration failed', err);
      },
    });

    caches
      ?.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(LEGACY_CACHE_PREFIX)).map((k) => caches.delete(k))))
      .catch(() => {});

    return () => clearInterval(timer);
  }, [toast]);
}
