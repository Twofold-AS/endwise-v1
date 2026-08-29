# Rapport — 29.08.2026 — Timeplan kalenderdag Europe/Oslo

**Roadmap:** F3-05 (progress) · F3-07 (done) · F3-08 (progress) · F7-03 (done)
**Gren:** `cursor/timeplan-oslo-kalenderdag-a488` mot `main`

## 1. Hva er gjort

### Rotårsak (visning, ikke lagring)
`bookings.starts_at` er `timestamptz`. Timeplan-stripen gjorde `setHours(0,0,0,0)` i nettleseren og sendte `toISOString()`. 29. aug 00:00 CEST ble `2026-08-28T22:00:00.000Z`. `mechanic.myDay` (`dayWindow`) gjorde `setHours(0,0,0,0)` i prosess-TZ. På Vercel (UTC) ble vinduet 28. 00:00Z–29. 00:00Z, så en jobb 29. aug 08:00 Oslo (06:00Z) falt i stripen merket 30. aug. Samme klasse som #89.

Quick trekker ikke jobber ennå (kun kunder/deler) — ingen write-back, ingen lagringsendring.

### Fikser
- `packages/modules/src/tid.ts` — `PRODUKT_TIDSSONE`, `osloKalenderdag`, `osloDagsvindu` (uavhengig av #89)
- Timeplan-stripe (Ansatte + Min dag) nøkler på `YYYY-MM-DD` i Oslo
- `mechanic.myDay` bruker `osloDagsvindu`
- Jobber-kalender, Verkstedet «I dag» og `dagensSaker` grupperer i Oslo
- Test: jobb 29. aug 08:00 Oslo lander på 29. aug, ikke 30.

## 2. Hva gikk galt
Alt gikk som planlagt. Context7-MCP ble ikke brukt (ingen ny teknologi).

## 3. Fikser
Se over. Lagret instant urørt.

## 4. Neste steg
- F3-05: aggregat-rute mot kapasitet, uleste / avvik
- F3-08: ferdighetsmerker på `/mekanikere`
- #89: reset-klokke i Oslo (egen PR)
