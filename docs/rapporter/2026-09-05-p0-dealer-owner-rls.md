# Rapport — 05.09.2026 — eier-skriv på P0 dealer-tabeller under FORCE RLS

**Roadmap:** F0-03 (`done`), F2-01 / F2-06 / F3-01 / F3-12 / F6-01 (`done`) — migrasjon 0043 (etter 0042 på main)  
**Godkjenning:** Mons GO med fikser. PR #131 holdes som draft — **ikke merge**. ⛔ #114 / #119. FORCE RLS blir på.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F0-03** | Tenant-scopet eier INSERT/SELECT/UPDATE på P0 dealer-skrivtabeller. Journal: 0042 (`65eeabe`) før 0043. |
| **F2-06** | `customers` + append-only `customer_notes`. |
| **F2-01** | `vehicles` (create + assignCustomer). |
| **F3-01** | `bookings` + append-only `booking_services`. |
| **F3-12** | `skills` + `mechanic_skills` (upsert) + **DELETE** (`removeMechanicSkill`). |
| **F6-01** | `threads`, `thread_participants`, `messages`, `notifications`. |
| **Lager** | `parts`, `stock_locations`, `stock_levels`, append-only `stock_movements`. |

### Rotårsak

Samme klasse som #121–#128. Schema-policyene er TO `authenticated` FOR ALL. Prod APP kobler som eier `endwise` med FORCE RLS. `withTenant` setter bare `app.tenant_id`. INSERT … RETURNING krever også SELECT. DELETE på `mechanic_skills` traff samme gap.

### Fikset (0043 + grants.sql)

| Policy | Tabeller | Port |
|---|---|---|
| `*_tenant_insert_owner` | alle 15 P0 | tabelleier + ikke-tom `app.tenant_id` + `tenant_id = guc` |
| `*_tenant_select_owner` | alle 15 P0 | samme — RETURNING + list |
| `*_tenant_update_owner` | 12 (ikke append-only) | USING + WITH CHECK |
| `mechanic_skills_tenant_delete_owner` | `mechanic_skills` | USING only (Mons GO) |

**Append-only (ingen eier-UPDATE):** `customer_notes`, `booking_services`, `stock_movements`.

**Trigger-lås (identitet/historikk):**

| Tabell | Låst for eier |
|---|---|
| customers / vehicles / parts / stock_locations | id, tenant_id, created_at |
| bookings | id, tenant_id, created_at, idempotency_key, source, service_version_id |
| skills | tenant_id, key, created_at |
| mechanic_skills | tenant_id, mechanic_id, skill_key |
| threads | id, tenant_id, kind, created_at |
| thread_participants | tenant_id, thread_id, participant_id, joined_at |
| messages | id, tenant_id, thread_id, author_id, body, channel, direction, created_at |
| notifications | id, tenant_id, channel, recipient, kind, idempotency_key, sent_at |
| stock_levels | id, tenant_id, part_id, location_id |

Ingen `platform_admin`. **FORCE RLS urørt.** `db:grants` exit 1 hvis policyene/triggerne mangler.

Klientfeil: «Kunne ikke lagre …» / «Kunne ikke fjerne kompetansen. Prøv igjen.» SQLSTATE logges internt — aldri query/params.

---

## 2. Hva gikk galt

Rebase mot `origin/main` etter #128/#129/#130: konflikter i journal, `grants.ts`, `slett-postgres.ts`, `vitest.config.ts` og roadmap. Løst ved å beholde begge sider (0042-tjenester + 0043-P0).

Context7 ble ikke brukt (etablert Postgres RLS-mønster fra 0037–0042). Live SET ROLE skippes uten `DATABASE_URL` i denne VM.

---

## 3. Hvilke fikser ble gjort

1. 0043 eier INSERT/SELECT/UPDATE på 15 P0-tabeller.
2. `mechanic_skills_tenant_delete_owner` — samme tenant-scopede eier-mønster, FOR DELETE, USING only, ingen `platform_admin`.
3. `removeMechanicSkill` sanitert via `mapDealerWritePostgresFeil` (ingen Drizzle Failed query/params).
4. Rebase: 0042 (`0042_services_owner_write`) i journal **før** 0043. Midlertidig FK-SELECT-policy fjernet (0042 eier-SELECT finnes).
5. Kolonne-lås via trigger der historikk/identitet må stå.
6. Kontrakt + SET ROLE: INSERT…RETURNING + DELETE; tom/uten/feil GUC og `platform_admin` alene avvist.

---

## 4. Dekket vs utsatt

### Dekket (P0)

customers, customer_notes, vehicles, bookings, booking_services, skills, mechanic_skills (inkl. DELETE), threads, thread_participants, messages, notifications, parts, stock_locations, stock_levels, stock_movements.

### Utsatt (P1/P2 — ikke merge-blokkere per Mons)

| Prioritet | Tabeller | Hvorfor utsatt |
|---|---|---|
| P1 | `dealer_profiles` | INSERT/UPDATE (SELECT finnes i 0039) — ikke i P0-listen |
| P1 | `widget_keys`, `integration_config` | Widget / Quick / Vegvesen |
| P1 | `shop_orders`, `shop_order_lines` | Butikk-modul |
| P1 | `stream_events`, `sync_conflicts` | Stream / Quick-sync |
| P2 | `helpdesk_*`, `feature_flags*`, `billing_*`, `erasure_requests` | Admin / plattform |
| — | `mechanics` UPDATE | INSERT+SELECT finnes (0039/0040). UPDATE ikke P0. |
| — | Residual cross-tenant FK | Dokumentert, ikke merge-blokker |

`services` / `service_versions` er 0042 på main (`65eeabe`). `member_profiles` er dekket. `audit_log` INSERT krever tenant-guc **eller** `platform_admin` (0037).

---

## 5. Neste fase / neste steg

Klar for **squash** av #131. Ikke merge herfra.

Mikael kjører **`pnpm db:setup`** mot Scaleway etter squash. Deretter: ny kunde, ny jobb, ny melding, lagerbevegelse, fjern kompetanse. Forvent 200, ikke «Failed query».

Neste PR: P1-tabellene over, samme porter, Mons review.

Ikke skru av FORCE RLS. Ikke sett `platform_admin` i `withTenant`. Ikke merge #114 / #119.
