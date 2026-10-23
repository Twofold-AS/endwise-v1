# Øktrapport 23.10.2026 — F0-15 avhengigheter (Next/MapLibre/audit)

## 1. Hva er gjort (F0-15)

Egen PR mot `main` (ikke #178 / #180). Mål: `pnpm audit --audit-level high` uten critical/high.

- **Next** `16.2.11` → **`16.4.2`** (siste stabile 16.x). Lukker kritiske RCE (`use cache`, image opt SVG/AVIF, next/og, Windows) og high (SSRF image opt, Server Actions DoS). Override tvinger samme versjon i workflow/Sentry/better-auth.
- **MapLibre** `^5.19.0` → **`^6.4.1`** (løst `6.15.0`). XSS GHSA-jrc7-96c5-q579 har ingen 5.x-patch. ESM-only: namespace-import + `setWorkerUrl` mot `maplibre-gl-worker.mjs`. Ingen visuell endring på globen / top-bar / Mobbin.
- **Sentry** `^10.65.0` → **`10.76.2`** (tunnel-bypass ≥10.75.2). `withSentryConfig` importeres fra `@sentry/nextjs/config`.
- **Twilio** `^6.0.2` → **`^6.2.0`**. **Vite** (framer-plugin) `^6.0.0` → **`^6.4.5`**.
- Transitive highs via overrides: sharp ≥0.35.5, postcss ≥8.5.23, brace-expansion 2.1.7/5.0.12, undici ≥7.29.1, axios ≥1.20.0, follow-redirects, devalue, source-map-js, http-cache-semantics, browserslist, vite 6.4.5/8.3.5, piscina, proxy-addr, `@xhmikosr/decompress`, fast-uri 3.1.9.
- Next 16.4-breaking: fjernet inert `experimental.viewTransition` (flagget leses ikke lenger; View Transitions er stabile uten Next-flagg).
- ZAP venter på Vercel-preview via GitHub Deployments API — ikke `example.invalid`.
- Biome ignorerer `next-env.d.ts` (Next-generert, «skal ikke redigeres»).

`pnpm audit --audit-level high` avslutter 0. Lokalt: lint, typecheck, test og `next build` (Turbopack 16.4.2) grønne.

## 2. Hva gikk galt

Alt gikk som planlagt etter at `experimental.viewTransition` ble fjernet (eneste typefeil i 16.4). Context7 MCP var ikke tilgjengelig; Context.dev krevde auth. Dokumentasjon hentet fra Next/MapLibre/Sentry-kilder. `lefthook install` i `prepare` feiler her pga. `core.hooksPath` — install med `--ignore-scripts`. Ingen produktfelt, priser, SMS, shop, sidebar, top-bar eller Mobbin-design rørt. #178 og #180 urørt.

## 3. Fikser

| Advisory / endring | Løsning |
|---|---|
| GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw, GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4, GHSA-vcvr-r3jv-pc5j critical (Next RCE) | next **16.4.2** + override |
| GHSA-p3m5-59mp-jv5r, GHSA-cjq9-62q9-8jv4 high (Next DoS/SSRF) | same |
| GHSA-jrc7-96c5-q579 critical (MapLibre XSS) | maplibre-gl **^6.4.1** |
| GHSA-mchm-gjx6-7h55 critical (Sentry tunnel) | @sentry/nextjs **10.76.2** |
| GHSA-wq5f-xc86-pv6w high (sharp/librsvg) | override sharp ≥0.35.5 |
| axios / follow-redirects / devalue / vite / undici / brace-expansion / fast-uri m.fl. high | overrides + twilio/vite-bumps |
| `experimental.viewTransition` TS2353 | flagget fjernet (inert i 16.4) |
| ZAP mot `example.invalid` | vent på `environment_url` fra Vercel-deployment |

## 4. Neste steg

- F0-15 forblir **progress**: OWASP Dependency-Check i samme CI-jobb (nås nå fordi audit er grønn), pentest, rød-team-evals.
- Low/moderate står (Hono 4.12.x, vitest 4.1.10, esbuild, qs, baseline-browser-mapping). Ikke hevet Hono — offentlig API-flate.
- Dependency-Check (NVD) kan fortsatt flagge CVE-er audit ikke kjenner. Begrunnelse: pnpm-gaten er den kanoniske high/critical-gaten; DC-funn vurderes i CI-loggen.
- Ikke merge. Vercel-preview og Security-gate må bli grønne på PR-en.
