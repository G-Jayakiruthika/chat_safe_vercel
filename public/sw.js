'use strict';

/**
 * Service worker: makes Chat_Safe installable (needed for the Android "Share → Chat_Safe"
 * target) and keeps the app shell available offline. API calls are never cached.
 */
const CACHE = 'chatsafe-vercel-v5.7';
const SHELL = [
  './',
  'index.html',
  'app.html',
  'demo.html',
  'proxy.html',
  'connect.html',
  'account.html',
  'privacy.html',
  'styles.css',
  'landing.css',
  'palettes.css',
  'theme.js',
  'i18n.js',
  'api.js',
  'history.js',
  'sound.js',
  'fx.js',
  'avatar.js',
  'agentAvatars.js',
  'videoExplainer.js',
  'videoReels.js',
  'pdf.js',
  'fallbackEngine.js',
  'app.js',
  'demo.js',
  'proxy.js',
  'morph.js',
  'landing.js',
  'icons.js',
  'cursor.js',
  'connect.js',
  'account.js',
  'scamtypes.js',
  'core.js',
  'icon.svg',
  'manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/webhooks/')) return; // always live

  // Network first (fresh content), fall back to cache when offline.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
