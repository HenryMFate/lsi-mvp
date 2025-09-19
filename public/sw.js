self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('ma-v12').then(cache => cache.addAll(['/','/manifest.json'])));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
    if (allClients && allClients.length) {
      const client = allClients[0];
      client.focus();
    } else {
      clients.openWindow('/');
    }
  })());
});
