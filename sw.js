const CACHE_NAME = "ai-place-app-v14";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./public/icon.svg",
  "./src/app.js",
  "./src/components/MapView.js",
  "./src/components/RouteBottomSheet.js",
  "./src/hooks/useCurrentLocation.js",
  "./src/pages/Home.js",
  "./src/services/authService.js",
  "./src/services/geocodingService.js",
  "./src/services/googlePlacesService.js",
  "./src/services/mapService.js",
  "./src/services/placeReviewMetricsService.js",
  "./src/services/recommendation/index.js",
  "./src/services/recommendation/recommendationService.js",
  "./src/services/recommendation/routeRecommendationService.js",
  "./src/services/reviewService.js",
  "./src/services/routingService.js",
  "./src/styles/app.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.ok || event.request.url.includes("tile.openstreetmap.org")) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cachedResponse) => cachedResponse || caches.match("./index.html"))
      )
  );
});
