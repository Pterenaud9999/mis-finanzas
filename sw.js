const CACHE = "mf-20261124100844";
const SHELL = ["./", "index.html", "shim.js", "vendor/supabase.js", "manifest.webmanifest", "vendor/tabler/tabler-icons-300.min.css", "vendor/roboto/roboto-latin-400-normal.woff2", "vendor/roboto/roboto-latin-500-normal.woff2", "vendor/roboto/roboto-latin-700-normal.woff2", "icon-192.png", "icon-512.png", "icon-maskable.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){ e.respondWith(caches.match(e.request).then(h => h || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }))); return; }
  if (u.origin !== location.origin) return; // Supabase va directo a la red
  if (e.request.mode === "navigate"){ // red primero (para recibir actualizaciones), caché si no hay internet
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put("index.html", c)); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok){ const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })));
});
