/* Offline support: pages load from the internet when available (so updates appear at once)
   and from the saved copy when there is no internet. */
const CACHE = 'nk-cache-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const put = res => { if (res && (res.status === 200 || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(r, c)); } return res; };
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(put).catch(() => caches.match(r, { ignoreSearch: true })));
    return;
  }
  const staticHost = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' ||
                     (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));
  if (staticHost) e.respondWith(caches.match(r).then(m => m || fetch(r).then(put)));
});
