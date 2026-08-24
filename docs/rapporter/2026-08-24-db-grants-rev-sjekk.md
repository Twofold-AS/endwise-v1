# Rapport — 24.08.2026 — db:grants falsk negativ på slett_forhandler rev=0025 (F5-26)

**Roadmap:** F5-26 (`done`) — nytt steg: rev-sjekk uten identity=`uuid`
**Godkjenning:** produksjonsfeil etter merge av PR #32 (ikke ny flate)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | Etter PR #32 feilet `pnpm db:grants` / `scripts/grants.ts` med exit 1: `slett_forhandler er ikke rev 0025 (DROP+CREATE feilet)` selv når `packages/db/sql/functions.sql` allerede DROPper og CREATer funksjonen med `-- slett_forhandler_rev=0025` i plpgsql-kroppen. |

Rotårsak (verifisert mot Postgres-dokumentasjon, ikke gjettet mot prod-DB):

`pg_get_function_identity_arguments(oid)` for `CREATE FUNCTION foo(id INT, …)` returnerer `id integer, …`, ikke bare typene. For `slett_forhandler(p_tenant_id uuid)` blir identity-strengen `p_tenant_id uuid`. Sjekken krevde `= 'uuid'` → 0 rader → `rev.rows[0]` undefined → exit 1 etter vellykket DROP+CREATE.

Fikset i `packages/db/scripts/grants.ts`:
- EXISTS på `public.slett_forhandler` + `strpos(prosrc, 'slett_forhandler_rev=0025') > 0`
- Ingen krav om identity = `'uuid'`
- Ved feil: logg identity-args + kort prosrc-snippet av det som faktisk finnes
- Suksesslogg uendret: `[db] grants + funksjoner kjørt (slett_forhandler rev=0025)`
- `functions.sql`, `grants.sql` og migrasjoner urørt (DROP+CREATE og policyer var allerede riktige)

---

## 2. Hva gikk galt

Forrige PR (#32) la inn en rev-sjekk som skulle fange at funksjonsbody ikke ble byttet. Filteret mot identity-args var feil format, så sjekken ble en falsk negativ. Context.dev MCP krevde auth og ble ikke brukt; pgpedia/Postgres-docs bekrefter at identity-args inkluderer parameternavn. Ingen lokal Postgres i denne økta — `pnpm db:grants` ble ikke kjørt mot DB; kildetesten er stand-in.

---

## 3. Hvilke fikser ble gjort

1. `grants.ts`: EXISTS-sjekk på navn + prosrc.
2. Diagnose ved feil: identity-args + `left(prosrc, 240)`.
3. Kontraktstest i `slett-forhandler-sql.test.ts` oppdatert (forbyr `= 'uuid'`, krever EXISTS + diagnose).

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Loggen skal inneholde `slett_forhandler rev=0025` (ikke lenger falsk exit 1). Deretter slett den aktuelle forhandleren på `/endwise/forhandlere`. F1-07/F8-01 forblir `progress`.
