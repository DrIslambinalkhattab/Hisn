const PREFIX = 'hisn-almuslim-';
const CACHE = PREFIX + 'v3';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => (k.startsWith(PREFIX) || k === 'hisn-v1' || k === 'hisn-v2') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const inScope = url.href.startsWith(self.registration.scope);
  const allowedCDN = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com';
  if (!inScope && !allowedCDN) return;

  // ملفات الصوت (الأذان والتذكيرات): يتعامل معها المتصفح مباشرة بدون الكاش (طلبات Range)
  if (url.pathname.includes('/audio/')) return;

  // الصفحات: الشبكة أولًا، والكاش عند انقطاع الإنترنت
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', clone)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // باقي الملفات: من الكاش فورًا + تحديث في الخلفية
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(req, clone)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
