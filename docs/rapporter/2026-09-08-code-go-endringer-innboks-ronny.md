# CODE-GO Mikael — Endringer, innboks, Ronny (08.09.2026)

## Hva er gjort

- **F3-05** To-delt hjem-toppkort: ukedag + grå dato + Planlagt/Pågår/Ferdig (live) · Endringer-badge (ekte `[AVVIK `-telling, 0 vises) · Amicro dither-donut 08–20 Oslo. Analyser nederst.
- **F7-05 (selger-stub)** `/timeplan/endringer` — liste fra `bookings.list`, Godkjenn er økt-lokal.
- **F5-14** Innboks: «Ingen samtaler» + «Send melding»; Modus-plate-sortering; penn-SVG ytterst høyre; telefon-split i viewport.
- **F6-29** Ronny-idle: nysgjerrig / glad / blunk (ett øye) / overrasket. Ingen colere.

## Endringer-rute og teller

- Rute: `/timeplan/endringer`
- Teller: `endringerTeller` på `bookings.list` i `endringerVindu` (30d bak / 14d fram). Prefiks `[AVVIK ` fra `mechanic.reportDeviation`.
- Hull: ekstra-tid fra Min dag er ikke persistert (teller 0). Godkjenn skriver ikke tilbake.

## Hva gikk galt

- Context.dev MCP var ikke autentisert (hoppet over).
- Forrige #162-tester forbød donut på hjem — overstyrt av denne CODE-GO.

## Fikser

- Telefon-innboks: `erInnboksFlate` låser scroll; sidebar skjules ved tråd/`?ny=1`; detaljer er `absolute` inne i chrome.

## Neste

- Persistert godkjenning + notes-update (F7-05).
- Ekstra-tid-forespørsel som ekte rad.
