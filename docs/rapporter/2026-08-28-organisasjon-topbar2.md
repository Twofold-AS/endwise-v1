# Rapport — Organisasjon + top-bar 2 (28.08.2026)

## Hva er gjort

- **F5-13 / F5-19:** Mikael IA (ettermiddag) + Jonas visuals (kveld, låst). Tokens urørt.
- Organisasjon er én sidebar-rad til `/organisasjon`. Top-bar 2: Oversikt · Timeplan · Ansatte · Abonnement · Integrasjoner.
- Top-bar 2 er samme 32-rad som top-bar 1 (`h-control`, `text-label`), aktiv `bg-sidebar-active`, hover `bg-surface-2`. Én rad, `overflow-x-auto`, `flex-nowrap`, `gap-2`. Ikke svart pille, ikke 44px, ikke `text-sm`.
- Tjenester & priser ligger på Abonnement-seksjonen. Ikke egen pille. Ikke i Innstillinger.
- Kompetanse bare på ansattkort og Opprett ansatt-dialog.
- Prisliste er blokk på Oversikt. `/prisliste` og `/innstillinger/tjenestekatalog` redirecter dit. Ikke under Jobber.
- Opprett ansatt er dialog (navn, e-post, jobb tittel, rolle, Tilganger synlig og disabled).
- Shell: minimize i sidebaren, mindre `logo.svg` uten recolor, bevel brukerchip uten rolle.
- Telefon: horisontal scroll-sidebar erstatter top-bar 1. Hjelp er knapp, ikke slider. Ingen helpdesk-kort.
- Selger/support uten Abonnement/Integrasjoner. Mekaniker uten Organisasjon.
- Se verkstedet: Organisasjon peker på `/endwise/verksted/[slug]/organisasjon` (Oversikt = forhandlerkort, lesing).

## Hva gikk galt

Alt gikk som planlagt mot Mikael-strukturen og Jonas-fasiten. Ingen avvik i priser, SMS, shop-flagg, Quick eller tokens.

## Hvilke fikser ble gjort

- Nav-tre og tester fra Jonas-morgenen (Ansatte-piller) til Mikael-ettermiddagen.
- Jonas-fasit: nowrap/min-h på top-bar 2 og telefonmeny.
- Prisliste-aliaser redirecter til Oversikt.
- Inspect-remap sluttet å sende Organisasjon til `/organisasjon/forhandleren`.

## Neste steg

- Custom permissions (Tilganger) er synlig disabled — ikke bygget.
- Inspect viser kun Oversikt live; øvrige seksjoner er «ikke åpen ennå».
- Ikke merget.
