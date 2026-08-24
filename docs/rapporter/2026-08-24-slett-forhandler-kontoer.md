# Rapport — 24.08.2026 — orphan Better-Auth-innlogging etter forhandlerslett (F5-26)

**Roadmap:** F5-26 (`done`) — steg 0026
**Godkjenning:** produksjonsfeil på endwise.no. Produktansvarlig (Mikael): når en forhandler slettes, skal kontoene dø med den. Mons: funksjonen GO; ubundet leftovers-DML NO-GO (CWE-212/359/284).

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | Etter 0025 lyktes `tenants.slett`, men dealer-brukere kunne fortsatt logge inn. 0026 sletter dealer-only `"user"` SCOPET til orgen som slettes. 0025-leftovers i migrasjons-DML bundet til session mot manglende org. |

Rotårsak: `slett_forhandler` slettet `member` / `invitation` / `organization`, ikke `"user"`.

Fikset i **0026_slett_forhandler_kontoer**:
- `DROP FUNCTION` + `CREATE` med `-- slett_forhandler_rev=0026`
- Samle `user_id` **før** member-slett
- Slett `"user"` / `verification` med `u.id = any (v_org_user_ids)` **og** `NOT EXISTS member` i **samme** statement
- Beholdt: `DELETE FROM session WHERE active_organization_id = slettet org`
- **Ingen global DELETE i funksjonen**
- 0025-leftovers: engangs-DML **nederst i 0026**, bundet til memberless `"user"` som HAR `session.active_organization_id` som **ikke finnes** i `organization`. Mid-signup / pending invite uten slik sesjon røres ikke. Ikke i `functions.sql` (grants.ts re-applier funksjonen)
- `app.slett_endwise_id` og FORCE RLS fra 0025 **urørt**. Ingen RLS på auth-tabeller (ADR-002)
- `db:grants`: EXISTS + `slett_forhandler_rev=0026`, ikke `identity = 'uuid'`

---

## 2. Hva gikk galt

1. Første utkast: globale DELETE inne i funksjonen. Mons NO-GO.
2. Andre utkast: samme ubundne DELETE som engangs-DML etter GRANT. Fortsatt CWE-212/359/284 (mid-signup / pending invite). Mons: FUNCTION GO, DML NO-GO.

Fikset: DML krever session mot manglende organization.

Context.dev MCP krevde auth og ble ikke brukt. Ingen avvik fra techstack.

---

## 3. Hvilke fikser ble gjort

1. Funksjonen scoped til `any (v_org_user_ids)` + NOT EXISTS member.
2. Leftovers-DML bundet til session → missing organization.
3. Test: DML etter GRANT nevner session + organization; ikke bare `NOT EXISTS member`.

---

## 4. Neste fase / neste steg

Venter Mons re-review. Ikke merge før det. F1-07/F8-01 forblir `progress`.
