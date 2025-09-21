self.addEventListener('install',e=>{e.waitUntil(caches.open('ma-v31.1').then(c=>c.addAll(['/','/manifest.json'])))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
self.addEventListener('message', (e)=>{ if (e.data && e.data.type==='SKIP_WAITING') self.skipWaiting(); });


self.addEventListener('message', (e)=>{ if (e.data && e.data.type==='SKIP_WAITING') self.skipWaiting(); });
