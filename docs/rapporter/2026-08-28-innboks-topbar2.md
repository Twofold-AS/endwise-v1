# Rapport — Innboks + Organisasjon-skall (28.08.2026 kveld)

## Hva er gjort

- **F5-14:** Mikael IA kveld — Innboks matcher Organisasjon-mønsteret fra #78. Telefon-chrome (#79) er urørt.
- `/innboks` er én side. Top-bar 2 er samme komponent som Organisasjon (`h-control`, `text-label`, aktiv `#ededed`, hover `#f5f5f5`, `overflow-x`, `gap-2`). Landing = Oversikt (alle chatter).
- Ingen ekstra destinasjons-piller. Kunder / Intern / Endwise er filterknapper under top-bar 2, ikke egne sider.
- Filterraden er ikon-only: Alle chatter (`Inbox`) · Kunder (`Users`) · Intern (`Wrench`) · Endwise (`LifeBuoy`). `aria-label` / `title` beholdt. Aktiv = `bg-sidebar-active`.
- «Ny samtale» er tekstknapp i samme rad og åpner fortsatt Kunde · Intern · Support (Support primær, ingen Mekaniker-pille).
- Liste+detalj, ulest-regler, `thread_kind` og Endwise-modus er uendret. Mekaniker har fortsatt ikke dealer-innboksen.

## Hva gikk galt

Alt gikk som planlagt mot Mikael-briefen (skall + ikon-only follow-up). Ingen avvik i RBAC, compose-piller eller telefon-chrome.

## Hvilke fikser ble gjort

- Innboks-chrome fyller `main` (`h-full`) så lista får plass under to top-barer uten å røre top-bar 2-høyden.
- Tester som krevde synlig filtertekst er oppdatert til ikon + `aria-label`.

## Neste steg

- Telefon-sidebar / Handlinger / top-bar 2-høyde er eget spor (#79 + follow-up).
- Ikke merget.
