// TôContando — Service Worker
// Atualiza este número a cada novo deploy para limpar o cache antigo
const CACHE = 'tocontando-v1';

// Arquivos locais que serão cacheados no primeiro acesso
const PRECACHE = ['/'];

// ── INSTALAÇÃO ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  self.skipWaiting(); // ativa imediatamente, sem esperar fechar abas
});

// ── ATIVAÇÃO (limpa caches antigos) ─────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // assume controle de todas as abas abertas
});

// ── REQUISIÇÕES ─────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  // Ignora requisições que não sejam GET
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Ignora requisições externas (Firebase, Google Fonts, CDNs)
  // Elas têm seus próprios mecanismos de cache
  if (url.origin !== location.origin) return;

  // Estratégia: Cache-first com atualização em background
  // 1. Serve do cache imediatamente (rápido)
  // 2. Busca versão atualizada na rede e atualiza o cache
  // 3. Na próxima visita já serve a versão atualizada
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request)
          .then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => cached); // se offline, usa o cache

        return cached || networkFetch;
      })
    )
  );
});
