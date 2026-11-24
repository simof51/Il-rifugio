// Service worker: rende il gioco giocabile offline dopo la prima apertura.
// File del gioco: prima la rete (così gli aggiornamenti arrivano subito), poi la cache.
// Librerie e font esterni: prima la cache, poi la rete.
const CACHE = 'rifugio-cache-v3';
const SHELL = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/namespace.js', 'js/levels/inverno.js', 'js/state.js', 'js/build.js', 'js/hud.js', 'js/game.js', 'js/main.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(SHELL);
    try { await c.add(new Request(THREE_URL, { mode: 'cors' })); } catch (err) { /* verrà messo in cache al primo uso */ }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === location.origin;
  const store = res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (sameOrigin) {
    e.respondWith(fetch(req).then(store).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(store)));
  }
});
