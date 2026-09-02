# Rapport — Ronny overlay, fullbredde-composer, Gradual Blur

**Dato:** 02.09.2026 · samme gren/PR #108 · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F5-13:** Åpen Ronny (peek og full) er en fast, ugjennomsiktig flate under chrome (pergament + Grainient). Verksted/innhold synes ikke gjennom. Side-scroller (`data-ronny-side-scroll`) får `overflow: hidden`. Topbar blir stående.
- **F5-13:** Peek-kort kan være Verksted-bredde; backdrop dekker resten. Full-åpen er viewport-grainient under chrome.
- **F5-10:** Composer-bakgrunn er full viewport-bredde når åpen. Idle-stripe forblir kort.
- **F5-10:** Gradual Blur (React Bits API, lokal kopi uten mathjs) topp + bunn på loggen, bare når den overlapper.
- **F5-13:** Håndtak/strek flyttet over chat-input.
- **F5-10:** Idle-tekst er «Trykk på KI-Ronny». Tenking bytter stripe-tekst, ikke egen logg-rad.
- **F5-13:** Sidebar-åpning (telefon-overlay) og navigasjon (`pathname`) lukker Ronny helt til idle. Lukket sidebar åpner ikke igjen.

Beholdt: 18px + `#e0e0e0` på idle-stripe = prompt, Apple-ease, peek = assistent, felt ≥16px, 14px-logg, composer løftet, mer luft boble↔håndtak.

## 2. Hva gikk galt

Alt gikk som planlagt i koden. Isolert forhåndsvisning til skjermbilder (ingen sesjon). Grainient/WebGL maler ikke i headless Chrome.

## 3. Hvilke fikser ble gjort

`workshop-bloub.tsx`, `gradual-blur.tsx`, `layout.tsx` (`data-ronny-side-scroll`). Tester og UI-PAKKER/roadmap/techstack oppdatert.

## 4. Neste fase / neste steg

Draft PR #108. Mikael ser preview. Ikke merge. Ikke ny PR.
