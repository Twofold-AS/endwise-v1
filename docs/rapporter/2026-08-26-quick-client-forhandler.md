# Øktrapport 26.08.2026 — F8-01/F8-02 Quick client/info → forhandler

**Roadmap:** F8-01 (`progress`) · F8-02 (`progress`)

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F8-01** | Første ekte Quick-skriv av dealer-profil fra `GET /api/v2/client/info`. Skjemaet krever ingen felt (tomt objekt passerer fortsatt). `foldQuickJsonKeys` folder PascalCase. Apply på `pullNow` (før katalog, egen sti) og etter vellykket `setConfig`/`testConnection`/`oppstart`. Gateway-allowlist urørt. Ingen Resource. Ingen `sellPriceMinor`. Plattform-org skrives aldri. |
| **F8-02** | Etter pull/setConfig/test invalideres `session.me` så sidebar-forhandlernavn (`tenants.name`) viser Quick-verdien. |

### Feltkart (Quick-nøkkel etter fold → Endwise-kolonne)

| Quick | Endwise | Merknad |
|---|---|---|
| `name` (fold av `Name`) | `tenants.name`, `organization.name` | forhandlernavn / sidebar |
| `company` (fold av `Company`) | `tenants.name`, `organization.name` | bare hvis `name` mangler — samme bekreftede firmanavn-nøkkel som `customer/batch` |
| `slug` | **ikke skrevet** | unik på tenants/organization + `/endwise/verksted/[slug]`. Ingen bekreftet stabil Quick-slug. |
| adresse / postnr / poststed / orgnr / telefon / e-post / nettside | **ingen kolonne** | finnes ikke på `organizations`/`tenants`/`settings`. Ikke funnet opp. |

Live Yamaha-body er ikke logget (gateway logger aldri body). Mapper bare nøkler som finnes etter fold og som har org-kolonne.

## 2. Hva gikk galt

Ingenting blokkerte implementasjonen. Context.dev MCP var ikke autentisert. Ingen live `client/info`-JSON i tidligere agenter (CWE-532). Derfor: `name`/`company` er de eneste nøklene vi kan mappe uten å finne opp felt; `.loose()` bevarer resten.

CI etter første push: Lint · Typecheck · Test grønn. CodeQL high på `/\/+$/` i `normalize.ts` (ReDoS mot ukontrollert limt URL) — fila var urørt i første commit, men Client-apply sendte mer input dit så alerten ble «ny på PR». Dependency-Check og ZAP feiler også på `main` (transitive audit + ZAP mot `https://example.invalid`).

## 3. Hvilke fikser ble gjort

1. `parseQuickClientInfo` + `mapQuickClientInfo` i toolkit-quick.
2. `probeQuickReadOnly` returnerer parset Client (ett GET, ingen ekstra kall).
3. `applyQuickDealerProfile` / `buildDealerProfileWrite` i modules — tenant-skopet, plattform-sperre.
4. `runIndependentOfCatalog` i `quick-pull.ts` — batch-500 ruller ikke tilbake Client-apply.
5. `session.me.invalidate()` etter pull/setConfig/test.
6. `stripTrailingSlashes` / `stripTrailingApiV2` — lineær strip, ingen `/\/+$/` (CodeQL).

## 4. Neste steg

- Live «Hent nå» mot Yamaha: bekreft at sidebar-navnet blir Quicks firmanavn.
- Hvis live Client har andre nøkler som matcher eksisterende kolonner: utvid kartet. Ikke før.
- Adresse/orgnr/nettside krever nye DB-kolonner — eget arbeid, ikke denne PR-en.
