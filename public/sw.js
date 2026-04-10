const CACHE_NAME = 'os-list-v61';
const ASSETS = [
    './',
    './index.html',
    './css/style.css?v=8',
    './js/app.js?v=60',
    './js/supabase-config.js',
    './manifest.webmanifest',
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
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
