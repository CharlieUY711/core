// Service worker mínimo: cachea el app-shell para arranque offline básico.
const CACHE = "tirada-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  // No cachear la API: siempre red.
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/api/")) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
