/*
 * F7-07 — Service Worker: offline-skall for mekaniker-PWA-en.
 *
 * Strategi (bevisst konservativ — vi cacher ALDRI API-svar/persondata):
 *   - Navigasjoner (mode 'navigate'): network-first → ved feil, fall tilbake til
 *     cachet side, ellers offline.html. Så mekanikeren mister ikke skallet i en
 *     kjeller uten dekning.
 *   - Statiske GET-assets (samme origin, _next/static, ikoner, manifest):
 *     stale-while-revalidate.
 *   - Alt annet (POST, /trpc, /api, /widget, cross-origin): rør ikke — går rett
 *     til nett. Statusendringer og persondata skal ALDRI ligge i en cache på enheten.
 */
const CACHE = 'endwise-shell-v1';
const PRECACHE = ['/offline.html', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {}),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/logo/') ||
    /\.(?:svg|png|ico|webmanifest|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // aldri cache POST/mutasjoner

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // aldri cache cross-origin
  // API-flater: aldri cache (persondata + mutasjoner).
  if (
    url.pathname.startsWith('/trpc') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/widget')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy).catch(() => {}));
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html'))),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(request);
        const network = fetch(request)
          .then((res) => {
            c.put(request, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
