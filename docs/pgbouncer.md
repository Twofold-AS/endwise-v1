# PgBouncer (F13-01)

Scaleway Managed PostgreSQL har **ikke** innebygd pooler. Vi kjører **vår**
PgBouncer som Scaleway Serverless Container (`infra/pgbouncer`):

- `min_scale = 1`, én prosess, port **6432**
- `pool_mode = transaction`, `max_client_conn = 1000`, `default_pool_size = 20`
- TLS mot Scaleway Postgres (`server_tls_sslmode = require`). **Klient-TLS
  mot bouncer er av** — listen 6432 har ingen `client_tls_*`. node-pg
  skal derfor **ikke** sende `ssl` mot `:6432`.
- `auth_type = scram-sha-256` (matcher Managed PostgreSQL)
- Host/bruker/passord via container-env (`PG_HOST`, `PG_PORT`, `PG_DATABASE`,
  `PG_USER`, `PG_PASSWORD`). Ingenting av det i git.

⛔ Ikke Neon. ⛔ Ikke Scaleway Serverless SQL (ødelegger LISTEN/NOTIFY).

## Hva som peker hvor

| Variabel | Hvem | Hvor |
|---|---|---|
| `DATABASE_URL` | eier | Scaleway Managed PostgreSQL **:5432** / **:19800** (direkte, med TLS). Blir stående. Migrate, drizzle-kit, `db:grants` / `db:setup`, stream LISTEN (`pg.Client`). |
| `APP_DATABASE_URL` | app-rolle (RLS) | **Når containeren er oppe:** PgBouncer-hosten **:6432** (klient-TLS av). Runtime (web / tRPC / auth / magic-link / cron). Lokalt: Docker `:5432`. |

## Mikael — Vercel (preview + production)

Agenten setter ikke secrets. Når containeren svarer på 6432:

1. Sett `APP_DATABASE_URL` i **Preview** og **Production** til pooler-URL-en
   (app-rolle, host:**6432**). Hosten er den Scaleway gir containeren — ikke
   finn på navn i git. Klient-TLS er av; `pgConnectionConfig` setter ikke
   `ssl` mot port 6432. `sslmode=disable` i URL-en er unødvendig og blir
   strippet uansett.
2. La `DATABASE_URL` stå på Scaleway Managed PostgreSQL **:5432** / **:19800**
   (eier, med TLS). Ikke flytt eier gjennom pooleren.

Pool `max: 5` mot PgBouncer `:6432` (låst). Direkte Managed Postgres
(`:5432` / `:19800`) forblir `max: 1` per isolate — det plasteret gjelder
fortsatt når runtime peker forbi pooleren.

`withTenant` / `withPlatformAdmin` / `withPlatformInspect` går gjennom
`tenantTxGate` (`TENANT_TX_CONCURRENCY = 2`). tRPC-batch bruker samme tall
(`TRPC_BATCH_CONCURRENCY = 2`). Chrome (`session.me`, `forhandler.kort`,
`helpdesk.ulesteAntall`, `billing.subscription`) er en egen httpBatch, så
sidebaren ikke venter på lager/kunder/jobber. `connectionTimeoutMillis` er
5000 (ikke 0). `prepare: false` og klient-TLS-hopp mot `:6432` står.
