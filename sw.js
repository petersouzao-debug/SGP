// SGP - Service Worker v15.9.12 (Sorteador por turma)
// Correções estruturais:
//  - Offline mais confiável para navegação (fallback do app shell)
//  - Evita cache indiscriminado (reduz risco de crescimento infinito do cache)
//  - Estratégia Stale-While-Revalidate para recursos same-origin

const CACHE_NAME = 'sgp-v15.9.12.2';
const APP_SHELL = [
  './',
  './index.html',
  './SGP_Gestao_Final_v15.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
    } catch (_) {
      // Primeira instalação pode ocorrer sem rede; segue sem quebrar.
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
    } catch (_) {}
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try { url = new URL(event.request.url); } catch (_) { return; }

  // Só gerencia requests same-origin para evitar cache infinito (ex.: CDNs, extensões, etc.).
  if (url.origin !== self.location.origin) return;

  const accept = (event.request.headers.get('accept') || '');
  const isNavigation = event.request.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    // Network-first para HTML, com fallback para app shell no cache.
    event.respondWith((async () => {
      try {
        const resp = await fetch(event.request);
        if (resp && resp.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, resp.clone());
        }
        return resp;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(event.request, { ignoreSearch: true })) ||
          (await cache.match('./index.html')) ||
          (await cache.match('./SGP_Gestao_Final_v15.html')) ||
          Response.error()
        );
      }
    })());
    return;
  }

  // Stale-While-Revalidate para recursos do app (same-origin)
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });

    const fetchPromise = fetch(event.request)
      .then((resp) => {
        if (resp && resp.ok) cache.put(event.request, resp.clone());
        return resp;
      })
      .catch(() => null);

    return cached || (await fetchPromise) || new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
