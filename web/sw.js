// Service worker: rende il gioco giocabile offline dopo la prima apertura.
// File del gioco: prima la rete (così gli aggiornamenti arrivano subito), poi la cache.
// Three.js e il font sono dentro il progetto (lib/, fonts/): nessuna richiesta a server esterni.
const CACHE = 'rifugio-cache-v46';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/namespace.js', 'js/levels/common.js', 'js/levels/inverno.js', 'js/levels/primavera.js', 'js/levels/estate.js', 'js/levels/autunno.js', 'js/levels/cities.js', 'js/levels/places.js','js/settings.js', 'js/i18n.js', 'js/extras.js', 'js/meta.js','js/shop.js', 'js/billing.js', 'js/ads.js', 'js/state.js', 'js/env.js', 'js/fauna.js', 'js/audio.js', 'js/build.js', 'js/hud.js', 'js/game.js', 'js/main.js',
  'lib/three.min.js', 'fonts/fredoka.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  const store = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  e.respondWith(fetch(req).then(store).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
