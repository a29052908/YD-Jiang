const CACHE_NAME = 'tandry-v1';
const CACHE_FILES = [
  '/YD-Jiang/',
  '/YD-Jiang/login.html',
  '/YD-Jiang/手動報刀_v10.html',
  '/YD-Jiang/dashboard.html',
  '/YD-Jiang/Baodao.html',
  '/YD-Jiang/manifest.json',
  '/YD-Jiang/icon-192.png',
  '/YD-Jiang/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
