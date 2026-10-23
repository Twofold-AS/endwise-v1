# Øktrapport 23.10.2026 — F0-15 sikkerhetsheadere, CI-pin og review-fiks

## 1. Hva er gjort (F0-15)

Egen PR mot `main` (#182), startet fra `cursor/avhengigheter-sikkerhet-6935` fordi #181 ikke er merget. Ingen UI-/designendringer. Review GO-with-fixes på samme branch.

- **Sikkerhetsheadere** i `apps/web/next.config.ts` `headers()`: eksakt CSP, `frame-ancestors 'none'` + `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy, `report-to` + `Reporting-Endpoints`, HSTS `max-age=63072000; includeSubDomains; preload` (ikke i `next dev`).
- **connect-src:** konkret Sentry-ingest-host fra DSN. Ingen `*.sentry.io`. `SENTRY_DSN` er tom (F0-14); EU-region er `*.ingest.de.sentry.io` når DSN peker dit.
- **CORS (ZAP 10098):** Ingen `Access-Control-Allow-Origin: *` i Next. Kilden til `*` på rot-HTML er Vercel (`server: Vercel`) på **preview og produksjon** `endwise.no` (prerender + `x-vercel-cache: HIT`). Ikke Deployment Protection (preview 200 uten auth).
- **Widget-CORS:** speiler kun origins i nøkkelens `allowedOrigins`. Alltid `Vary: Origin`. Avviser `http:` i prod. Klient sender `X-Widget-Key`.
- **ZAP:** `fail_action: true` + `cmd_options: '-I'`. 10020/10021/10038/10063 FAIL. **10015, 10055, 10098 WARN** (ikke IGNORE).
- **Hono** `secureHeaders` CSP `{ defaultSrc: ["'none'"], frameAncestors: ["'none'"] }`.
- **ci.yml** `permissions: contents: read`.
- **Auth-ruter:** `/signin` og `/2fa-oppsett` har `no-store` (testet).
- **Framer-plugin** vite-bygg grønt med `esbuild ^0.28` — override uendret.
- **Oppfølgingssak:** `docs/sikkerhet/oppfolging-f0-15.md` (nonce + `strict-dynamic` via `proxy.ts`; fjern `baseline-browser-mapping@2.11.31`-unntak etter 2026-10-23 18:27 UTC). `gh` er read-only, derfor docs-TODO ikke GitHub-issue.
- **Hono** `^4.13.11` (4.13.13). Overrides: vitest/esbuild/qs. Actions SHA-pinnet.
- **GDPR-review (#180):** hoppet over — filene finnes ikke på denne basen.

## 2. Hva gikk galt

Alt gikk som planlagt for punktene som kunne gjøres på denne basen. GDPR-fiksene fra #180 er bevisst ikke kopiert inn. Context7 MCP krevde auth; Hono-CSP-API verifisert mot kjøring (`/health`). `gh` kan ikke opprette issues — oppfølging ligger i docs.

## 3. Fikser

| Punkt | Løsning |
|---|---|
| ZAP 10015/10055/10098 IGNORE | WARN + `cmd_options: '-I'` |
| CSP ikke eksakt i test | `security-headers.test.ts` sjekker hele policy-strengen |
| ACAO `*` på rot-HTML | Vercel på preview **og** prod `endwise.no` — dokumentert |
| Cache på /signin og /2fa-oppsett | `no-store` + test |
| HSTS | `max-age=63072000; includeSubDomains; preload` |
| Widget-CORS speilet enhver https | kun nøkkelens `allowedOrigins` + `Vary` + avvis `http:` i prod |
| `*.sentry.io` i connect-src | konkret host fra DSN + `report-to` |
| Hono uten CSP | `default-src 'none'` + `frame-ancestors 'none'` |
| ci.yml uten permissions | `contents: read` |
| esbuild 0.28 vs framer-plugin | vite-bygg OK — override uendret |
| nonce / mapping-unntak | `docs/sikkerhet/oppfolging-f0-15.md` |

## 4. Neste steg

- F0-15 forblir **progress**: pentest, rød-team-evals, nonce+strict-dynamic, fjern mapping-unntak etter 24 t.
- GDPR-cachen hører hjemme i #180.
- Ikke merge. CI, Vercel-preview og Security-gate må bli grønne.
