# Rapport — 06.09.2026 — residual eier-porter under FORCE RLS

**Roadmap:** F0-03 / F0-04 (`done`) — migrasjon 0044 (etter 0042+0043 på main `0f60e4e` / #139)  
**Godkjenning:** Mons review (RLS/DB). Draft PR. **Ikke merge.** ⛔ #114 / #119. FORCE RLS blir på.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F0-03** | Residual tenant-scopet eier INSERT/SELECT/UPDATE etter #128/#131. Journal: 0042 → 0043 → 0044. |
| **F0-04** | `tenant_modules` INSERT uten `platform_admin` (setModules / Stripe). `feature_flag_overrides` INSERT/SELECT/UPDATE (flags.setOverride). |

### Rotårsak

Samme klasse som #121–#131. Schema-policyene er TO `authenticated` FOR ALL. Prod APP kobler som eier `endwise` med FORCE RLS. `withTenant` setter bare `app.tenant_id`. Tabeller uten eier-port fail-closed (42501 / 0 rader).

0042/0043 dekket tjenester + P0 dealer-skriv. Denne runden tar #131 «Utsatt».

### Fikset (0044 + grants.sql)

**Gjenbrukt primitiv (ingen ny overflate unntatt én):** TO PUBLIC, `current_user = relowner`, ≠ `authenticated`/`endwise_app`, ikke-tom `app.tenant_id`, `tenant_id = guc`. Ingen `platform_admin`. FORCE RLS urørt.

| Tabell | Nye porter | Hvorfor |
|---|---|---|
| `dealer_profiles` | INSERT + UPDATE | forhandler.update, applyQuickDealerProfile (SELECT fantes i 0039) |
| `integration_config` | INSERT/SELECT/UPDATE | quick.setConfig / recordSync / onboarding Quick |
| `widget_keys` | INSERT/SELECT/UPDATE | widget.keys.issue + ensureShopTestKey |
| `mechanics` | UPDATE | updateMechanicCapacity (INSERT/SELECT fantes) |
| `billing_customers` | INSERT/SELECT/UPDATE | Stripe checkout + applySubscription |
| `tenant_modules` | INSERT (uten platform_admin) | setModules / applySubscription. Eksisterende `*_platform_admin_insert_owner` beholdt for createTenant. |
| `sync_conflicts` | INSERT/SELECT/UPDATE | Quick-synk + resolve |
| `stream_events` | INSERT/SELECT | publishEvent / replay (append-only) |
| `shop_orders` | INSERT/SELECT/UPDATE | flagg-styrt kasse + Stripe session |
| `shop_order_lines` | INSERT/SELECT | snapshot-linjer (ingen UPDATE) |
| `feature_flag_overrides` | INSERT/SELECT/UPDATE | flags.setOverride |

**Net-new som var uunngåelig:** `tenant_modules_tenant_insert_owner`. createTenant skriver med `platform_admin`. setModules og Stripe `applySubscription` gjør INSERT inne i `withTenant` uten den GUC-en. Uten tenant-guc-port fail-closed.

**Trigger-lås:** identitet/PK der UPDATE finnes (`tenant_id`/`created_at`/`publishable_key`/`created_by` …).

`db:grants` exit 1 hvis residual-policyene/triggerne mangler.

---

## 2. Hva gikk galt

Context7 MCP krevde auth i denne økten — ikke brukt. Mønsteret er identisk med 0037–0043 (etablert Postgres RLS).

Live SET ROLE skippes uten `DATABASE_URL` i denne VM (samme som 0042/0043).

CI på #140 er rød på **samme tre sjekker som main** (`0f60e4e` / #139): Biome i `packages/ui` (17 feil, ikke 0044), transitive `pnpm audit` high (`browserslist`), ZAP mot `example.invalid`. CodeQL + Semgrep grønne. Ingen nye deps.

---

## 3. Hvilke fikser ble gjort

1. 0044 residual eier-porter + fail-if-missing i `grants.ts` / `grants.sql`.
2. `tenant_modules_tenant_insert_owner` uten `platform_admin`.
3. Trigger-lås på UPDATE-tabellene.
4. Kontrakt + SET ROLE-regresjon (INSERT…RETURNING, mechanics UPDATE, tom/uten/feil GUC og `platform_admin` alene avvist).

---

## 4. Neste fase / neste steg

**Mons** kjører **`pnpm db:setup`** mot Scaleway etter squash. Deretter: forhandler.update, Quick-config, widget.keys.issue, kapasitet, Stripe checkout/webhook, setModules, flags.setOverride.

Ikke skru av FORCE RLS. Ikke sett `platform_admin` i `withTenant`. Ikke merge #114 / #119.

Utenfor denne PR: `stream_events` DELETE (prune cron); `tenant_modules` DELETE av unused optional i setModules; helpdesk/erasure P2.
