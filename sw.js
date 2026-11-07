// Service worker: guarda o app e tudo que já foi visto para abrir mais rápido (e offline)
const SHELL = 'pokedex-shell-v1';
const DATA = 'pokedex-data-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Rede primeiro para o app (pega atualizações), cache se offline
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  if (/pokeapi\.co|raw\.githubusercontent\.com|translate\.googleapis\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host) && !/\.(ogg|mp3)$/.test(url.pathname)) {
    // Cache primeiro para dados e imagens
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(DATA).then(c => c.put(req, copy)); }
      return r;
    })));
  }
});
