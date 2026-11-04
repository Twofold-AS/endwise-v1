# Rapport — 04.11.2026 — Prod-login etter #207 (F38-04)

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F38-04 | Diagnostisert og fikset «Kunne ikke logge inn» etter OTP. `vercel-migrate` kjører på Vercel production (Turbo slipper `DATABASE_URL` gjennom). Bygget feiler hvis URL mangler. Web-build hasher drizzle/scripts så remote cache ikke hopper over migrate. |

## 2. Hva gikk galt

Ikke auth-origin, cookie eller manglende bruker. Tre funn:

1. **Vercel production-bygg `bb632db` / `dpl_2DjgnpmJq3Lzsg5aCaPMkn77ppee`:** `[db] hopper over migrate (DATABASE_URL mangler)`. Variablen finnes i Vercel (secret, production+preview), men Turbo 2 strict-mode sendte den ikke inn i `@endwise/web:build`.
2. **`migrate-prod.yml` på main:** `DATABASE_URL-secret mangler i GitHub` → exit 0. 0057/0058 kjørte ikke.
3. **Runtime 16:40 og 16:43 UTC (17:40 / 17:43 Oslo)** på `/api/auth/[...all]`: `column "kontekst" of relation "session" does not exist` (42703) ved `createSession`. Kolonnen kommer i 0051. Bruker-rad finnes (OTP gikk gjennom; `user_id` i insert). `BETTER_AUTH_URL` / `trustedOrigins` / cookie-domene var ikke feilen — verify nådde databasen. Domener `platform.endwise.no` og `*.endwise.no` er allerede verifisert.

## 3. Fikser

- `vercelMigrateBeslutning`: `VERCEL_ENV=production` er signalet (allerede i `globalEnv`). Production uten `DATABASE_URL` → exit 1.
- `turbo.json` `globalPassThroughEnv`: `DATABASE_URL`, `VERCEL`, `ENDWISE_GA_LIVE` (ikke `globalEnv` — hemmelighet skal ikke i cache-hash).
- `apps/web/turbo.json` inputs på migrate-script + drizzle.

## 4. Neste steg

Hold-rutinen squash-merger når CI er grønn. **Ikke merge fra agent.** Etter deploy: se etter `[db] vercel-migrate ferdig` i prod-byggloggen. Mikael logger inn på nytt med ny kode.

## 5. Hva Mikael må gjøre

**Må etter squash-merge:** vente til production-deploy er ferdig, så logge inn igjen på https://platform.endwise.no/logg-inn (ny 5-sifret kode). Første vellykkede migrate kjører 0051–0058: `session.kontekst`, seed `mikkis@twofold.no` som `endwise_admin`, slett forhandlere.

**Trenger ikke:** ny DNS. `platform.endwise.no` og `*.endwise.no` er verifisert. Ingen ny Vercel-env — `DATABASE_URL` er allerede satt.

**Valgfritt:** GitHub secret `DATABASE_URL` (Scaleway eier, `:5432`) så `migrate-prod.yml` er reserve. Slett `ENDWISE_WHITE_LABEL` i Vercel (ubrukt).
