// Muda o nome do cache a cada versao para forcar atualizacao
const CACHE_NAME = 'nexus-v3';

const ASSETS = [
  '/Performance-luiz/index.html',
  '/Performance-luiz/manifest.json'
];

// Instala
self.addEventListener('install', function(event) {
  self.skipWaiting(); // Ativa imediatamente sem esperar
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() { return; });
    })
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // Assume controle imediato
    })
  );
});

// Network first - sempre tenta buscar versao mais recente
self.addEventListener('fetch', function(event) {
  // Firebase, Unsplash e CDNs externos: passa direto
  if (event.request.url.indexOf('firebase') >= 0 ||
      event.request.url.indexOf('googleapis.com') >= 0 ||
      event.request.url.indexOf('unsplash.com') >= 0 ||
      event.request.url.indexOf('cdnjs') >= 0 ||
      event.request.url.indexOf('fonts.g') >= 0) {
    event.respondWith(fetch(event.request).catch(function() {
      return new Response('', { status: 503 });
    }));
    return;
  }

  // Para arquivos locais: Network first, cache como fallback
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('/Performance-luiz/index.html');
      });
    })
  );
});

// Recebe mensagem para pular espera
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
