// オフライン対応の Service Worker。
// ビルド時に vite.config.ts のプラグインが下の BUILD を書き換え、
// 成果物のバージョン（内容のハッシュ）とプリキャッシュするファイル一覧を埋め込む。
// ページ遷移はネットワーク優先（オフライン時はキャッシュ）、同一オリジンの静的ファイルはキャッシュ優先にする。
const BUILD = {"version":"c55430d6b885","assets":["./assets/index-Bqor8ypu.css","./assets/index-DUlWgH-C.js","./icon-180.png","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./icon.svg","./","./manifest.webmanifest"]};
const CACHE_PREFIX = 'standby-';
const CACHE = `${CACHE_PREFIX}${BUILD.version}`;

self.addEventListener('install', (event) => {
  // HTTP キャッシュを経由せず最新のファイルを取得してプリキャッシュする
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(BUILD.assets.map((url) => new Request(url, { cache: 'reload' })))),
  );
  // 初回インストール時は待機せずにそのまま有効化される。
  // 更新時は表示中の画面を壊さないよう、ページから SKIP_WAITING を受け取るまで待機する。
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // 天気 API など外部への通信はキャッシュしない
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./', copy));
          }
          return res;
        })
        .catch(() => caches.match('./', { cacheName: CACHE }).then((hit) => hit || caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
