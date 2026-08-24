# Rapport — 24.08.2026 — orphan Better-Auth-innlogging etter forhandlerslett (F5-26)

**Roadmap:** F5-26 (`done`) — steg 0026
**Godkjenning:** produksjonsfeil på endwise.no. Produktansvarlig (Mikael): når en forhandler slettes, skal kontoene dø med den. Mons NO-GO på global DELETE (CWE-212/359/284).

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | Etter 0025 lyktes `tenants.slett`, men dealer-brukere kunne fortsatt logge inn. 0026 sletter dealer-only `"user"` SCOPET til orgen som slettes. |

Rotårsak: `slett_forhandler` slettet `member` / `invitation` / `organization`, ikke `"user"`.

Fikset i **0026_slett_forhandler_kontoer**:
- `DROP FUNCTION` + `CREATE` med `-- slett_forhandler_rev=0026`
- Samle `user_id` **før** member-slett
- Slett `"user"` / `verification` med `u.id = any (v_org_user_ids)` **og** `NOT EXISTS member` i **samme** statement (Endwise-medlemmer har member-rad og beholdes)
- Beholdt: `DELETE FROM session WHERE active_organization_id = slettet org`
- **Ingen global DELETE i funksjonen** (CWE-212/359/284)
- 0025-leftovers: engangs-DML **nederst i migrasjonen** (én gang som eier ved migrate), ikke i `slett_forhandler`. Konservativt: kun `"user"` uten member-rad
- `app.slett_endwise_id` og FORCE RLS fra 0025 **urørt**. Ingen RLS på auth-tabeller (ADR-002)
- `db:grants`: EXISTS + `slett_forhandler_rev=0026`, ikke `identity = 'uuid'`

---

## 2. Hva gikk galt

Første utkast av 0026 hadde to globale `DELETE` (verification + `"user"` where NOT EXISTS member) inne i funksjonen. Hver `tenants.slett` ville tørket **alle** memberless Better-Auth-brukere (mid-signup, pending invite). Mons NO-GO. Fikset: scoped `ANY(v_org_user_ids)`; leftovers kun som migrasjons-DML.

Context.dev MCP krevde auth og ble ikke brukt. Ingen avvik fra techstack.

---

## 3. Hvilke fikser ble gjort

1. Fjernet globale DELETE fra `slett_forhandler`.
2. Scoped `delete from "user"` / `verification` til `any (v_org_user_ids)` + NOT EXISTS member.
3. Engangs-DML for 0025-leftovers flyttet til 0026-migrasjonen (etter GRANT).
4. Testen som forventet at en urelatert orphan forsvant ved slett, er snudd: hen overlever. Dealer-only i **denne** orgen er borte; Endwise dual-member beholdt.

---

## 4. Neste fase / neste steg

Mons tre punkter: ingen global DELETE i funksjonen; scoped `ANY(v_org_user_ids)`; leftovers kun i migrasjons-DML. F1-07/F8-01 forblir `progress`.
