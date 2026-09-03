# Rapport — 03.09.2026 — eier-invite INSERT under FORCE RLS

**Roadmap:** F5-26 (`done`) — oppfølging etter 0037
**Godkjenning:** produksjonsfeil på endwise.no (ikke ny flate)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | `tenants.create` av live forhandler med ny eier-e-post (ingen `user`-rad) kom forbi `insert into tenants` (0037) og 500-et på `insert into invitations`. |

**Rotårsak (verifisert mot kode, ikke gjettet):** Prod `APP_DATABASE_URL` kobler som `endwise` under FORCE RLS. `invitations_platform_admin_insert_owner` (0037) er TO PUBLIC INSERT med WITH CHECK `tenant_id = app.tenant_id OR platform_admin=on`. `opprettEier` brukte `withTenant(ny dealer-id)` men satte ikke `app.platform_admin` i samme transaksjon. `createTenant` / `createTenantShell` setter begge GUC-ene for tenants-INSERT; invite-steget (`sendEierLenke` → `modul.opprettEier`) var et senere kall. Sesjons-GUC kan fortsatt være Endwise eller tom → WITH CHECK feiler.

I tillegg: `createTenantShell` skrev `organization` *utenfor* `withTenant`. Invite-feil etter commit lot slug ligge («slug already in use», tom forhandlerliste).

Fikset (ingen ny migrasjon, 0037-policyen sto allerede):

- `opprettEier` setter `app.platform_admin=on` i samme `withTenant` som invitations-INSERT. Valgfri eksisterende tx så create ikke nøster.
- `createTenantShell` skriver organization + tenants + ev. invite-callback i én `withTenant` (ny id + platform_admin). Kaster callbacken, rulles slug tilbake.
- `tenants.create` (ingen user-rad) kjører `opprettEier` i den tx-en. Better Auth-stien (eksisterende user) kaller `slettUferdigForhandler` hvis invite kaster etter at org er committet.
- FORCE RLS urørt. Inviten hoppes ikke over.

---

## 2. Hva gikk galt

Context7 MCP ble ikke brukt (ingen ny stack). Docker-eieren er superuser og bypasser FORCE RLS; integrasjonstesten `tenant-shell-rollback` skippes uten `DATABASE_URL` i dette miljøet. Kontraktstester i `eier-invite-owner-rls.test.ts` er stand-in, samme klasse som 0037.

---

## 3. Hvilke fikser ble gjort

1. `platform_admin` i `opprettEier`-tx.
2. Organization flyttet inn i `createTenantShell`-tx + `inTx` for invite.
3. `slettUferdigForhandler` for Better Auth-stien.
4. Kontraktstester + rollback-test (skippes uten DB).

---

## 4. Neste fase / neste steg

Etter merge: opprett en live forhandler på `/endwise/forhandlere` med ny eier-e-post (f.eks. etter wipe). Bekreft at invitations-raden skrives og at et feilet invite-forsøk ikke etterlater slug. Ingen `pnpm db:setup` påkrevd (0037 allerede). F1-07 forblir `progress`.
