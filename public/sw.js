const CACHE_NAME = 'os-list-v47';

const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=6',
    './js/app.js?v=46',
    './js/supabase-config.js',
    './manifest.json',
    './icon-512.png',
    './sounds/check.mp3',
    './sounds/finished.mp3',
    './sounds/remove.mp3',
    './sounds/add.mp3',
    './sounds/refresh.mp3'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Network first for HTML, JS and CSS to avoid cache traps
    if (event.request.mode === 'navigate' || 
        event.request.destination === 'script' || 
        event.request.destination === 'style') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Update cache with fresh version
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache first for other assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
