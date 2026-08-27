# Øktrapport 27.08.2026 — F8-01/F8-02 pullNow etter at Quick svarte

**Roadmap:** F8-01 (`progress`) · F8-02 (`progress`)

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F8-01** | Verifisert rotårsak bak prod-500 på `POST /trpc/quick.pullNow` (fra1, `dpl_9yis1ubfm52pDLCwt1BVRjxSTtkh`, request `w6tmj-1787811893507-02a246665b0d`). To eksterne GET lyktes; feilen er etter svaret. #59-fold (Guid→guid) er på main og er **ikke** nok: Zod `.optional()` avviser C# `null` på `Company`/`ContactPersons`/`CostPrice` m.fl. Ett null-felt velte hele siden. Rad-parse + hopp over rader uten identitet. Customer/item/stock kjøres isolert (`runIsolatedEntities`) — ærlig delvis resultat i stedet for blanket 500. Envelope-avvisning logger kun nøkler (`quick.batch.schema_reject`), aldri verdier. Persist er type + ekstern id + jsonb av nøkler Quick faktisk sendte (`quickEntitySnapshot`). Quick-grupper ekskludert. Ingen Resource på gateway. Ingen `sellPriceMinor`. `QUICK_GATEWAY_URL` urørt. |
| **F8-02** | «Hent nå» viser spesifikk serversetning (entitet + schema vs nettverk) og «Delvis hentet» når én entitet feiler. Ikke lenger bare «Klarte ikke hente fra Quick. Prøv igjen.» |

## 2. Hva gikk galt

Ingenting i koden etter fiks. Live Yamaha-body er **ikke** hentet i denne VM-en (ingen dealer-token her). Produksjonsbeviset er Vercel: to vellykkede GET, deretter 500 uten flere utgående kall — matcher parse etter svar. Null-avvisningen er verifisert mot Zod på C#-formet fixture (samme feilmelding som ville gitt «Uventet svarformat»).

## 3. Hvilke fikser ble gjort

1. Valgfrie Quick-felt er `.nullish()` (C# `null`).
2. Batch parses envelope først; rader uten `guid`/`id` hoppes over.
3. `runIsolatedEntities` + `pullNow` returnerer `ok`/`partial`/`errors` i stedet for å kaste 500 når minst én entitet kan fortsette.
4. Norske feilsetninger navngir entitet og skiller schema vs nettverk.
5. UI viser `pull.error.message` / entity-errors.

## 4. Neste steg

- Live «Hent nå» mot tilkoblet forhandler via gateway: bekreft at kunder, varer og lager fylles (eller at UI viser ærlig delvis + hvilken entitet som feilet).
- Resource/TimeTracking på gateway-allowlisten: egen PR, ikke denne.
- Booking/salg + PUSH + DLQ: uendret TODO på F8-01.
