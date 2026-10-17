import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const DAY = 60 * 60 * 24;

// `base: './'` makes every asset path relative, so the same build works at
// https://<user>.github.io/<repo>/ and on a custom domain without changes.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ask before swapping in a new version (see src/hooks/useServiceWorker.js)
      // instead of replacing the running app's files mid-session.
      registerType: 'prompt',
      injectRegister: false,
      // public/manifest.webmanifest is linked from index.html already.
      manifest: false,
      workbox: {
        // Precache the whole build, including lazily loaded Firebase chunks,
        // so the very first offline launch works and never mixes versions.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Control the page as soon as the worker activates, so posters seen on the
        // first visit are cached and the "Reload" prompt can hand over control.
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * DAY },
            },
          },
          {
            // Poster art. Capped because opaque responses count heavily
            // against the storage quota.
            urlPattern: ({ url, request }) =>
              request.destination === 'image' &&
              ['s4.anilist.co', 'img.anili.st', 'cdn.myanimelist.net'].includes(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'posters',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
            },
          },
        ],
        // API calls (AniList, Jikan, Firebase) are never cached: Firestore keeps
        // its own offline cache in IndexedDB.
      },
    }),
  ],
});
