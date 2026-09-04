# Rapport — 04.09.2026 — eier-SELECT på tenants under FORCE RLS (withTenant)

**Roadmap:** F0-03 (`done`), F5-26 (`done`) — migrasjon 0039  
**Godkjenning:** produksjonsfeil på endwise.no (dealer-login). PR holdes som draft — Mons reviewer, ikke merge.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F0-03** | Dealer `mikael_rk@hotmail.com` (`dealer_admin` på tenant `110d3f50-cae8-40de-a93b-a6d93a082922`, Mikael RK) fikk NOT_FOUND «Fant ikke forhandleren» fra `forhandler.kort` / `onboarding.fullfor`. |
| **F5-26** | Samme rot: `lesTenantNavn` inne i `withTenant` så 0 rader. |

**Rotårsak (verifisert mot Mikaels SQL som rolle `endwise`, FORCE RLS, APP_DATABASE_URL — ikke gjettet):**

1. Uten GUC: `SELECT` på `tenants` → 0 rader.
2. Med `set_config('app.platform_admin','on')`: Endwise + Mikael RK synlige (`tenants_platform_admin_read_owner`).
3. `withTenant` gjør bare `set_config('app.tenant_id', …, true)` — **ikke** `platform_admin`.
4. `tenants_self_isolation` er TO `authenticated`. Eieren er ikke den rollen.
5. Data finnes. Tenant-raden er der. Medlemskapet er der.

Samme klasse som #121 invitations RETURNING: eier `endwise` under FORCE RLS mangler en tenant-scopet SELECT som matcher `withTenant`.

**Fikset (0039 + grants.sql):**

| Policy | Tabell | USING |
|---|---|---|
| `tenants_tenant_select_owner` | tenants | tabelleier + ≠ authenticated/endwise_app + **ikke-tom** `app.tenant_id` + `id = guc` |
| `dealer_profiles_tenant_select_owner` | dealer_profiles | samme, `tenant_id` (`forhandler.kort`) |
| `tenant_modules_tenant_select_owner` | tenant_modules | samme (`session.me`, onboarding, moduleProcedure) |
| `member_profiles_tenant_select_owner` | member_profiles | samme (`session.me`) |
| `mechanics_tenant_select_owner` | mechanics | samme (`session.me`) |

Ingen `platform_admin` på disse policyene. `tenants_platform_admin_read_owner` / `withPlatformAdmin` er urørt. `withTenant` setter **ikke** `platform_admin`. FORCE RLS urørt. `db:grants` exit 1 hvis policyene mangler.

Etter merge: **`pnpm db:setup`** på Scaleway.

### Audit: tabeller lest i withTenant på dealer-login

| Sti | Tabeller | Eier-SELECT |
|---|---|---|
| `forhandler.kort` | tenants, dealer_profiles | 0039 |
| `onboarding.fullfor` / `status` | tenants, tenant_modules | 0039 (SELECT). UPDATE tenants/tenant_modules som eier er **ikke** dekket her — se §2. |
| `session.me` | mechanics, tenants, member_profiles, tenant_modules | 0039. `user_preferences` har ingen tenant-RLS. |
| Better Auth (`user` / `member` / `organization`) | utenfor withTenant | ADR-002, ingen RLS |

### Authz-modell (ny SELECT)

| Sti | Hvem | Hva |
|---|---|---|
| Dealer-les (kort, session, onboarding-SELECT) | DB-eier `endwise` i `withTenant` | tabelleier + ikke-tom `app.tenant_id` |
| Plattform-liste | `withPlatformAdmin` | eksisterende `tenants_platform_admin_read_owner` (alle tenants) |
| App-rolle | `endwise_app` / authenticated | `tenants_self_isolation` / `*_tenant_isolation` |

---

## 2. Hva gikk galt

Alt gikk som planlagt i utredningen. Docker-eieren er superuser og bypasser FORCE RLS, så live-testen bruker nosuperuser-tabelleier som stand-in når `endwise` er superuser, og bokstavelig `SET ROLE endwise` når rollen finnes. Context7 MCP ble ikke brukt (ingen ny stack — Postgres RLS-mønsteret er etablert i 0037/0038).

**Kjent rest (ikke i denne PR):** `onboarding.fullfor` gjør UPDATE på `tenants` / `tenant_modules` etter SELECT. Eier har INSERT-policy (0037, krever `platform_admin`) men ingen tenant-scopet UPDATE. Etter 0039 kommer kalleren forbi NOT_FOUND; UPDATE kan bli 0 rader. Krever egen Mons-vurdering — ikke utvidet her.

---

## 3. Hvilke fikser ble gjort

1. Eier-SELECT på tenants + login-sti-tabeller (grants + 0039).
2. `db:grants` / `force-rls` krever policyene. FORCE RLS urørt.
3. Kontraktstester + SET ROLE-regresjon (egen tenant; tom guc = 0; platform_admin-sti uendret).
4. `withTenant` bekreftet uten `platform_admin`.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter logg inn som `mikael_rk@hotmail.com` og verifiser `/` chrome (`forhandler.kort`) og ev. `/oppstart`. Ikke skru av FORCE RLS. Ikke sett `platform_admin` i `withTenant`.

### Ops: orphan organization `mikael-moto` — ikke slettet

**Ikke rørt i denne PR.** Leftover Better Auth-org uten `tenants`-rad.

| Felt | Verdi |
|---|---|
| `organization.id` | `9a9db716-…` (full UUID i prod) |
| slug | `mikael-moto` |
| `tenants`-rad | **mangler** |
| Relasjon | separat leftover, ikke Mikael RK-tenanten `110d3f50-cae8-40de-a93b-a6d93a082922` |

Anbefalt opprydding (manuelt, etter backup/bekreftelse): sjekk `member` / `invitation` / `session` mot org-id; slett bare hvis ingen levende medlemskap eller pending invite. Ikke `slett_forhandler` — den krever tenants-rad.

F1-07 forblir `progress`. PR merges **ikke** i denne økten.
