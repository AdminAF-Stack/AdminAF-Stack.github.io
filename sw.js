const CACHE_NAME = 'adminaf-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Install: cache the main page
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache-first for the main page
  if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first (with cache fallback) for external APIs and proxies
  if (url.hostname.includes('proxy.cors.dev') ||
      url.hostname.includes('coingecko.com') ||
      url.hostname.includes('status') ||
      url.hostname.includes('cloudflarestatus') ||
      url.hostname.includes('githubstatus') ||
      url.hostname.includes('zoom.us') ||
      url.hostname.includes('atlassian') ||
      url.hostname.includes('okta') ||
      url.hostname.includes('dropbox') ||
      url.hostname.includes('digitalocean')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Default: try network, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
