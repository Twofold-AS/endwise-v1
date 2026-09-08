# Amicro dither charts (vendorisert)

Kilde: https://github.com/Subhan-code/Amicro--Micro-transitions-
Site: https://amicro.vercel.app/dither-charts
Pinnet commit: `86b55340bfb939b8e93bb53aa46ba017c3449f1c` (main)
Hentet: 6. september 2026
Lisens: MIT (se `LICENSE`)

## Hvorfor ikke CLI

`npx @subhanhq/amicro@latest add dither-donut` er det nettstedet viser.
Publisert `@subhanhq/amicro@1.0.1` (22.07.2026) har **ingen CLI-bin** — pakken
er Vite-bygget av demosiden. shadcn-registeret (`registry/ui/*.json`) har
loaders/entrance/hover, **ikke** dither-charts. Derfor er kilden kopiert inn
her, samme mønster som matrix-loaders og bloub.

## Hva som er hentet (minste flate)

Kun chart-typene Analyse/Rapporter allerede viser:

| Amicro-navn | Fil | Erstatter |
|---|---|---|
| Dither Stacked Bar | `dither-stacked.tsx` | Recharts-søyle (bookingvolum) |
| Dither Area Growth | `dither-growth.tsx` | Recharts-areal (sidevisninger) |
| Revenue Spline Line | `dither-revenue.tsx` | Recharts-linje (belegg) |
| DitherDonutChart | `dither-donut.tsx` | Recharts-pai (trafikkilder) |

`use-canvas-setup.ts` er den delte canvas-kroken (ResizeObserver +
IntersectionObserver + reduced-motion).

Ikke hentet: heatmap, gauge, scatter, funnel, device-donut, storage, uptime.

## Avvik fra oppstrøms (bevisst)

Oppstrøms-komponentene er **demo-widgets** med hardkodet data, mørk chrome og
hvit dither (laget for mørk bakgrunn). Endwise er lyst-only + Attio-farger:

- Valgfri `rows` / `values` / `series` / `slices` så mock-data kan mates inn
- `compact` er produkt-stien (kun canvas — `AnalyseKort` eier chrome)
- `DitherGrowthChart` tar valgfri `width`/`height` (px) så mini-bobler ikke
  avhenger av `h-full` + ResizeObserver (0-flate = tom sirkel)
- `useCanvasSetup(initial?)` måler i `useLayoutEffect` og ignorerer
  IntersectionObserver på 0×0-flate
- Dither-fyll bruker seriehex (ink `#1c1d1f`, Action Blue `#407ff2`, …),
  ikke `#FFFFFF`
- `theme` default `light`

Canvas-motoren (Bayer-lignende hash + rAF-dither) er den samme.

## Oppdatering

Hent på nytt fra samme pin (eller ny pin etter avtale) og bytt ut filene.
Ikke ta inn hele Amicro-katalogen.
