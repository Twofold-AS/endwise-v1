# Rapport — Ronny Verksted-bredde, lavere prompt, tettere håndtak

**Dato:** 02.09.2026 · samme gren/PR #108 · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F5-10 / F5-13:** Åpen Ronny-grainient (stripe/panel og composer) bruker `VERKSTED_INNHOLD` — samme kolonne som det største Verksted-kortet (`max-w-[520px] px-3` / desktop `max-w-[1120px] px-8`). Ikke full-bleed. Gjelder idle-åpen og utvidet, topp og bunn.
- **F5-10:** Prompt-kortet er lavere: kort-padding `py-1.5` / `px-2`, composer `pt-1.5 pb-1.5`, textarea `min-h-6 py-1 max-h-8`, submit `size-7`. Felt forblir `text-[16px]` på telefon.
- **F5-13:** Gap mellom boble og håndtak strammet (`pb-0` på svar-kort, `pt-0 pb-1` på håndtak-rad, knapp `py-0.5`).

Beholdt: 18px alle hjørner, ingen hvit canvas, ingen hårlinje under «Spør Ronny», Apple-ease, «Ronny tenker…» + avatar, full-åpen uten andre Grainient, sticky composer, peek = assistent, strek-håndtak, 14px-logg, felt ≥16px.

## 2. Hva gikk galt

Alt gikk som planlagt i koden. Skjermbilder tas mot isolert forhåndsvisning (ingen sesjon i VM).

## 3. Hvilke fikser ble gjort

`VERKSTED_INNHOLD` i `phone-home.ts`, brukt av Ronny, telefon-Verksted og desktop-Verksted-hero. Tester oppdatert.

## 4. Neste fase / neste steg

Draft PR #108. Mikael ser preview. Ikke merge. Ikke ny PR.
