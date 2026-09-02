// Campusly Service Worker - Cache purge & bypass for real-time updates
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Network-first bypass: do not cache any code or modules
self.addEventListener('fetch', (event) => {
  // Let browser fetch normally without service-worker caching
  return;
});

