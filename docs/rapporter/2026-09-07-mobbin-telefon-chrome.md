# Rapport — Mobbin telefon-chrome (07.09.2026)

## Hva er gjort (roadmap)

- **F5-13** — Telefon (smalt viewport): dealer-sidebar er skjult (`hidden md:flex`). To toppbarer i `PhoneShell`:
  1. merke (kun logo) · Mobbin-søk (`bg-inset` `#f0f0f0`, `rounded-sm`, uten hvilekant) · Ronny-sirkel · profil-bokstav i samme sirkel (40px)
  2. Horisontale dest-piller fra `navForShell` / `FORHANDLER_NAV` (Verkstedet, Innboks, Timeplan, Kunder, Tjenester, Organisasjon, Lager, Butikk ved flagg). Aktiv = `bg-sidebar-active` (canvas-soft), **ingen** pip / `border-left`.
  - Hårlinje `#e0e0e0` / `bg-border` under bar 2.
  - Eksisterende hjem-innhold mappet til Mobbin-kort: `rounded-[24px]`, hero tint-fill uten kant, dest/hvilekort hairline-soft (`border-divide`). Chevron `text-fg-muted`.
- **F5-01** — notat: telefon-overlay/toggle er erstattet. Desktop-skall urørt.

Desktop 3-kolonne 389/598/452 + sidebar uendret. Mobbin-fargelås uendret (`#141414` / `#ffffff` / `#0066ff` kun kommersielt). `#114`/`#119` urørt. Ingen nye IA-destinasjoner.

## Hva gikk galt

Alt gikk som planlagt for chrome-låsen. Ingen ny stack-pakke.

Live `/home` er auth-låst i dette miljøet. Telefon-chrome verifiseres med kildetester + statisk 390-viewport-mock.

## Fikser

- Fjernet `PanelLeftOpen`/`Close`, midtstilt logo, tilbake i top-bar 1, og sidebar-overlay på telefon.
- Tester som låste overlay/toggle/Apple 14–16px radius er oppdatert til to-bar + 24px Mobbin-kort.
- Chevron på dest-kort bruker ikke lenger `text-accent-strong` (`#0066ff`).

## Neste

- Jonas visual GO på draft-PR #149 (ikke merge).
- Ekte innloggede telefon-skudd når sesjon finnes.
- Desktop-chrome forblir som i forrige Mobbin-lås.
