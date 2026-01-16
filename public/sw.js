// Minimal Service Worker to satisfy PWA requirements
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through fetch handler
    event.respondWith(fetch(event.request));
});
