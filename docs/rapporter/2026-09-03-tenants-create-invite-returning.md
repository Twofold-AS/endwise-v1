# Rapport — 03.09.2026 — tenants.create 500 på invitations INSERT … RETURNING

**Roadmap:** F5-26 (`done`) — migrasjon 0038
**Godkjenning:** produksjonsfeil på endwise.no etter squash #120 (04dbab2). PR #121 holdes åpen (ikke merge) etter Mons NO-GO 1 og 2.

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

**Fikset (PR #121 v3 etter Mons NO-GO 2):**

RETURNING SELECT-retningen står: `invitations_platform_admin_select_owner` = tabelleier + `current_user` ≠ authenticated/endwise_app + `app.platform_admin=on` (skrivesti-markør fra `opprettEier`, **ikke** sesjons-authz) + `app.tenant_id IS NOT NULL` + `tenant_id = app.tenant_id`. Tom/NULL tenant matcher aldri.

Revoke er **ikke** lenger SECURITY DEFINER. `revoke_open_owner_invitations` er DROP-et. Tilbakekall er TypeScript `tilbakekallApneEier` inne i allerede-autorisert `endwiseAdminProcedure` + eier-rolle `withTenant`. UPDATE setter kun `revokedAt`. Ingen `.returning()`. Tom tenant avvises i app-kode. `app.platform_admin` nullstilles før return og i `finally`.

`invitations_owner_revoke_update`: tabelleier-gate + `current_user` ≠ authenticated/endwise_app + eksplisitt `app.tenant_id IS NOT NULL`. Ingen `platform_admin` (GUC er ikke authz). FORCE RLS urørt.

Trigger `invitations_immutable_fields`: bare engangs `revoked_at` XOR `accepted_at` (NULL→satt). Låst: `id`, `tenant_id`, `email`, `token_hash`, `kind`, `role`, `job_function`, `platform_level`, `invited_by`, `expires_at`, `created_at`. Rearm/forlengelse nektes.

`tenants.create` og `resendOwnerInvite` mapper Drizzle-feil via `loggCreatePostgresFeil` / `mapCreatePostgresFeil` — SQLSTATE internt, ingen SQL/params i UI (CWE-209/497).

Etter merge: **`pnpm db:setup`** på Scaleway.

### Endelig authz-modell

| Sti | Hvem | Bevis | Hva |
|---|---|---|---|
| INSERT eier-invite | DB-eier `endwise` i `withTenant` fra `endwiseAdminProcedure` | `current_user` = tabelleier, ≠ authenticated/endwise_app; WITH CHECK tenant eller platform_admin-markør | 0037 insert-owner |
| RETURNING SELECT | samme | tabelleier + platform_admin-markør + **ikke-tom** `app.tenant_id` | 0038 select-owner |
| Revoke åpen eier-invite | samme, app-kode | `endwiseAdminProcedure` (Better Auth-rolle) + `withTenant` + UPDATE-policy tabelleier + **ikke-tom** tenant. Ikke GUC, ikke DEFINER | `tilbakekallApneEier` + owner-revoke-update |
| App-rolle (`endwise_app` / authenticated) | PgBouncer app | `invitations_tenant_isolation` TO authenticated | staff-liste / staff-revoke |
| Godta-lenke | DEFINER `consume_invitation` | `app.invitation_hash` (satt av funksjonen) | open_by_hash_update + trigger accepted_at |

Caller-satt `app.platform_admin` alene gir **ingen** revoke eller kryss-tenant SELECT. `endwise_app`/`authenticated` er eksplisitt utelukket fra eier-policyene.

---

## 2. Hva gikk galt

#120 tetter WITH CHECK og atomic skall, men testet ikke INSERT … RETURNING under FORCE RLS. v1 (#121) ga for bred UPDATE. v2 brukte DEFINER + self-set GUC som authz (tautologi). Docker-eieren er superuser og bypasser FORCE RLS, så integrasjonstester alene fanger det ikke. Context7 MCP ble ikke brukt (ingen ny stack). Lokal Docker fantes ikke i dette miljøet — reproduksjon er kildetest + SET ROLE-test som skippes uten DATABASE_URL.

---

## 3. Hvilke fikser ble gjort

1. Eier-SELECT med eksplisitt `tenant_id IS NOT NULL` (grants + 0038).
2. DROP DEFINER-revoke. Eier-UPDATE med tabelleier-gate, uten platform_admin.
3. Trigger låser alle felt unntatt engangs revoked_at / accepted_at.
4. `tilbakekallApneEier` i app-kode; avviser tom tenant; rydder platform_admin-GUC.
5. `resendOwnerInvite` + `tenants.create` saniterer Drizzle-feil.
6. Kontraktstester + negative: user-set platform_admin, tom tenant, ikke-eier revoke, expires_at/accepted_at-rearm, GUC-cleanup, sanitert resend.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter opprett live forhandler på `/endwise/forhandlere`. Ikke skru av FORCE RLS. Ikke gi invitert dealer platform-rettigheter. F1-07 forblir `progress`. PR #121 merges **ikke** i denne økten.
