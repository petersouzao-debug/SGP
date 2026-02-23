// SGP - Service Worker v15.9.12 (Backup: ranking+freq+entregas restore + IDB sync + perf cache)
const CACHE_NAME = 'sgp-v15.9.12';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['./', './index.html', './SGP_Gestao_Final_v15.html']).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) { const clone = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)); }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
