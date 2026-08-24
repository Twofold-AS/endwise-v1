# Rapport — 24.08.2026 — Quick server-GET + lager-synk (F1-07 / F8-01 / F8-02)

**Roadmap:** F1-07 (`progress`) · F8-01 (`progress`) · F8-02 (`progress`)
**Godkjenning:** Mikael (eksplisitt bestilling: Static IPs, ikke Fixie/VM/browser-token)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-07** | Live GET `client/info` forblir **server-side** (`setConfig` / `aktiverQuickEtterGet`). Vercel Static IPs (fra1) er infrastruktur — ingen proxy-env, ingen Fixie, ingen Scaleway-VM, ingen nettleser-token (PR #28 / CWE-922). HTTP 500 ≠ ugyldig nøkkel. |
| **F8-01** | «Hent nå» + cron henter **kunder og deler/lager**. GET `/api/v2/item/batch` og `/api/v2/stockentry/batch` (samme `{ totalCount, limit, offset, results }`-paging som customer/batch, `offset += results.length` til `offset >= totalCount`). Persist i eksisterende lager-tabeller, ikke JSON-filer. Migrasjon **0023_quick_lager**. |
| **F8-02** | Integrasjoner/Quick: «Hent nå» + sist synk viser kunder og deler. Norsk. Ingen Admin-tab. |

### Migrasjon

**0023_quick_lager** — `parts.source`, `parts.quick_guid` (+ unik `(tenant_id, quick_guid)`), `stock_locations.quick_guid` (+ unik). Etter merge: `pnpm db:setup`.

### GET-stier (ikke funnet opp som POST)

Repo bekreftet `customer/batch` + `client/info`. Quick3-release notes: item-endepunkt (ItemCode/ItemName) og GET stock entry by guid, pluss batch-of-X. Derfor GET-only `item/batch` og `stockentry/batch`. 404 på stockentry faller tilbake til `inStock` på varen. Ingen skriveverb mot Quick.

---

## 2. Hva gikk galt

Alt gikk som planlagt i koden. Swagger er token-gatet og tom uten nøkkel — item/stock-felt er `.loose()` med flere navn, samme mønster som kundekontakt. Live 20k Yamaha-paging er testet mot results-JSON, ikke mot Quick i denne VM-en.

---

## 3. Hvilke fikser ble gjort

1. Felles `nextBatchOffset` — stopper på tom side og når `offset >= totalCount`.
2. Token forblir envelope-kryptert; `config` sender bare `hasToken`.
3. Quick vinner `onHand`; `reserved` clamps, aldri økes av pull.

---

## 4. Neste fase / neste steg

F1-07 står `progress` (mekanikere på tvers). F8-01: booking/salg, PUSH, mekaniker plukk-fra-jobb. Etter merge: `pnpm db:setup` mot Scaleway. Verifiser live `client/info` fra Vercel med Static IPs.
