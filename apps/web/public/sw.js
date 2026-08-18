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
 *
 * ══ ⚠️ 08.08.2026 — DENNE FILA SERVERTE GAMMEL KODE I DAGEVIS ══════════════
 *
 * Symptomet var «module factory is not available» og «Invalid DOM property
 * fill-rule» som kom tilbake uansett hvor mange ganger .next ble slettet,
 * dev-serveren restartet og nettleseren hard-refreshet.
 *
 * Årsaken var her: **en hard refresh omgår HTTP-cachen, men IKKE en service
 * worker.** SW-en satt foran alt, cachet `/_next/static/`-chunks med
 * `cached || network` — altså cache-first — og serverte dem videre lenge etter
 * at kilden var endret. Cache-navnet var dessuten konstant, så `activate`
 * ryddet aldri noe: `keys.filter((k) => k !== CACHE)` traff aldri seg selv.
 *
 * Verifisert: 30 `/_next/static/`-oppføringer lå i cachen i DEV, inkludert
 * Turbopacks HMR-klient.
 *
 * Tre ting er endret:
 *   1. **SW-en registreres ikke lenger i dev** (se `_shell/pwa-register.tsx`),
 *      og gamle registreringer avregistreres automatisk. Offline-støtte er en
 *      produksjonsfunksjon; i dev er den bare en måte å servere gammel kode på.
 *   2. **Cache-navnet er versjonert** — `v2` gjør at `activate` sletter hver
 *      eneste v1-cache som finnes på en enhet der ute. Bump ved hver
 *      strategiendring.
 *   3. **Dev-artefakter caches aldri**, uansett. Skulle noen registrere SW-en
 *      manuelt i dev (som vi gjorde for å bevise feilen), kan den ikke lenger
 *      servere en foreldet Turbopack-chunk.
 */

/**
 * ⚠️ BUMP VED HVER STRATEGIENDRING. Navnet er det eneste som får `activate` til
 * å rydde: den sletter alle cacher som ikke heter dette. Endres ikke navnet,
 * blir gamle oppføringer liggende for alltid.
 */
const CACHE = 'endwise-shell-v2';
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

/**
 * Dev-artefakter fra Turbopack/Next. Disse har ustabile stier og endres ved hver
 * eneste redigering — å cache dem er å garantere at noen før eller siden ser
 * gammel kode. De skal aldri i en cache, uansett miljø.
 */
function isDevArtifact(url) {
  return (
    url.pathname.startsWith('/__nextjs') ||
    url.pathname.includes('hmr') ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('%5Bturbopack%5D') ||
    url.searchParams.has('__nextDataReq')
  );
}

function isStaticAsset(url) {
  if (isDevArtifact(url)) return false;
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/logo/') ||
    /\.(?:svg|png|ico|webmanifest|woff2?)$/.test(url.pathname)
  );
}

/**
 * Bare ekte, vellykkede svar fra vår egen origin skal i cachen. Uten dette kan
 * en 404 eller et opaque svar bli liggende og bli servert igjen og igjen.
 */
function kanCaches(res) {
  return res?.ok === true && res.type === 'basic';
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
  // Dev-artefakter: la dem gå rett til nett, alltid.
  if (isDevArtifact(url)) return;

  if (request.mode === 'navigate') {
    // Network-first: online får du ALLTID fersk HTML, med ferske chunk-hasher.
    // Cachen er kun et sikkerhetsnett for kjelleren uten dekning.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (kanCaches(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy).catch(() => {}));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html'))),
    );
    return;
  }

  if (isStaticAsset(url)) {
    // Stale-while-revalidate. Trygt i PRODUKSJON fordi Next gir hver bygg nye,
    // innholds-hashede filnavn: endret innhold = ny URL = ingen gammel treff.
    // I dev ville det IKKE vært trygt — derfor registreres ikke SW-en der.
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(request);
        const network = fetch(request)
          .then((res) => {
            if (kanCaches(res)) c.put(request, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
