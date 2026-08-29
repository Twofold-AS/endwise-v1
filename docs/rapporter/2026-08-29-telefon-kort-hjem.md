# Rapport — Telefon kort-hjem + Chrome-høyde (29.08.2026)

## Hva er gjort

- **F5-13:** Jonas locked FILL + Chrome safe-area. Horisontal telefon-hovedmeny (#79–#83 `PhoneNav`) erstattet av `PhoneShell`.
- Dealer telefon-hjem: fylte aksentkort med ekte meta. Rekkefølge: Verkstedet-hero (I dag · Pågår · Fullført) → Timeplan (3–4 rader, tom = «Ingen jobber i dag» + Ny jobb, tap = Jobber-kalender) → Statistikk | Rapporter → Innboks | Jobber → Kunder | Organisasjon → Samarbeid | Hjelp → Lager lavt (Butikk ved shop-flagg).
- Ingen hjem-kort for Book, Oppslag, AI, Kompetanse, Prisliste, Abonnement.
- Inne i Verkstedet (`?visning=dag`): jobbkort, Book for kunde-merkelapp, Ny jobb, Kalender nederst. Tilbake = kort-hjem.
- Mekaniker: Min dag-hero + hurtigkort (Lager, Kompetanse, Timeplan, Hjelp, Butikk) + jobber nedover. Detaljer er accordion (én åpen), ikke navigasjon.
- Shell: `env(safe-area-inset-top)` over logo, `env(safe-area-inset-bottom)` under bevel (avatar + navn + logg ut). Rot `h-dvh` / `min-h-svh`, `viewport-fit: cover`. Ingen bunnbar, hamburger, horisontal hovedscroller, Mer-sheet eller visningsvelger.
- Organisasjon-piller wrapper på telefon. Selger/support uten Abonnement/Integrasjoner (uendret filter).
- Desktop-sidebar og desktop-Verkstedet / desktop-Min dag er urørt.

## Hva gikk galt

Alt gikk som planlagt mot den låste FILL-specen. Context7 MCP fantes ikke i miljøet — API-er ble lest fra eksisterende kallsteder i repoet. Innlogget Chrome-viewport kunne ikke kjøres her (ingen sesjon/DB).

## Hvilke fikser ble gjort

- `h-screen` / `100vh` på app-roten byttet til `h-dvh` + `min-h-svh` (Chrome 100vh-bug).
- Timeplan på hjem er destinasjon til Jobber › Kalender, ikke Organisasjon-kapasitet.
- Innboks-ulest på fylt kort er hvit prikk/tall, ikke Ny-rød.

## Neste fase / neste steg

- Book for kunde er merkelapp på jobbkortet inne i Verkstedet — AI-/siste-kunde-dør er ikke denne PR-en.
- Quick urørt. Reserve-with-Google urørt.
