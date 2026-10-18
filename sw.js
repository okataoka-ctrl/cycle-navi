const CACHE_NAME_APP = 'cyclenavi-app-v2';
const CACHE_NAME_TILES = 'cyclenavi-gsi-tiles-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 静的ファイルの事前キャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME_APP).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 古いキャッシュのクリーンアップ
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

// キャッシュ戦略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. 国土地理院タイル（Cache First: 圏外でも閲覧可能にする）
  if (url.hostname === 'cyberjapandata.gsi.go.jp') {
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
          // オフライン時のフォールバック（透明ピクセル等）
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 2. その他のアセット
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});