const CACHE_NAME = 'central-tk-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
    // Activar inmediatamente el nuevo service worker
    self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Tomar control de todas las páginas inmediatamente
    return self.clients.claim();
});

// Estrategia: Network First, fallback a Cache
// Esto asegura que siempre obtengas la versión más reciente de Supabase
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, clónala y guárdala en cache
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, intenta obtener del cache
                return caches.match(event.request);
            })
    );
});
