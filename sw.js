const CACHE_NAME = 'samara-studio-v9';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './google-sheets-script.gs',
  './manifest.json',
  './icon.svg',
  './samara-foto.jpg',
  './assets/services/mao.jpg',
  './assets/services/pe.jpg',
  './assets/services/pe-mao.jpg',
  './assets/services/unha-gel.jpg',
  './assets/services/banho-gel.jpg',
  './assets/services/esmalte-gel.jpg',
  './assets/services/manutencao.jpg',
  './assets/services/sobrancelhas.jpg',
  './assets/services/henna.jpg'
];

// Instalação: Cache dos arquivos estáticos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando assets estáticos...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições: Stale-While-Revalidate para assets locais e Network-first para APIs
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Não interferir com chamadas diretas ao Supabase ou Google Apps Script (Planilha)
  if (
    requestUrl.hostname.includes('supabase.co') ||
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.hostname.includes('googleusercontent.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Retorna do cache se existir e busca atualização em segundo plano
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback em caso de offline total
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
