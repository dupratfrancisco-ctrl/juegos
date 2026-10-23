// Guarda la app para que abra rápido y sin señal; las partidas online igual necesitan internet.
const CACHE = "clue-v12";
const SHELL = ["./", "index.html", "engine.js", "rooms.js", "mqtt.min.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("clue-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // La página y el motor se buscan primero en la red para recibir actualizaciones.
  if (req.mode === "navigate" || req.url.endsWith("engine.js")) {
    const key = req.mode === "navigate" ? "index.html" : "engine.js";
    e.respondWith(fetch(req, {cache:"no-cache"}).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); return r; }).catch(() => caches.match(key)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
