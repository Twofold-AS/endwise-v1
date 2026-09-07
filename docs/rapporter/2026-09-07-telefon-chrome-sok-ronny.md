# Rapport — telefon-chrome CODE-GO kveld (07.09.2026)

## Add-on — større telefon-logo (samme kveld)

- **F5-13** — Mikael: Endwise-merke i telefon top-bar 1 er `PHONE_LOGO_PX=32` (noe større enn 24). Søk `h-8`, Ronny/profil 28px urørt. Desktop/sidebar `SHELL_LOGO_PX=24` urørt.

## Hva er gjort (roadmap)

- **F5-13** — Mikael CODE-GO på draft #150 (dest-nav-fiks beholdt). Telefon top-bar 1: søk `h-8`, Ronny- og profil-sirkel `PHONE_AVATAR_PX=28` / `size-7` (samme runde mål). Telefon-chrome Ronny sykler `RONNY_PHONE_IDLE` (store/små øyne, nysgjerrig, glad, mystisk) — aldri `colere`/sint. Uttrykk-only (`playing={false}`).
- **F5-13** — `PhoneSokOverlay` ved fokus: fullskjerm bakgrunn, mindre søkefelt flush venstre + **Avbryt**, nylige søk (vertikal), horisontale dest-ikoner, store dest-rader. Felt tint `#f0f0f0` / `bg-inset`. Ink-tekst. Ingen blå CTA, ingen pip.
- **F5-13** — Ronny-sheet: tettere luft over håndtak. Kompakt (80): bare «Ronny»-etikett, ingen bot-animasjon. Full (100): forstørr blir forminsk; på logg-topp forsvinner ikonet og Ronny tar plassen.
- Status `progress` til Jonas visual GO. Desktop 389/598/452 urørt. ⛔ #114/#119.

## Hva gikk galt

- Vitest kunne ikke importere `ronny-bot.tsx` (JSX). Idle-listene ble flyttet til `ronny-idle.ts`.
- `phone-sok.ts` + `phone-sok.tsx` i samme mappe ga tvetydig import. Overlay heter nå `phone-sok-overlay.tsx`.
- Dest-ikon/rad som `<Link>` lot overlay stå åpen etter navigasjon — byttet til `velg()` som lukker og pusher.
- Lefthook/`pnpm prepare` feiler i dette miljøet. Biome/tsc/vitest kjørt via `node_modules/.bin`.
- Live `/home` er auth-låst her. Skudd er Mobbin HTML-mock i headless Chrome:
  `phone-chrome-larger-logo.png` (32px-merke + små sirkler),
  `phone-chrome-smaller.png`, `phone-sok-overlay.png`, `phone-ronny-kompakt.png`,
  `phone-ronny-full-topp.png`, `phone-ronny-full-forminsk.png`
  under `/opt/cursor/artifacts/screenshots/`.

## Fikser

- `RONNY_PHONE_IDLE` uten `colere`; chrome bruker `idleSett`.
- Overlay lukker på dest-valg og Avbryt.
- Sheet: `pt-0.5` håndtak, kompakt uten `RonnyBot`, `RonnyForminskIkon` + `data-ronny-topp` ved `scrollTop <= 2`.
- Tester: `phone-sok.test.ts` + oppdaterte chrome/sheet-tester (60 grønne i den pakken).

## Neste

- Jonas visual GO på draft-PR #150. Ikke merge.
- Ekte innloggede skudd når sesjon finnes.
