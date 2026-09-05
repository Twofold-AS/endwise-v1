# Rapport — 05.09.2026 — eier-UPDATE på tenants under FORCE RLS (fullfor)

**Roadmap:** F0-03 (`done`), F1-10 (`done`), F5-26 (`done`) — migrasjon 0041  
**Godkjenning:** produksjonsfeil på endwise.no etter `pnpm db:setup` for #124/#125. PR holdes som draft — Mons reviewer, ikke merge. ⛔ #114. FORCE RLS blir på.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F0-03** | Verifisert 0039/0040 mot `withTenant`. Lagt til tenant-scopet eier-UPDATE på `tenants` / `tenant_modules`. |
| **F5-26** | `onboarding.fullfor` kan skrive visningsnavn + `onboarding_completed_at` som eier. |
| **F1-10** | Staff-invite fra Team-steget: eier-SELECT på `invitations` uten `platform_admin` (RETURNING + `listApne`). |

### 1. GUC-verifisering (0039/0040 matcher `withTenant`)

| Lag | Verdi |
|---|---|
| `withTenant` | `set_config('app.tenant_id', tenantId, true)` — **ikke** `platform_admin` |
| Policy | `nullif(current_setting('app.tenant_id', true), '') is not null` + `id`/`tenant_id` = samme `::uuid` |
| Eier-port | `current_user ≠ authenticated/endwise_app` **og** `current_user = relowner` |

SQL-en i 0039/0040 er korrekt. `SELECT tenants` uten GUC → 0 rader er **forventet** etter 0039 (ikke bevis på at setup feilet). Med `platform_admin=on` synes alle tenants via `tenants_platform_admin_read_owner` — det er `withPlatformAdmin`, ikke dealer-login.

### 2. Hvor NOT_FOUND kommer fra

| Sti | Kast | Etter SELECT |
|---|---|---|
| `forhandler.kort` | `lesTenantNavn` SELECT 0 rader → `NOT_FOUND «Fant ikke forhandleren.»` | ingen UPDATE |
| `onboarding.fullfor` | samme melding på tenants-SELECT **før** UPDATE | `UPDATE tenants` / `tenant_modules` uten `.returning()` — 0 rader kaster **ikke** NOT_FOUND |

Symptom på Fullfør etter 0039-setup er derfor **fortsatt SELECT** (GUC ikke satt i den manuelle sjekken, eller `activeOrganizationId` peker på org uten `tenants`-rad — leftover `mikael-moto`). UPDATE-hullet Mons flagget er reelt **etter** at SELECT treffer: eier-UPDATE var 0 rader, stille.

### 3. Fikset (0041 + grants.sql)

| Policy | Tabell | Port |
|---|---|---|
| `tenants_tenant_update_owner` | tenants | tabelleier + ikke-tom `app.tenant_id` + `id = guc`. USING + WITH CHECK |
| `tenant_modules_tenant_update_owner` | tenant_modules | samme, `tenant_id` |
| `invitations_tenant_select_owner` | invitations | samme — staff `INSERT … RETURNING` / `listApne` |

Trigger (eier-only; `authenticated`/`endwise_app` urørt):

- `tenants_owner_update_guard` — låser `id`/`created_at`; nekter `kind=platform`. Tillater `name`/`slug`/`kind` live\|demo/`plan`/`onboarding_completed_at` (setModules + `tenants.update` + fullfor + Quick).
- `tenant_modules_owner_update_guard` — låser PK + `created_at`. Tillater `enabled`/`source`/`plan` (fullfor + setModules + Stripe).

Ingen `platform_admin` på disse policyene. FORCE RLS urørt. `withTenant` setter **ikke** `platform_admin`. `db:grants` exit 1 hvis policyene/triggerne mangler.

---

## 2. Hva gikk galt

Ingenting i implementasjonen. Context7 ble ikke brukt (etablert Postgres RLS-mønster fra 0037–0040).

**Kjent rest (data, ikke denne PR):** orphan Better Auth-org `mikael-moto` uten `tenants`-rad. Hvis sesjonen har den som `activeOrganizationId`, er NOT_FOUND korrekt — 0039 filtrerer riktig. Ikke #114 (late som veiviseren er ferdig / tomt kort). Ikke slettet her.

---

## 3. Hvilke fikser ble gjort

1. 0041 eier-UPDATE på tenants/tenant_modules + eier-SELECT på invitations (staff).
2. Kolonne-lås via trigger (PK/`created_at`; `kind=platform` avvist).
3. Kontrakt + SET ROLE: GUC-SELECT egen tenant; fullfor UPDATE; tom/uten/feil GUC = 0; `platform_admin` alene = 0; staff RETURNING uten `platform_admin`.
4. FORCE RLS urørt. #114 ikke merget.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter:

1. Verifiser SELECT **med** `set_config('app.tenant_id', '<ekte tenant-uuid>', true)` — ikke bare «uten platform_admin → 0».
2. Logg inn som `mikael_rk@hotmail.com` på tenanten som **har** `tenants`-rad (`110d3f50-…` Mikael RK, ikke `mikael-moto`).
3. `/oppstart` Team → Fullfør. Chrome `forhandler.kort` skal 200.

Ikke skru av FORCE RLS. Ikke sett `platform_admin` i `withTenant`. Ikke merge #114.
