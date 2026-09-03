# Rapport — 03.09.2026 — audit_log + tenants INSERT som eier under FORCE RLS

**Roadmap:** F1-06 (`done`), F0-04 (`done`), F5-26 (`done`) — migrasjon 0037
**Godkjenning:** produksjonsfeil på endwise.no (ikke ny flate)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-06** | `flags.setGlobal` (`feature_flag.set_global`, bl.a. `dev-mode`) 500-et på `insert into audit_log`. Flaggraden i `feature_flags` (ingen RLS) ble skrevet. |
| **F5-26** | `tenants.create` 500-et på `insert into tenants` (live dealer, enterprise). Ikke (bare) audit. |
| **F0-04** | Samme audit-sti som setGlobal. |

**Rotårsak (verifisert mot kode + Mikaels SQL, ikke gjettet):** Prod `APP_DATABASE_URL` kobler som Postgres-rolle `endwise` (tabelleier) gjennom PgBouncer :6432, ikke som `endwise_app`. FORCE RLS gjelder eieren. Schema-policyene er `TO authenticated` + withCheck `id`/`tenant_id` = `app.tenant_id`. Eieren er ikke `authenticated`, så ingen INSERT-policy matcher. `tenants_platform_admin_read_owner` er SELECT-only — INSERT/UPDATE som eier ga 0 rader / RLS-brudd selv med `app.platform_admin` + `app.tenant_id` satt. `audit_log_slett_insert` krever slett-GUC og dekker ikke API-mutasjoner. `withTenant` **var** satt (ny tenant-id i create, sesjonstenant i setGlobal) — GUC alene holder ikke uten eier-policy.

Fikset i grants + migrasjon **0037_owner_rls_insert** (idempotent DROP/CREATE):

- `tenants_platform_admin_insert_owner` — TO PUBLIC INSERT, `platform_admin` + eier-only + `id = app.tenant_id`
- `tenant_modules_platform_admin_insert_owner` — samme, for pakke-rader i create
- `invitations_platform_admin_insert_owner` — eier-invite etter create (`opprettEier`)
- `audit_log_tenant_insert_owner` — eier-only, `tenant_id = app.tenant_id` **eller** `platform_admin` (setGlobal bruker bare withTenant)

`createTenant` / `createTenantShell` setter `app.platform_admin` transaksjons-lokalt i samme `withTenant` som INSERT. Append-only på `audit_log` urørt (ingen UPDATE/DELETE). FORCE RLS urørt. App-rollen (`authenticated` / `endwise_app`) bruker fortsatt de gamle policyene.

Etter merge: **`pnpm db:setup`** på Scaleway (`db:migrate` kjører 0037; `db:grants` sjekker at de fire policyene finnes).

---

## 2. Hva gikk galt

Alt gikk som planlagt i utredningen. Docker-eieren er superuser og bypasser FORCE RLS, så integrasjonstester alene hadde ikke fanget prod-feilen; kildetestene i `apps/api/test/audit-log-owner-insert.test.ts` + `force-rls.test.ts` ③f er stand-in. Context7 MCP ble ikke brukt (ingen ny stack).

---

## 3. Hvilke fikser ble gjort

1. Eier-INSERT-policyer i `grants.sql` + 0037.
2. `createTenant` setter `platform_admin` i samme tx som tenants-INSERT.
3. `db:grants` exit 1 hvis policyene mangler.
4. Kontraktstester + force-rls ③f.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter: skru `dev-mode` på `/endwise/innstillinger` og opprett en live forhandler på `/endwise/forhandlere`. Ikke bytt Vercel-bruker til `endwise_app` som eneste fiks — koden skal virke som eier. F1-07 forblir `progress`.
