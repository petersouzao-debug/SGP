// SGP - Service Worker v19.0.4
// Melhorias desta versão:
//  - Performance do dashboard: abre a tela primeiro e adia gráficos/comparações pesadas
//  - Limite de entradas no cache (CACHE_MAX_ENTRIES) evita crescimento ilimitado
//  - Expiração de entradas antigas pelo campo x-sw-cached-at
//  - Stale-while-revalidate com TTL configurável por tipo de recurso
//  - Tratamento explícito de erros opaque (cross-origin) para não guardar 0-byte responses
//  - Cleanup robusto de caches de versões anteriores
//  - FIX v16.53.2: remoção de display:block!important no mobile CSS que forçava tabelas sempre visíveis
//  - FIX v16.53.2: ReferenceError em renderizarListaSED (itemsHTML fora de escopo no mobile)
//  - FIX v16.53.3: remoção de bloco duplicado abrirDiarioMensal/gerarDiarioMensal (348 linhas mortas)
//  - FIX v16.53.3: XSS em _sortRenderHistorico (nomes de alunos sem escapeHTML no innerHTML)
//  - FIX v17.0.2: backup ZIP inclui estado bruto redundante para proteger chaves sgp_ novas/extras
//  - FIX v17.0.7: update do Service Worker agora trata rejeições e usa fallback sem query string
//  - FIX v17.0.9: AutoTeste agora valida backup real com marcador temporário + restauração do estado bruto
//  - FIX v17.0.18: AutoTeste valida compatibilidade entre versões, defaults e chaves legadas
//  - FIX v17.0.18: AutoTeste agora gera resumo executivo, impacto prático e recomendação de uso
//  - FIX v19.0.4: auto-reparo do nome/vínculo das provas sincronizadas em Correção/Provas

const SW_VERSION = '19.0.4';
const CACHE_NAME = `sgp-v19-${SW_VERSION}`;

// Limites de cache para evitar crescimento ilimitado
const CACHE_MAX_ENTRIES = 60;          // máximo de entradas no cache geral
const CACHE_TTL_MS      = 7 * 24 * 60 * 60 * 1000; // 7 dias — recursos ficam frescos por 1 semana

// App shell — arquivos essenciais para funcionamento offline
const APP_SHELL = [
  './',
  './index.html',
];

// ── INSTALL: pré-cache do app shell ──
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      // addAll falha atomicamente; usa Promise.allSettled para tolerar falha offline
      const results = await Promise.allSettled(
        APP_SHELL.map(url => cache.add(url))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        console.warn(`[SGP-SW] ${failed} arquivo(s) do shell não cacheados (sem rede?)`);
      }
    } catch (err) {
      console.warn('[SGP-SW] Install: erro ao abrir cache:', err);
    }
    // Ativa imediatamente sem esperar o SW anterior parar
    self.skipWaiting();
  })());
});

// ── ACTIVATE: limpa caches antigos e reivindica clientes ──
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const allCacheNames = await caches.keys();
      await Promise.all(
        allCacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    } catch (err) {
      console.warn('[SGP-SW] Activate: erro ao limpar caches antigos:', err);
    }
    // Reivindica todas as abas sem reload
    await self.clients.claim();
  })());
});

// ── MENSAGENS: SKIP_WAITING e CACHE_PURGE ──
self.addEventListener('message', (event) => {
  try {
    const msg = event && event.data;
    if (msg === 'SKIP_WAITING') {
      self.skipWaiting();
      return;
    }
    if (msg === 'CACHE_PURGE') {
      // Permite que o app force limpeza do cache (ex.: após update)
      caches.delete(CACHE_NAME).then(() => {
        event.source && event.source.postMessage({ type: 'CACHE_PURGED' });
      }).catch(() => {});
      return;
    }
  } catch (_) {}
});

// ── Helpers ──

/** Verifica se uma response cacheada expirou pelo header x-sw-cached-at */
function isCacheExpired(response) {
  try {
    const cachedAt = response.headers.get('x-sw-cached-at');
    if (!cachedAt) return false; // sem timestamp = não expira (recursos estáticos com hash)
    return (Date.now() - parseInt(cachedAt, 10)) > CACHE_TTL_MS;
  } catch (_) {
    return false;
  }
}

/** Clona a response adicionando x-sw-cached-at para controle de TTL */
async function stampedResponse(response) {
  try {
    if (!response || !response.ok) return response;
    const headers = new Headers(response.headers);
    headers.set('x-sw-cached-at', String(Date.now()));
    return new Response(await response.clone().blob(), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (_) {
    return response;
  }
}

/** Remove entradas mais antigas quando o cache ultrapassa CACHE_MAX_ENTRIES */
async function pruneCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= CACHE_MAX_ENTRIES) return;
    // Remove as mais antigas (início da lista = inseridas primeiro)
    const toDelete = keys.slice(0, keys.length - CACHE_MAX_ENTRIES);
    await Promise.all(toDelete.map(k => cache.delete(k)));
  } catch (_) {}
}

// ── FETCH ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try { url = new URL(event.request.url); } catch (_) { return; }

  // Ignora requests que não são same-origin (CDNs, fontes externas, etc.)
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname || '';

  // sw.js nunca vem do cache — sempre rede pura para garantir atualização
  if (pathname.endsWith('sw.js')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => new Response('', { status: 503, statusText: 'SW Offline' }))
    );
    return;
  }

  const accept = event.request.headers.get('accept') || '';
  const isNavigation = event.request.mode === 'navigate' || accept.includes('text/html');

  if (isNavigation) {
    // Network-first para HTML: sempre tenta rede; usa cache como fallback
    event.respondWith((async () => {
      try {
        const resp = await fetch(event.request, { cache: 'no-store' });
        if (resp && resp.ok) {
          const cache = await caches.open(CACHE_NAME);
          const stamped = await stampedResponse(resp.clone());
          cache.put(event.request, stamped); // fire-and-forget
        }
        return resp;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(event.request, { ignoreSearch: true })) ||
          (await cache.match('./index.html')) ||
          Response.error()
        );
      }
    })());
    return;
  }

  // Stale-While-Revalidate para todos os outros recursos same-origin
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });

    // Se tem cache válido (não expirado), responde imediatamente e revalida em background
    if (cached && !isCacheExpired(cached)) {
      // Revalidação em background (fire-and-forget)
      fetch(event.request)
        .then(async (fresh) => {
          if (fresh && fresh.ok) {
            const stamped = await stampedResponse(fresh);
            await cache.put(event.request, stamped);
            await pruneCache(cache); // mantém cache dentro do limite
          }
        })
        .catch(() => {});
      return cached;
    }

    // Sem cache válido: busca na rede, armazena e retorna
    try {
      const resp = await fetch(event.request);
      // Não armazena responses opaque (status 0) nem erros
      if (resp && resp.ok && resp.type !== 'opaque') {
        const stamped = await stampedResponse(resp.clone());
        await cache.put(event.request, stamped);
        await pruneCache(cache);
      }
      return resp;
    } catch (_) {
      // Rede falhou: usa cache expirado como último recurso
      if (cached) return cached;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
