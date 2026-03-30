const CACHE_VERSION = '1.1.6';
const CACHE_NAME = `valutapp-v${CACHE_VERSION}`;

// ── Install: cache the app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['./index.html'])
    )
  );
  // Don't auto-skip waiting — let the client decide via SKIP_WAITING message
});

// ── Activate: delete old caches, claim clients, notify about new version ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
     .then(() => notifyClients())
  );
});

function notifyClients() {
  return self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
    .then(clients => {
      clients.forEach(client =>
        client.postMessage({ type: 'NEW_VERSION', version: CACHE_VERSION })
      );
    });
}

// ── Fetch: network-first, fallback to cache ──
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone and store in cache
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Messages from clients ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION_RESPONSE', version: CACHE_VERSION });
  }
});
