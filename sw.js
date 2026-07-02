const CACHE_NAME = "road-to-26-v27";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css?v=60",
  "/third-place-combinations.js?v=1",
  "/app.js?v=60",
  "/manifest.json",
  "/assets/road-to-26.png",
  "/api/openfootball/worldcup2026",
  "/api/zafronix/tournament2026"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});
