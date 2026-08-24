# Rapport — 24.08.2026 — tenants.slett HTTP 412 (F5-26)

**Roadmap:** F5-26 (`done`) — nytt steg 0024
**Godkjenning:** produksjonsfeil på endwise.no (ikke ny flate)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | `POST /trpc/tenants.slett` ga HTTP 412 («Slettingen stoppet på gjenværende koblinger i databasen»). Trace `80eab6c036e4f0b9f33f5e8a9752a6a5`, dpl_H7AceMM6rtzDMdE3DqXBXTfY8nCt, fra1, 578 ms. Vercel: SQLSTATE **23503**, constraint **`audit_log_tenant_id_tenants_id_fk`**. |

Rotårsak (verifisert mot logg, ikke gjettet): Scaleway-eieren `endwise` er ADMIN av `authenticated`, så **TO authenticated SELECT gjelder DEFINER**. `withPlatformAdmin` setter ikke `app.tenant_id` → UPDATE av `audit_log` ser 0 rader (stille) → INSERT `audit.redacted` ble værende på forhandleren → `DELETE FROM tenants` treffer ON DELETE RESTRICT. Samtidig: `EXECUTE` setter ikke `FOUND`, så barn-løkka hoppet over parts/stock/customers etter 0023 Quick-lager.

Fikset i `slett_forhandler` + grants + migrasjon **0024_slett_forhandler_barn**:
- `app.tenant_id` + `app.slett_tenant_id`
- TO PUBLIC SELECT på `audit_log`, `erasure_requests` og øvrige tenant-tabeller
- `audit.redacted` skrives på Endwise-tenanten (ikke slett-målet)
- `GET DIAGNOSTICS ROW_COUNT` i stedet for `FOUND` etter `EXECUTE`
- ærlig 412 med tabellnavn hvis noe faktisk gjenstår
- `audit_log` hard-slettes aldri; slug `endwise` nektes. **0026** sletter dealer-only `"user"` — se `2026-08-24-slett-forhandler-kontoer.md`.

Etter merge: **`pnpm db:setup`** på Scaleway (`db:migrate` kjører 0024; `db:grants` kjører grants + functions).

---

## 2. Hva gikk galt

Historiske hull (FORCE RLS SELECT slug, 0022 grants) var allerede tettet — 412 var **neste** ledd i samme klasse. Context7 MCP krevde auth og ble ikke brukt. Docker-eieren er superuser og bypasser FORCE RLS, så integrasjonstesten alene hadde ikke fanget prod-feilen; kildetestene er stand-in.

---

## 3. Hvilke fikser ble gjort

1. SELECT-policyer + `app.tenant_id` så DEFINER ser audit-rader.
2. Spor-INSERT på Endwise, ikke på slett-målet.
3. ROW_COUNT på dynamisk DELETE av tenant-rader (parts/stock/customers).
4. 412-melding inkluderer constraint/tabell.
5. README `db:setup` dokumenterer 0024 + grants/functions.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter slett den aktuelle forhandleren på `/endwise/forhandlere`. F1-07/F8-01 forblir `progress` (mekanikere på tvers, PUSH).
