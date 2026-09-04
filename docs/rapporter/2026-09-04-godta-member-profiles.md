# Rapport — 04.09.2026 — godta brenner ikke invite før member_profiles

**Roadmap:** F1-10 (`done`) — hotfix, status uendret  
**Godkjenning:** produksjonsfeil på endwise.no (df94fc3 / #124). **PR #125 draft — Mons re-check. Ikke merge.**

---

## Mons re-check (obligatorisk før merge)

| # | Krav | Hvor | Status |
|---|---|---|---|
| 1 | `onConflictDoUpdate` trenger eier-UPDATE, ikke bare INSERT | `member_profiles_tenant_update_owner` i 0040 + `grants.sql` | Ja |
| 1a | Eier-only, `current_user` ≠ `authenticated`/`endwise_app` | USING + WITH CHECK | Ja |
| 1b | Ikke-tom `app.tenant_id`, `tenant_id = guc` | `nullif(..., '') is not null` + likhet | Ja |
| 1c | Ingen blanket `platform_admin` | Policy-kropp har ikke `app.platform_admin` | Ja |
| 1d | FORCE RLS urørt | Ingen `NO FORCE` / `DISABLE RLS` | Ja |
| 1e | Kolonne-trygg UPDATE | Tabellen har 5 kolonner. Trigger `member_profiles_owner_update_guard` låser PK (`tenant_id`,`user_id`) + `nickname` for tabelleier. Godta setter **bare** `job_function` + `updated_at`. `authenticated`/`endwise_app` urørt (kallenavn). | Ja |
| 2 | mechanics eier-INSERT (mekaniker-godta) | `mechanics_tenant_insert_owner` — samme eier/GUC-mønster | Ja |
| 2a | RETURNING SELECT | `mechanics_tenant_select_owner` (0039) | Ja |
| 2b | Leder-invite skriver **ikke** mechanics | `inv.funksjon === 'mekaniker'` | Ja |
| — | Consume sist, samme tx | `withTenant` → profil → ev. mechanics → `forbruk(token, tx)` | Ja |
| — | Saniterte 500-er | «Kontoen kunne ikke opprettes. Prøv igjen.» SQLSTATE internt | Ja |
| — | Tester upsert-konflikt + mechanics INSERT under eier | Live SET ROLE + kontrakt | Ja |

**Godta-UPDATE godtar:** `job_function`, `updated_at`.  
**Godta-UPDATE godtar ikke:** `tenant_id`, `user_id`, `nickname` (trigger 42501). Andre kolonner finnes ikke.

### Ops (ikke i denne PR)

Invitasjonen som feilet 04:23 UTC er **allerede brent**. Etter merge + `pnpm db:setup` på Scaleway: send eier-invitasjonen på nytt. Ikke merge #114 / #119.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-10** | POST `/invitasjoner/godta` 500 etter at invitasjonen var forbrukt. Retry 410 → UI «Invitasjon ugyldig». |

**Rotårsak (verifisert mot kode + prod-sekvens, ikke gjettet):**

1. GET `/invitasjoner/<token>` 200 — `lookup_open_invitation` + eier-SELECT på tenants (0039) virker.
2. POST `/godta` kalte `consume_invitation` **før** bruker/medlem/`member_profiles`.
3. `insert into member_profiles` feilet (tenant `50f690af-…`, user `f86aa037-…`, `job_function leder`).
4. Consume var allerede committet. Retry → 410.

Samme FORCE RLS-klasse som invitations RETURNING (#121) og tenants SELECT (#124): eier `endwise` er ikke `authenticated`. 0039 ga SELECT. INSERT manglet. `onConflictDoUpdate` trenger også UPDATE.

**Fikset:**

1. Én `withTenant`: bruker → medlem → `member_profiles` → ev. `mechanics` → `consume_invitation` sist. Feil ruller tilbake `accepted_at`.
2. `forbruk(token, tx?)` — DEFINER deltar i kallers transaksjon. GUC: `app.invitation_hash` + `app.tenant_id`. De krysser ikke.
3. 0040 (eier-only, ikke-tom `app.tenant_id`, `tenant_id = guc`, **ingen** `platform_admin`, FORCE RLS urørt):
   - `member_profiles_tenant_insert_owner`
   - `member_profiles_tenant_update_owner` (USING + WITH CHECK)
   - `member_profiles_owner_update_guard` — tabelleier kan ikke flytte rad eller skrive nickname
   - `mechanics_tenant_insert_owner` — mekaniker-invite (ikke leder). RETURNING: 0039 SELECT.
4. Klient: «Kontoen kunne ikke opprettes. Prøv igjen.» SQLSTATE internt.

---

## 2. Hva gikk galt

Alt gikk som planlagt i denne økten. Live SET ROLE-tester skippes her (ingen Docker-Postgres i VM). Kontrakt + HTTP-mock kjører uten DB.

Mons review krevde UPDATE for upsert og mechanics INSERT — lagt inn på samme PR (#125). Denne runden: UPDATE-negativer (uten/tom/feil GUC + `platform_admin` alene) og grants-sjekk på PK-lås.

---

## 3. Hvilke fikser ble gjort

- Atomisk godta (consume sist, samme tx)
- Eier-INSERT + tenant-scopet eier-UPDATE på `member_profiles` (kolonne-lås via trigger)
- Eier-INSERT på `mechanics`
- Saniterte 500-er; SQLSTATE internt
- Tester: profil-feil kaller ikke `forbruk`; upsert-konflikt; eier-UPDATE uten/tom/feil GUC avvises; mechanics INSERT; eier kan ikke endre nickname

---

## 4. Neste steg

1. Mons re-check på #125. Draft — ikke merge.
2. Etter merge: `pnpm db:setup` mot Scaleway.
3. Resend den brente eier-invitasjonen.
4. Ikke merge #114 / #119.
