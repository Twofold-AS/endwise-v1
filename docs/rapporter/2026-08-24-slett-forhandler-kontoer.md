# Rapport — 24.08.2026 — orphan Better-Auth-innlogging etter forhandlerslett (F5-26)

**Roadmap:** F5-26 (`done`) — nytt steg 0026
**Godkjenning:** produksjonsfeil på endwise.no (ikke ny flate). Produktansvarlig (Mikael): når en forhandler slettes, skal kontoene dø med den.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-26** | Etter 0025 lyktes `tenants.slett` / `slett_forhandler(uuid)`, men dealer-brukere kunne fortsatt logge inn. De så et tomt skall (ingen org/member). Innloggingen må feile (ukjent e-post/passord). |

Rotårsak (verifisert i SQL, ikke gjettet mot prod-DB):

`slett_forhandler` slettet `member` / `invitation` / `organization`, men **ikke** `"user"`. Kommentarene sa «Sletter ikke user-rader (never delete self)» — det var ment å verne **acting platform-admin** og Endwise-brukere, ikke dealer-ansatte. Passordhash (i `account`), 2FA, passkey og sesjon ble igjen via CASCADE-FK som aldri ble utløst.

Fikset i migrasjon **0026_slett_forhandler_kontoer**:
- `DROP FUNCTION slett_forhandler(uuid)` før `CREATE` (samme mønster som 0025)
- Samle `user_id` **før** member-slett
- Slett `"user"` kun når null gjenværende `member`-rader og ikke Endwise-org-medlem
- Beholdt (annen org): `DELETE FROM session WHERE active_organization_id = slettet org`
- `verification` på slettet e-post
- Assert: ingen `member` for orgen, ingen `session.active_organization_id` mot død org
- Engangs-reparasjon: `"user"` uten member-rad (allerede-foreldreløse i prod)
- `app.slett_endwise_id` og FORCE RLS-policyer fra 0025 **urørt**
- Ingen RLS på auth-tabeller (ADR-002)
- `db:grants` **exit 1** uten `slett_forhandler_rev=0026`; sjekken matcher proname+prosrc (godtar identity `uuid` og `p_tenant_id uuid`)

Etter merge: **`pnpm db:setup`** på Scaleway. Loggen **MÅ** si `slett_forhandler rev=0026`. Deretter slett forhandleren på `/endwise/forhandlere` — allerede-slettede forhandleres foreldreløse kontoer ryddes i samme funksjonskjøring.

PR #33 (kun 0025-rev-sjekk / identity-args) dekkes her og kan lukkes.

---

## 2. Hva gikk galt

0025 tetter 412/RLS, men slettet aldri Better-Auth-identiteten. Context.dev MCP krevde auth og ble ikke brukt. Ingen avvik fra techstack. Auth-tabeller fikk ikke RLS.

---

## 3. Hvilke fikser ble gjort

1. 0026 DROP+CREATE av `slett_forhandler` med dealer-only user-slett.
2. `functions.sql` speilet (grants.ts overskriver etter migrate).
3. `db:grants` krever rev=0026 uten `identity = 'uuid'`-falsk negativ.
4. Tester: dealer-only borte (user/session/account/epost); Endwise-medlem beholdt.

---

## 4. Neste fase / neste steg

Mikael kjører **`pnpm db:setup`** mot Scaleway etter merge. Loggen skal inneholde `slett_forhandler rev=0026`. Deretter slett en forhandler (eller kjør slett på en ny/eksisterende) så engangs-reparasjonen tar de allerede-foreldreløse kontoene. F1-07/F8-01 forblir `progress`.
