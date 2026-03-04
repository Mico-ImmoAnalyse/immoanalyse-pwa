self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  clients.claim();
});

// Pas de stratégie de cache agressive : toujours le réseau d'abord
self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});
