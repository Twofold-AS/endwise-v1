# Rapport — PgBouncer :6432 uten klient-TLS (login-500)

**Dato:** 02.09.2026 · F13-01 · `cursor/pgbouncer-no-client-tls-6432-4caf`

## 1. Hva er gjort (per roadmap-ID)

- **F13-01:** `pgConnectionConfig` / `pgPoolConfig` setter ikke `ssl` når URL-porten er **6432** (vår PgBouncer: listen uten klient-TLS, `server_tls` bare mot Postgres). Localhost/Docker urørt. Andre fjern-porter (`:5432` / `:19800`) beholder `ssl: { rejectUnauthorized: false }` for Scaleway Managed PostgreSQL.
- Enhetstester i `packages/db/test/pg-ssl.test.ts`: localhost uten ssl, fjern `:19800`/`:5432` med `rejectUnauthorized: false`, fjern `:6432` uten ssl-objekt (inkl. `pgPoolConfig` max 1).
- `docs/pgbouncer.md`: `APP_DATABASE_URL` → host:6432, klient-TLS av; `DATABASE_URL` blir på Managed Postgres `:5432`/`:19800` med TLS.
- Roadmap F13-01 notert; status forblir `progress`.

Ingen Ronny-UI. Ingen Vercel-env. Ingen hemmeligheter lest.

## 2. Hva gikk galt

Rotårsaken stemte: koden strippet `sslmode` og tvang deretter `ssl` mot **alle** ikke-localhost-hoster. `sslmode=disable` i Vercel kunne ikke hjelpe. Alt gikk som planlagt etter verifisering.

## 3. Hvilke fikser ble gjort

Port **6432** er bryteren. `withoutPgSslQueryParams` kjører fortsatt (så `sslmode=require` på en kopiert pooler-URL ikke tvinger SSL via node-pg), men `ssl`-nøkkelen settes ikke.

## 4. Neste fase / neste steg

Draft PR. Ikke merge. Mikael deployer / verifiserer login på endwise.no etter at preview/prod har koden (APP_DATABASE_URL mot :6432 trenger ikke endres).
