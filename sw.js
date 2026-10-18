const CACHE_NAME_APP = 'cyclenavi-app-v3';
const CACHE_NAME_TILES = 'cyclenavi-tiles-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME_APP).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME_APP && key !== CACHE_NAME_TILES) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 国土地理院タイル / OSMタイルのキャッシュ
  if (url.hostname.includes('cyberjapandata.gsi.go.jp') || url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE_NAME_TILES).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const res = await fetch(event.request);
          if (res.status === 200) {
            cache.put(event.request, res.clone());
          }
          return res;
        } catch (err) {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 静的アセット
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
