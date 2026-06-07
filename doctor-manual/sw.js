const CACHE = 'tandry-manual-v1';
const SHELL = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 外連圖片 (http tandrymed.com) 直接網路抓，不快取（mixed-content 問題由 index.html 處理）
  if (e.request.url.includes('tandrymed.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('')));
    return;
  }
  // Shell：cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
