# Rapport — 29.08.2026 — Booking-widget på Butikk (testplassering)

**Roadmap:** F10-03 (progress, nytt steg) · F4-03 (progress, testplassering)
**Bestilling:** Mikael 2026-08-29 — test booking via eksisterende widget på Butikk

---

## 1. Hva er gjort

### F10-03 / F4-03 — midlertidig testplassering

Eksisterende `EndwiseWidget` (`@endwise/widget-ui`, F4-03) er lagt på forhandler **`/butikk`** (Katalog). Telefon og desktop er samme rute. Kort merkelapp: «Testplassering av booking-widgeten. Midlertidig, på Butikk.»

Ingen ny booking. Ingen Book-pille. Shop-flagget er uendret (nav + `shopProcedure`).

`shop.bookingWidget` (bak `shopProcedure`) get-or-create en publishable nøkkel merket `Butikk-testplassering` med dashboard-origin i allowlisten. Framer-nøkler med annen etikett røres ikke. Widgeten kaller samme `/widget/*` som Framer-embedet.

Booking-steg i stubben er uendret: **tjeneste → tid → konto (navn/telefon) → bekreft**. Ikke konto først. Ikke gjest-så-konverter. Ikke Reserve with Google. Quick skrives ikke til.

## 2. Hva gikk galt

Alt gikk som planlagt. Context7-MCP var ikke tilgjengelig (needsAuth); ingen ny teknologi tatt i bruk.

## 3. Hvilke fikser ble gjort

Ingen regresjonsfiks. Widget-koden i `EndwiseWidget.tsx` er urørt.

## 4. Neste fase / neste steg

F4-04…F4-08 (ekte steg i widgeten) og permanent Framer-hjem. F10-03: offentlig butikk / Medusa er fortsatt ikke denne slicen. Fjern testplasseringen når widgeten bor på forhandlerens nettside.
