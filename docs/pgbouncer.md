# PgBouncer (F13-01)

Scaleway Managed PostgreSQL har **ikke** innebygd pooler. Vi kjører **vår**
PgBouncer som Scaleway Serverless Container (`infra/pgbouncer`):

- `min_scale = 1`, én prosess, port **6432**
- `pool_mode = transaction`, `max_client_conn = 1000`, `default_pool_size = 20`
- TLS mot Scaleway (`server_tls_sslmode = require`)
- `auth_type = scram-sha-256` (matcher Managed PostgreSQL)
- Host/bruker/passord via container-env (`PG_HOST`, `PG_PORT`, `PG_DATABASE`,
  `PG_USER`, `PG_PASSWORD`). Ingenting av det i git.

⛔ Ikke Neon. ⛔ Ikke Scaleway Serverless SQL (ødelegger LISTEN/NOTIFY).

## Hva som peker hvor

| Variabel | Hvem | Hvor |
|---|---|---|
| `DATABASE_URL` | eier | Scaleway Managed PostgreSQL **:5432**. Blir stående. Migrate, drizzle-kit, `db:grants` / `db:setup`, stream LISTEN (`pg.Client`). |
| `APP_DATABASE_URL` | app-rolle (RLS) | **Når containeren er oppe:** PgBouncer-hosten **:6432**. Runtime (web / tRPC / auth / magic-link / cron). Lokalt: Docker `:5432`. |

## Mikael — Vercel (preview + production)

Agenten setter ikke secrets. Når containeren svarer på 6432:

1. Sett `APP_DATABASE_URL` i **Preview** og **Production** til pooler-URL-en
   (app-rolle, port **6432**). Hosten er den Scaleway gir containeren — ikke
   finn på navn i git.
2. La `DATABASE_URL` stå på Scaleway **:5432** (eier). Ikke flytt eier gjennom
   pooleren.

Pool `max: 1` i `createDb` er plaster til pooleren tar lasten.
