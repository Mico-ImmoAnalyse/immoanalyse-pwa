// Version du cache (change-la si tu veux forcer une mise à jour)
const CACHE_NAME = "immoanalyse-v6";

// Installation : active immédiatement
self.addEventListener("install", event => {
  self.skipWaiting();
});

// Activation : supprime tous les anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  clients.claim();
});

// Stratégie : network first (toujours charger la version la plus récente)
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
