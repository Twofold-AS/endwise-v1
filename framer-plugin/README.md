# @endwise/framer-plugin

Installbar Framer-plugin for Endwise-kundewidgeten (F4-01 / F4-09).

**Status: `progress` — paste-key-sti, ikke OTP/QR.** Pluginen lagrer publishable key + API-base i Framer plugin storage, setter inn en Code Component med Property Controls (Booking · AI · Tracking · Webshop), og kan røykteste `/widget/init`.

OTP/QR-pairing, Code File-synk (F4-11), multi-tenant MCP (F4-12) og CDN-canary (F4-13) er **ikke** med. Framer-agenten (F8-09) er et annet produkt.

## Hva som virker nå

1. **Dealer-binding:** publishable key (`pk_live_…`) velger tenant server-side. Klienten sender aldri `tenantId`.
2. **Modi:** Booking, AI (chat + art. 50), Tracking (funnel-hooks), Webshop (feiler lukket uten shop-flagg).
3. **Insert:** «Sett inn …-komponent» lager/finner Code File `Endwise` og setter den på lerretet med Property Controls.
4. **Forhåndsvisning i panelet** monterer `@endwise/widget-ui` mot samme API.
5. **Funnel (F4-14 start):** cookieless events til `/widget/events` → eksisterende `stream_events` med audience `widget:funnel` (ikke innboks-lyd).

## Forutsetninger Mikael må ha i et ekte Framer-prosjekt

- Live `pk_live_…` utstedt for forhandleren (`widget.keys.issue` — Admin → Organisasjon → Integrasjoner / Widget når UI-en er der; inntil videre via tRPC).
- Origin-allowlist på nøkkelen. **Eksakt** `https://vert` — ingen wildcard. Typisk:
  - publisert custom domain (`https://verksted.no`)
  - Framer-publisering (`https://<prosjekt>.framer.app` / `.framer.website`)
  - ev. preview-origin Framer viser i adresselinjen
  - ved panel-røyk test: origin til plugin-dev (`http://localhost:5173` eller Framers plugin-host)
- API-base som faktisk serverer `/widget/*`:
  - **prod:** `https://endwise.no` (Next-rute, ikke `api.endwise.no` ennå)
  - **lokal:** `http://localhost:3000`

## Installer og åpne i Framer

```bash
cd framer-plugin
npm install
npm run dev
```

Vite lytter på `http://localhost:5173`.

1. Åpne Framer-prosjektet (forhandlerens site).
2. **Menu → Plugins → Development → Open Development Plugin** (eller Developer Tools → Development Plugin).
3. Lim inn Vite-URL-en hvis Framer spør.
4. I panelet: lim inn `pk_live_…`, bekreft API-base, velg modus, **Lagre**.
5. **Test /widget/init**
   - 200: nøkkel + origin OK
   - 401: feil/inaktiv nøkkel
   - 403: origin mangler på nøkkelen — registrer den
6. **Sett inn Booking/AI/Tracking/Webshop-komponent** på lerretet.
7. Publiser eller preview siden. Origin på den URL-en må stå på nøkkelen.
8. Røyk: init → tjenester / chat / ledige tider / booking (konto på siste steg, ingen gjest).

Property Controls på komponenten: modus, publishable key, API-base, forhandler-merkelapp, språk, funnel av/på, farger.

## Sikkerhet

- Bare `pk_…`. `sk_…` avvises i panel og i Code Component.
- Hemmeligheter skal aldri i Framer (CWE-798/522). Code Files hostes offentlig på `framer.com/m/…`.
- Origin-sjekk + kortlevd JWT skjer i `/widget/init`.

## Utvikling i monorepoet

Fra repo-roten (pnpm workspace):

```bash
pnpm --filter @endwise/framer-plugin dev
pnpm --filter @endwise/framer-plugin test
pnpm --filter @endwise/framer-plugin typecheck
```
