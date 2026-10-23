# Øktrapport 23.10.2026 — F0-15 sikkerhetsheadere, CI-pin og Hono

## 1. Hva er gjort (F0-15)

Egen PR mot `main`, startet fra `cursor/avhengigheter-sikkerhet-6935` fordi #181 ikke er merget. Ingen UI-/designendringer.

- **Sikkerhetsheadere** i `apps/web/next.config.ts` `headers()`: CSP (det appen trenger i nettleseren), `frame-ancestors 'none'` + `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Mistral-kall er server-side og står ikke i `connect-src`. Widget/Framer er JS+CORS, ikke iframe — DENY gjelder også `/widget/*` (JSON-API).
- **CORS (ZAP 10098):** Ingen `Access-Control-Allow-Origin: *`. `widgetCors` ekko-er kun `normalizeOrigin` (http/https). `Origin: null` og `*` settes ikke.
- **ZAP** `fail_action: true` (0 FAIL-NEW på #181). Fjernet `actions: write` på ZAP-jobben.
- **pnpm-workspace.yaml:** overrides fra `>=` til `^`. `minimumReleaseAge: 1440`.
- **GitHub Actions** pinnet til SHA i `security.yml` og `ci.yml`. `dependency-check/Dependency-Check_Action` pinnet til `1e54355…` (main@2025-12-10; tag 1.1.0 er fra 2021).
- **Hono** `^4.12.30` → `^4.13.11` (løst **4.13.13**, GHSA-5r4p-p66f-jhc7 / GHSA-crvj-82cr-hjcx). `@hono/node-server` `^2.1.3` (løst 2.1.5). Overrides: vitest `^4.1.11` (4.1.12), esbuild `^0.28.1`, qs `^6.16.0` (6.16.1). `pnpm audit` er **0** (også low/moderate).
- **GDPR-review (#180):** `ai-inngang.ts` / `hentKjenteKundenavn` finnes ikke på denne basen (#180 er umerget). Hoppet over.

## 2. Hva gikk galt

Alt gikk som planlagt for punktene som kunne gjøres på denne basen. GDPR-fiksene fra #180 er bevisst ikke kopiert inn (ville blandet to PR-er). Context7 MCP var ikke tilgjengelig; Next/Hono/pnpm-dokumentasjon hentet fra offisielle kilder.

## 3. Fikser

| Punkt | Løsning |
|---|---|
| Manglende CSP / XFO / nosniff / Referrer / Permissions | `sikkerhetsHeadere()` i Next `headers()` |
| ZAP 10098 `ACAO: *` | Aldri `*` i Next. Widget ekko-er normalisert origin |
| ZAP ikke blokkerende | `fail_action: true` |
| `actions: write` på ZAP | Fjernet (kun contents + deployments) |
| Floating `@main` / `@v4` | SHA-pin |
| Hono moderate | 4.13.11 |
| `>=`-overrides | `^` + `minimumReleaseAge: 1440` |

## 4. Neste steg

- F0-15 forblir **progress**: pentest, rød-team-evals.
- GDPR-cachen (`hentKjenteKundenavn` skal ikke cache `[]` ved DB-feil, kopi/frosset array, e2e via `runAgent`/`streamAgentChat`) hører hjemme i #180 når den merkes, eller som oppfølging etter merge.
- Vercel kan fortsatt sette `ACAO: *` på `/_next/static` (CDN). Det er WARN, ikke FAIL, og røres ikke her.
- Ikke merge. CI, Vercel-preview og Security-gate må bli grønne.
