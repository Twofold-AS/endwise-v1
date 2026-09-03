# Rapport — 03.09.2026 — tenants.create 500 på invitations INSERT … RETURNING

**Roadmap:** F5-26 (`done`) — migrasjon 0038
**Godkjenning:** produksjonsfeil på endwise.no etter squash #120 (04dbab2)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | `tenants.create` 500-et på `insert into invitations` 2026-09-03 14:20:04Z (params: tenant_id `4bba521c-…`, e-post, kind owner, job_function leder, role dealer_admin). |

**Rotårsak (verifisert mot kode + migrasjoner, ikke gjettet):**

1. `createTenantShell` kjører `withTenant(ny UUID)` *før* tenants-raden. `withTenant` gjør bare `set_config('app.tenant_id', …, true)` — ingen SELECT mot `tenants`. Org → tenants → modules → `inTx` i samme tx. FK `invitations.tenant_id → tenants.id` ser raden i samme transaksjon.
2. `opprettEier(input, tx)` setter `app.platform_admin` *før* INSERT og nøster ikke `withTenant` (eget kall inne i `withTenant` ville kastet tenantTxGate: «kan ikke nøstes»). GUC tapes ikke på skall-stien.
3. 0037 `invitations_platform_admin_insert_owner` er **FOR INSERT** (WITH CHECK: tenant_id = app.tenant_id **eller** platform_admin). WITH CHECK passerer etter #120.
4. `opprettEier` bruker `.returning()`. Postgres krever at den nye raden også matcher en **SELECT**-policy. Eier `endwise` under FORCE RLS har ingen: `invitations_tenant_isolation` er TO authenticated; `invitations_open_by_hash` krever `app.invitation_hash`; `invitations_slett_forhandler_select` krever slett-GUC. Default deny → 42501. Samme melding som WITH CHECK-brudd. Drizzle viser bare «Failed query: insert into invitations» + params.
5. `invited_by` er `text` uten FK. CHECKer (`owner`/`leder`/`dealer_admin`) matcher verdiene. `token_hash` er unik per kall.

Fikset (PR #121 v2 etter Mons NO-GO): `invitations_platform_admin_select_owner` krever **tabelleier + `app.platform_admin` + `tenant_id = app.tenant_id`**. Ingen bred eier-UPDATE. Tilbakekall: `revoke_open_owner_invitations` (SECURITY DEFINER, `search_path = public`, kun `revoked_at`) + GUC-bundet `invitations_revoke_owner_update` (`app.invite_revoke_tenant`) + trigger `invitations_immutable_fields`. FORCE RLS urørt. `tenants.create` logger SQLSTATE/constraint, ikke SQL/params i UI.

Etter merge: **`pnpm db:setup`** på Scaleway.

---

## 2. Hva gikk galt

#120 tetter WITH CHECK og atomic skall, men testet ikke INSERT … RETURNING under FORCE RLS. Docker-eieren er superuser og bypasser FORCE RLS, så integrasjonstester alene fanger det ikke. Context7 MCP ble ikke brukt (ingen ny stack). Lokal Docker fantes ikke i dette miljøet — reproduksjon er kildetest + SET ROLE-test som skippes uten DATABASE_URL.

---

## 3. Hvilke fikser ble gjort

1. Eier-SELECT + tenant-skopet UPDATE på `invitations` (grants + 0038).
2. `db:grants` exit 1 hvis policyene mangler.
3. `mapCreatePostgresFeil` / `loggCreatePostgresFeil` — SQLSTATE internt, ingen Failed query til UI.
4. Kontraktstester (RETURNING-policy, create-feil uten lekkasje) + force-rls ③f.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter opprett live forhandler på `/endwise/forhandlere`. Ikke skru av FORCE RLS. Ikke gi invitert dealer platform-rettigheter. F1-07 forblir `progress`.
