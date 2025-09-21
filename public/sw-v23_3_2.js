const CACHE = 'ma-v23.3.2';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/','/manifest.json'])));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k=>caches.delete(k))))).then(()=>self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
