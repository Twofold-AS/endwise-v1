# Rapport — 05.09.2026 — eier-skriv på P0 dealer-tabeller under FORCE RLS

**Roadmap:** F0-03 (`done`), F2-01 / F2-06 / F3-01 / F3-12 / F6-01 (`done`) — migrasjon 0043  
**Godkjenning:** residual etter #128. PR holdes som draft — Mons reviewer, ikke merge. ⛔ #114 / #119. FORCE RLS blir på. Venter **ikke** på #128-merge.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F0-03** | Tenant-scopet eier INSERT/SELECT/UPDATE på P0 dealer-skrivtabeller. |
| **F2-06** | `customers` + append-only `customer_notes`. |
| **F2-01** | `vehicles` (create + assignCustomer). |
| **F3-01** | `bookings` + append-only `booking_services`. |
| **F3-12** | `skills` + `mechanic_skills` (upsert). |
| **F6-01** | `threads`, `thread_participants`, `messages`, `notifications`. |
| **Lager** | `parts`, `stock_locations`, `stock_levels`, append-only `stock_movements`. |

### Rotårsak

Samme klasse som #121–#128. Schema-policyene er TO `authenticated` FOR ALL. Prod APP kobler som eier `endwise` med FORCE RLS. `withTenant` setter bare `app.tenant_id`. INSERT … RETURNING krever også SELECT.

### Fikset (0043 + grants.sql)

| Policy | Tabeller | Port |
|---|---|---|
| `*_tenant_insert_owner` | alle 15 P0 | tabelleier + ikke-tom `app.tenant_id` + `tenant_id = guc` |
| `*_tenant_select_owner` | alle 15 P0 | samme — RETURNING + list |
| `*_tenant_update_owner` | 12 (ikke append-only) | USING + WITH CHECK |

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

Klientfeil: «Kunne ikke lagre … Prøv igjen.» SQLSTATE logges internt — aldri query/params.

---

## 2. Hva gikk galt

Ingenting i implementasjonen. Context7 ble ikke brukt (etablert Postgres RLS-mønster fra 0037–0042). Live SET ROLE skippes uten `DATABASE_URL` i denne VM.

0042 er reservert av #128 (`0042_services_owner_write`). Denne PR bruker 0043 så de kan merges uavhengig.

---

## 3. Hvilke fikser ble gjort

1. 0043 eier INSERT/SELECT/UPDATE på 15 P0-tabeller.
2. Kolonne-lås via trigger der historikk/identitet må stå.
3. Sanitert tRPC-feil på kunder, kjøretøy, bookinger, kompetanse, innboks, lager (CWE-209).
4. Kontrakt + SET ROLE: INSERT…RETURNING; tom/uten/feil GUC og `platform_admin` alene avvist; identitet/meldingstekst låst.

---

## 4. Dekket vs utsatt

### Dekket (P0)

customers, customer_notes, vehicles, bookings, booking_services, skills, mechanic_skills, threads, thread_participants, messages, notifications, parts, stock_locations, stock_levels, stock_movements.

### Utsatt (P1/P2 fra #128-residual)

| Prioritet | Tabeller | Hvorfor utsatt |
|---|---|---|
| P1 | `dealer_profiles` | INSERT/UPDATE (SELECT finnes i 0039) — ikke i P0-listen |
| P1 | `widget_keys`, `integration_config` | Widget / Quick / Vegvesen |
| P1 | `shop_orders`, `shop_order_lines` | Butikk-modul |
| P1 | `stream_events`, `sync_conflicts` | Stream / Quick-sync |
| P2 | `helpdesk_*`, `feature_flags*`, `billing_*`, `erasure_requests` | Admin / plattform |
| — | `mechanics` UPDATE | INSERT+SELECT finnes (0039/0040). UPDATE ikke P0. |
| — | `services` / `service_versions` | #128 (0042), ikke denne PR |

`member_profiles` er dekket. `audit_log` INSERT krever tenant-guc **eller** `platform_admin` (0037).

---

## 5. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge (etter eller sammen med #128). Deretter: ny kunde, ny jobb, ny melding, lagerbevegelse. Forvent 200, ikke «Failed query».

Neste PR: P1-tabellene over, samme porter, Mons review.

Ikke skru av FORCE RLS. Ikke sett `platform_admin` i `withTenant`. Ikke merge #114 / #119.
