const CACHE_NAME = 'snapthought-v1.7.2';
const BASE = self.location.pathname.replace(/\/sw\.js$/, '/');

self.addEventListener('install', (event) => {
  // Delete all old caches immediately
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Network-first for ALL requests - no more cache interception
  event.respondWith(fetch(request));
});
