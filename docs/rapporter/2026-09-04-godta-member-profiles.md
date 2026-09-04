# Rapport — 04.09.2026 — godta brenner ikke invite før member_profiles

**Roadmap:** F1-10 (`done`) — hotfix, status uendret  
**Godkjenning:** produksjonsfeil på endwise.no (df94fc3 / #124). PR #125 holdes som draft — Mons re-check, ikke merge.

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
   - `member_profiles_tenant_update_owner` (USING + WITH CHECK) — godta setter bare `job_function` + `updated_at`
   - `member_profiles_owner_update_guard` — som tabelleier kan PK og `nickname` ikke endres. `authenticated` / `endwise_app` urørt (kallenavn).
   - `mechanics_tenant_insert_owner` — mekaniker-invite (ikke leder). RETURNING: 0039 SELECT.
4. Klient: «Kontoen kunne ikke opprettes. Prøv igjen.» SQLSTATE internt.

### Ops (ikke i denne PR)

Invitasjonen som feilet 04:23 UTC er **allerede brent**. Etter merge + `pnpm db:setup` på Scaleway: send eier-invitasjonen på nytt. Ikke merge #114 / #119.

---

## 2. Hva gikk galt

Alt gikk som planlagt i denne økten. Live SET ROLE-tester skippes her (ingen Docker-Postgres i VM). Kontrakt + HTTP-mock kjører uten DB.

Mons review krevde UPDATE for upsert og mechanics INSERT — lagt inn på samme PR (#125).

---

## 3. Hvilke fikser ble gjort

- Atomisk godta (consume sist, samme tx)
- Eier-INSERT + tenant-scopet eier-UPDATE på `member_profiles` (kolonne-lås via trigger)
- Eier-INSERT på `mechanics`
- Saniterte 500-er; SQLSTATE internt
- Tester: profil-feil kaller ikke `forbruk`; upsert-konflikt; mechanics INSERT; eier kan ikke endre nickname

---

## 4. Neste steg

1. Mons re-check på #125. Draft — ikke merge.
2. Etter merge: `pnpm db:setup` mot Scaleway.
3. Resend den brente eier-invitasjonen.
4. Ikke merge #114 / #119.
