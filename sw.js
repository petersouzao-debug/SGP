// SGP - Service Worker v20.7.8
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
//  - FIX v19.0.5: histórico semanal do ranking agora respeita o período filtrado
//  - FIX v19.0.6: otimizações de abertura/ações no modal de Chamada/Frequência
//  - FIX v19.0.7: histórico semanal do ranking agora usa a data real do lançamento/atualização das notas automáticas
//  - FIX v19.0.8: exportações/backup ignoram históricos internos transitórios para reduzir tamanho e risco de corrupção por bloat
//  - FIX v19.0.9: histórico semanal agora expande o filtro para semanas completas e usa a data real do lançamento das notas
//  - FIX v19.1.0: histórico semanal agora recupera notas da semana anterior por evento salvo, correção por aluno e inferência pelos autobackups
//  - FIX v19.1.1: histórico semanal do ranking ignora filtros globais indevidos e corrige totais/legendas manual x automático na evolução
//  - FIX v19.1.11: histórico individual passa a ler a mesma trilha de eventos do semanal e o reset registra deltas manuais com mensagem consistente
//  - PERF v20.1.0: sparklines lazy via IntersectionObserver (canvas só desenhado ao entrar na viewport)
//  - PERF v20.1.0: renderização em lote — primeiros 20 cards síncronos, restante via requestIdleCallback
//  - PERF v20.1.0: deduplicação de eventos O(n²)→O(1) via Set de fingerprints em memória
//  - PERF v20.1.0: _rankGetStreak usa tail de 90 entradas em vez de sort do histórico completo (5000 entradas)
//  - PERF v20.1.0: cache de índice por turma|bim em _rankHistIndexManualRankEventLogForTurma
//  - PERF v20.1.0: guard de sessão em _rankHistEnsureManualRankEventLogForTurma (migração roda 1x por turma+bim)
//  - PERF v20.1.0: dirty-check por hash em _renderList evita reescrita do DOM sem mudanças
//  - FIX v20.1.1: bump de versão do Service Worker para forçar atualização do cache após correções no boletim/PDF
//  - FIX v20.2.0: atualização do cache para liberar o novo módulo de Tutoria integrado ao SGP
//  - FIX v20.3.0: painel do aluno agora cruza Tutoria, risco pedagógico, frequência e próximos passos
//  - FIX v20.4.0: relatório imprimível de Tutoria por aluno com dados automáticos do painel integrado
//  - FIX v20.5.0: impressão em lote dos relatórios de Tutoria por turma
//  - FIX v20.5.1: correção do layout do modal de Tutoria + botão de tela cheia
//  - FIX v20.5.2: rolagem do modal de Tutoria e liberação de mais espaço útil para edição
//  - FIX v20.5.3: barra de ações recolhível na Tutoria para ampliar a área de edição
//  - FIX v20.5.5: alinhamento de versão do app, Service Worker e manifestos de backup
//  - FIX v20.5.6: adiciona fallback IndexedDB para chaves críticas de histórico/backup
//  - FIX v20.5.8: restauração ZIP volta a persistir sgp_audit e ignora metadata transitória de autobackups
//  - FIX v20.5.9: indicador visual de salvamento no módulo Atividades e atualização de cache
//  - FIX v20.6.1: atualização do Service Worker para entregar a correção de marcação/desmarcação na Tutoria
//  - ADD v20.6.2: marcação de Prova Paulista na Edição em Massa e tabela de classificação no Dashboard
//  - ADD v20.6.3: exportação CSV da tabela Prova Paulista no Dashboard
//  - ADD v20.6.4: opção no Mapa de Sala para visualizar classificação da Prova Paulista
//  - FIX v20.6.5: estabilidade de backup, Tutoria, Mapa PP e nota vazia da Prova Paulista
//  - FIX v20.6.6: AutoTeste PP/Backup, limite de backups internos e aviso de múltiplas PP no Mapa
//  - FIX v20.6.7: IndexedDB seguro com confirmação em tx.oncomplete antes de limpar localStorage
//  - FIX v20.6.8: restauração ZIP robusta, pré-validação de backup e diagnóstico detalhado de armazenamento
//  - ADD v20.6.9: Excel real da Prova Paulista, filtros, resumo por turma e cálculo configurável no Mapa
//  - FIX v20.7.0: atualização PWA/cache, diagnóstico de versão e fallback offline de ícones
//  - ADD v20.7.1: plano de intervenção pedagógica da Prova Paulista no Dashboard
//  - ADD v20.7.2: comunicados imprimíveis aos responsáveis a partir da Prova Paulista
//  - ADD v20.7.5: integração Prova Paulista → Tutoria para acompanhamento pedagógico
//  - ADD v20.7.7: exportação Excel .xlsx no Plano Semanal
//  - FIX v20.7.8: remove etiqueta azul de registro no Cronograma após marcar aula ministrada

const SW_VERSION = '20.7.8';
const CACHE_NAME = `sgp-v20-${SW_VERSION}`;

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
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(client => {
        try { client.postMessage({ type: 'SGP_SW_ACTIVATED', version: SW_VERSION, cacheName: CACHE_NAME }); } catch (_) {}
      });
    } catch (_) {}
  })());
});

// ── MENSAGENS: SKIP_WAITING, versão e limpeza de cache ──
self.addEventListener('message', (event) => {
  const reply = (payload) => {
    try {
      if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
      else if (event.source) event.source.postMessage(payload);
    } catch (_) {}
  };
  try {
    const msg = event && event.data;
    const type = (typeof msg === 'string') ? msg : (msg && msg.type);
    if (type === 'GET_VERSION') {
      reply({ type: 'SGP_SW_VERSION', version: SW_VERSION, cacheName: CACHE_NAME });
      return;
    }
    if (type === 'SKIP_WAITING') {
      self.skipWaiting();
      reply({ type: 'SKIP_WAITING_OK', version: SW_VERSION, cacheName: CACHE_NAME });
      return;
    }
    if (type === 'CACHE_PURGE') {
      // Permite que o app force limpeza do cache atual (ex.: após update)
      caches.delete(CACHE_NAME).then(() => {
        reply({ type: 'CACHE_PURGED', version: SW_VERSION, cacheName: CACHE_NAME });
      }).catch(() => reply({ type: 'CACHE_PURGE_ERROR', version: SW_VERSION }));
      return;
    }
    if (type === 'CACHE_PURGE_ALL') {
      caches.keys().then((names) => {
        const sgpCaches = names.filter(name => String(name || '').toLowerCase().indexOf('sgp') !== -1);
        return Promise.all(sgpCaches.map(name => caches.delete(name))).then(() => sgpCaches.length);
      }).then((count) => {
        reply({ type: 'CACHE_PURGED_ALL', version: SW_VERSION, cacheName: CACHE_NAME, deleted: count });
      }).catch(() => reply({ type: 'CACHE_PURGE_ERROR', version: SW_VERSION }));
      return;
    }
  } catch (_) {
    reply({ type: 'SW_MESSAGE_ERROR', version: SW_VERSION });
  }
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
