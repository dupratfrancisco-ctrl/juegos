// Guarda la app para que abra rápido y sin señal; las partidas igual necesitan internet.
const CACHE = "agente-secreto-v21";
const IDS = ["argentina","italia","turquia","suiza","alemania","canada","holanda","noruega","granbretana","eeuu","bolivia","uruguay","peru","irlanda","suecia","francia","espana","cuba","paraguay","mexico","israel","brasil","irak","chile"];
const SHELL = ["./", "index.html", "mqtt.min.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", ...IDS.map(id => `img/${id}.jpg`)];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("agente-secreto-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // La página siempre se busca primero en la red para recibir actualizaciones.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
