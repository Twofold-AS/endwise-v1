# Rapport — 22.08.2026 — F4-20 widget-slot + token-fallbacks

**Roadmap:** F4-20 `planned` → `done`
**Godkjenning:** Mikkis (P0-bestilling)

---

## 1. Hva er gjort

### F4-20 — Nullstill valgt tid når tjeneste eller dato endres

**Hypotesen stemte.** `chosen` (og `slots`) ble bare tømt inne i `loadSlots()`, som bare kjører
når kunden trykker «Vis ledige tider». Rekkefølgen tjeneste A → vis tider → velg tid → bytt
nedtrekk til B → «Send» sendte `serviceVersionId` for B sammen med et slot regnet ut for A.

**Klient:** `onChange` på både `<select>` og datofeltet kaller `resetBookingChoice()` og tømmer
`chosen` + `slots`. Navn/telefon/send skjules fordi de er gated på `chosen`.

**Server:** `createBookingRequest` slår opp ledige tider for den `serviceVersionId` (samme
arbeidsdag 08–16 Europe/Oslo og 30-min rutenett som `/widget/availability`) og kaster
`WidgetBookingError` hvis starten ikke er blant dem. Klienten er ikke eneste vakt.

### Sikkerhetsgjennomgang (Mons) — 22.08 kveld

**CWE-367 TOCTOU:** Tilgjengelighet og kapasitet sjekkes nå i SAMME `withTenant`-transaksjon
som skrivingen, etter `lockShopSlots` (deretter mekaniker-lås, samme rekkefølge som
`createBooking`). Ingen les-utenfor-lås-og-skriv-etterpå.

**CWE-841:** Shop-kapasitet er `sum(mechanics.capacity)` + opptatte intervaller, ikke
`mechanics limit(1)`. Mekaniker velges med `pickMechanicWithRoom` (første med gjenstående
personlig kapasitet). `writeBooking` teller overlapp mot mekanikerens `capacity`.

**Tidssone:** Arbeidsdagen er Europe/Oslo, ikke process-lokal tid. Tester for sommer/vinter
og «15:30 UTC ≠ 15:30 Oslo» kjører alltid (ingen skip). Reject-when-full og no-race er
enhetstester + DB-tester (DB skippes bare uten `DATABASE_URL`/`APP_DATABASE_URL`).

### Token-fallbacks og PWA-manifest

Widgeten falt tilbake til mørk TheFold-flate (`#151515`) og grønn aksent (`#1ED27D`) når
`--ew-*` ikke var lastet. Produktet er lyst + svart aksent `#111`.

- `packages/widget-ui`: fallbacks = `#ffffff` / `#333333` / `#111111` + `#ffffff` på aksent
- `apps/web/app/manifest.ts`: `background_color #ffffff`, `theme_color #111111`
- Viewport `themeColor` var allerede `#ffffff` — urørt
- Ingen roadmap-rød `#EE2924`, ingen grønn primærknapp

### Stale kommentarer (billig)

- `packages/widget-tokens/src/index.ts` sa fortsatt «mørkt default, grønn aksent»
- `docs/UI-PAKKER.md` §6-tabell og merkevare-avsnittet sa at `#1ED27D` *er* `--ew-accent`

Retttet til gjeldende sannhet: lyst standard, aksent `#111`, logogrønn bare i logo.svg.

## 2. Hva gikk galt

Alt gikk som planlagt. Hypotesen ble verifisert i koden før fiksen.
context7 MCP var ikke tilgjengelig i miljøet — ingen ny teknologi ble tatt i bruk
(Hono/Zod/Vitest-mønsteret var allerede i fila).

## 3. Hvilke fikser ble gjort

- Klient-reset i `onChange` (select + dato)
- Server-avvisning mot availability for versjonen
- Widget-fallbacks og PWA-manifest mot produkt-tokens
- Stale grønn-aksent-kommentarer

## 4. Neste fase / neste steg

F4 er ikke ferdig som fase. Neste widget-punkter i køen: F4-16 (stegindikator), F4-17
(tilbake-knapp — peker fortsatt på F4-20-feilen som kontekst), F4-18 (oppsummering),
F4-19 (ekte labels), F4-21 (validering), F4-22 (kvittering med referanse).
SMS-bekreftelse ligger fortsatt på F4-08 / F6 — ikke rørt her.
