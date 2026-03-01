const CACHE_NAME = "immoanalyse-v2";

const STATIC_ASSETS = [
  "index.html",
  "offline.html",
  "manifest.webmanifest",

  "engine/engine.js",
  "engine/scoring.js",
  "engine/ratios.js",
  "engine/garanties.js",
  "engine/diagnostic.js",
  "engine/crossAnalysis.js",
  "engine/ticket.js",
  "engine/types.js",

  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match("offline.html")))
  );
});
