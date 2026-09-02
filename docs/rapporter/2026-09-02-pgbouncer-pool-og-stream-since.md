# Rapport — PgBouncer pool max 5 + stream.since uten sesjon

**Dato:** 02.09.2026 · F13-01 / F13-03 · `cursor/pgbouncer-pool-max-stream-since-120d`

## 1. Hva er gjort (per roadmap-ID)

- **F13-01:** `pgPoolConfig` bruker `max: 5` når URL-porten er **6432** (vår PgBouncer, transaction-mode). Direkte fjern host (`:5432` / `:19800`) forblir `max: 1`. Localhost forblir `max: 5`. TLS-reglene er urørt (ingen `ssl` mot `:6432`).
- Enhetstester i `packages/db/test/pg-ssl.test.ts` låser de tre tilfellene. `docs/pgbouncer.md` er oppdatert (plasteret «max 1 overalt» er borte).
- **F13-03:** LiveSync poller ikke `stream.head` / `stream.since` og åpner ikke SSE når `useSession` mangler bruker. `createRequestContext` returnerer uautentisert context uten `requireSession`/`getSession` når `endwise.session_token` (eller `__Secure-`) mangler. `protectedProcedure` kaster fortsatt 401. Auth-produktregler (idle, absolut, 2FA) er urørt når kaken finnes.

Ingen Ronny-UI. Ingen Vercel-env. Ingen hemmeligheter.

## 2. Hva gikk galt

Alt gikk som planlagt etter TDD (rød test for `:6432` max 1 → grønn max 5; rød test for `requireSession` uten kake → grønn hopp).

Rotårsak produksjonstreghet: `max: 1` per Vercel-isolat mot pooleren serialiserte alle DB-kall. Rotårsak 401-flom: LiveSync i app-shellet poller hvert 8. s så lenge `sessionStorage` har cursor, også etter utlogging; hver treff gikk gjennom `requireSession`.

## 3. Hvilke fikser ble gjort

Port **6432** er bryteren for pool-størrelse (samme bryter som klient-TLS). Sesjonskake er bryteren for tRPC-context-oppslag. Klienten slutter å spørre når det ikke er sesjon.

## 4. Neste fase / neste steg

Draft PR. Ikke merge. Mikael peker `APP_DATABASE_URL` på `:6432` (allerede planlagt) og verifiserer at prod ikke lenger føles låst, og at utloggede treff ikke lenger spammer `GET /trpc/stream.since` 401.
