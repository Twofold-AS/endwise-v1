# Rapport — 05.09.2026 — eier-skriv på tjenestekatalog under FORCE RLS

**Roadmap:** F0-03 (`done`), F2-04 (`done`), F2-05 (`done`) — migrasjon 0042  
**Godkjenning:** produksjonsfeil på endwise.no. PR holdes som draft — Mons reviewer, ikke merge. ⛔ #114 / #119. FORCE RLS blir på.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F2-04 / F2-05** | `services.create` som eier `endwise` under FORCE RLS feilet på identitets-INSERT. |
| **F0-03** | Tenant-scopet eier INSERT/SELECT/UPDATE på `services` + `service_versions`. |

### 1. Kolonne-spørsmålet (ikke en bug)

Skjemaet har **to tabeller**. `services` er identiteten (`name`, `vehicle_type`). Pris (`price_minor`, øre), varighet, skills og beskrivelse bor på `service_versions`. UI sender 1450 kr + «Gjennomgang av kjøretøy før EU» i samme `services.create`-kall; mutasjonen skriver identitet først, deretter versjon 1. Feilen stoppet på første INSERT — derfor så SQL-en ut som om pris/beskrivelse var glemt.

### 2. Rotårsak

`services_tenant_isolation` / `service_versions_tenant_isolation` er TO `authenticated` FOR ALL. Prod APP kobler som eier `endwise` med FORCE RLS. `withTenant` setter bare `app.tenant_id` — ikke `platform_admin`. Samme klasse som #121 RETURNING, #124 SELECT, #125 INSERT, #126 UPDATE.

INSERT … RETURNING krever også SELECT. Uten eier-SELECT ville INSERT med WITH CHECK alene likevel feilet på RETURNING.

### 3. Fikset (0042 + grants.sql)

| Policy | Tabell | Port |
|---|---|---|
| `services_tenant_insert_owner` | services | tabelleier + ikke-tom `app.tenant_id` + `tenant_id = guc` |
| `services_tenant_select_owner` | services | samme — RETURNING + `list` |
| `services_tenant_update_owner` | services | USING + WITH CHECK — deactivate/reactivate |
| `service_versions_tenant_*_owner` | service_versions | samme tre porter — create/update |

**`services_owner_update_guard`:** som tabelleier kan bare `active` endres. Identitet (`id`/`tenant_id`/`name`/`vehicle_type`/`created_at`) låst.  
**`service_versions_owner_update_guard`:** bare `valid_to`. Historisk pris/varighet/beskrivelse er låst — ny versjon er INSERT.

Ingen `platform_admin`. **FORCE RLS urørt.** `db:grants` exit 1 hvis policyene/triggerne mangler.

Klientfeil: «Kunne ikke lagre tjenesten. Prøv igjen.» SQLSTATE logges internt — aldri query/params.

---

## 2. Hva gikk galt

Ingenting i implementasjonen. Context7 ble ikke brukt (etablert Postgres RLS-mønster fra 0037–0041).

---

## 3. Hvilke fikser ble gjort

1. 0042 eier INSERT/SELECT/UPDATE på services + service_versions.
2. Kolonne-lås via trigger (`active` / `valid_to`).
3. Sanitert tRPC-feil (CWE-209).
4. Kontrakt + SET ROLE: INSERT…RETURNING; versjon med pris/beskrivelse; tom/uten/feil GUC og `platform_admin` alene avvist; identitet/pris låst.

---

## 4. Residual — andre dealer-skriv under FORCE RLS (P0)

Samme rot: schema-policy TO `authenticated`, prod = eier, `withTenant` uten `platform_admin`. **Ikke fikset her** (Mons-scope: tjenester først).

| Prioritet | Tabeller | Dealer-sti |
|---|---|---|
| P0 | `customers`, `customer_notes`, `vehicles` | Ny kunde / kjøretøy |
| P0 | `bookings`, `booking_services` | Ny jobb / widget-booking |
| P0 | `skills`, `mechanic_skills` | Kompetanse (formens «ingen ferdigheter» er SELECT) |
| P0 | `threads`, `messages`, `thread_participants`, `notifications` | Innboks |
| P0 | `parts`, `stock_locations`, `stock_levels`, `stock_movements` | Lager |
| P1 | `dealer_profiles` | INSERT/UPDATE (SELECT finnes i 0039) |
| P1 | `widget_keys`, `integration_config` | Widget / Quick / Vegvesen |
| P1 | `shop_orders`, `shop_order_lines` | Butikk-modul |
| P1 | `stream_events`, `sync_conflicts` | Stream / Quick-sync |
| P2 | `helpdesk_*`, `feature_flags*`, `billing_*`, `erasure_requests` | Admin / plattform |

`mechanics` har INSERT+SELECT (0039/0040), ikke UPDATE. `member_profiles` er dekket. `audit_log` INSERT krever tenant-guc **eller** `platform_admin` (0037).

---

## 5. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Deretter opprett tjeneste på `/innstillinger/tjenestekatalog` (navn + pris + beskrivelse). Forvent 200, ikke «Failed query».

Neste PR: P0-tabellene over, samme porter, Mons review.

Ikke skru av FORCE RLS. Ikke sett `platform_admin` i `withTenant`. Ikke merge #114 / #119.
