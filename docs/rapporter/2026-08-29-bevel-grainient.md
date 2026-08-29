# Rapport — telefon-bevel nederst + Grainient-grå (29.08.2026 kveld)

## Hva er gjort

- **F5-13:** Telefon-bevel (avatar + Innstillinger + logg ut) satt nederst i telefon-kolonnen uten sticky/fixed. Kolonnen er minst synlig høyde (`min-h-dvh` / `flex-1`). Main vokser. Bevel er siste barn med `mt-auto` — nederst når innholdet er kort, etter innholdet når det er langt, scroller med siden. Safe-area-padding over home-indicator beholdt. Verifisert mot PhoneShell, phone-home og Dine jobber. Desktop-sidebar urørt.
- **F5-13 (Grainient):** Forhandler-kortet bruker `#777777` / `#333333` / `#111111` i både lys og mørk. `timeSpeed` 0.25, `colorBalance` 0.2, `warpStrength` 1 beholdt. Ingen lys-vask, ingen `lightMode`, lys tekst på kornet. Ingen hvit overlay på siden.

## Hva gikk galt

Alt gikk som planlagt. Eneste miljøstøy: `pnpm --filter` kjører `prepare`/`lefthook install` mot custom `core.hooksPath` og feiler; tester ble kjørt med lokal vitest-binær.

## Hvilke fikser ble gjort

- `main` hadde bare `md:flex-1`, så kort innhold lot bevelen sitte midt på skjermen med tomrom under. Nå `flex-1` + `mt-auto`.
- `GRAINIENT_LYS` var `#fff/#ededed/#f5f5f5` og `lightMode` vasket shaderen mot hvitt. Begge palettene er nå de tre gråene; `useTema` fjernet.

## Neste fase / neste steg

- Ingen ny fase. Merge når Mikael har sett bevel-bunn på telefon og Grainient i dagslys.
