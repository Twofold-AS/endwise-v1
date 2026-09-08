# Rapport — F3-05 forhandler-hjem, Mikael-korreksjon

**Dato:** 8. september 2026  
**Roadmap:** F3-05 (innhold). F5-13 chrome urørt.

## 1. Hva er gjort

- Toppkort-spark er tilbake til Amicro **linje/growth** (`DitherGrowthChart`, forrige → denne måned) i en mini avrundet boble. Ikke donut/sirkel.
- Ikonplater på Innboks, Lager, ansatte og +Jobb er **alltid hvit** `#ffffff` — følger ikke tema.
- + Jobb er **én linje**: hvit ikonboks med + og teksten «Jobb» ved siden av.
- Innboks viser **kun meldingstall** + «Les alle siste meldinger» + pil. Mini-stats og grønn/rød trend er borte.
- Ikonene er større (22px i 44px-plate) på alle fire radkort.
- Fortsatt kun de fem flatene. Ingen ekstra kort. Ronny/profil urørt. ⛔ #114/#119.

## 2. Hva gikk galt

- #157 byttet månedsboblen til `DitherDonutChart` (sirkel). Mikael ville ha forrige linje-dither.
- Ikonboksen brukte `bg-card`, som går mørk med tema. Konseptet er fast lys plate.
- + Jobb sto stablet uten plate.
- Innboks hadde en stats-bar + trend som ikke skulle vises.

## 3. Hvilke fikser ble gjort

- `PulseManedBoble` → `DitherGrowthChart` i avrundet mini-boble (ikke `rounded-full`).
- `PulseIkonFlate` med hardkodet `#ffffff` + ink-ikon.
- `PulseJobbFlis` samme én-linjes mønster som Innboks/Lager.
- `innboksRad` returnerer bare `meldinger` + `mock`.
- Tester og roadmap/UI-PAKKER oppdatert.

## 4. Neste fase / neste steg

- Draft PR. Mikael visual GO.
- Ronny/profil er eget spor. Ikke #114/#119.
