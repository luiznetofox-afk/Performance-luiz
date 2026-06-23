const CACHE_NAME = 'nexus-v1';
const OFFLINE_QUEUE_KEY = 'nexus-offline-queue';

// Arquivos para cache offline
const ASSETS = [
  '/Performance-luiz/index.html',
  '/Performance-luiz/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600;700&family=Bebas+Neue&display=swap',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap'
];

// Instala e faz cache dos assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {
        return cache.addAll(['/Performance-luiz/index.html']);
      });
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Intercepta requisições
self.addEventListener('fetch', function(event) {
  // Deixa requisições Firebase passarem direto (precisam de internet)
  if (event.request.url.indexOf('firebase') >= 0 ||
      event.request.url.indexOf('googleapis.com') >= 0 ||
      event.request.url.indexOf('unsplash.com') >= 0) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  // Cache first para assets locais
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match('/Performance-luiz/index.html');
      });
    })
  );
});

// Fila offline — sincroniza com Firebase quando voltar internet
self.addEventListener('sync', function(event) {
  if (event.tag === 'nexus-sync') {
    event.waitUntil(syncOfflineQueue());
  }
});

function syncOfflineQueue() {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  });
}

// Recebe mensagens da página
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
