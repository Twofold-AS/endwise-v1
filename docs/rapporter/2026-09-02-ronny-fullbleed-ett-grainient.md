# Rapport — Ronny full-bleed prompt-bar, ett Grainient i full

**Dato:** 02.09.2026 · samme gren/PR #108 · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F5-10 / F5-13:** Prompt-bakgrunnen nederst er full viewport-bredde, `rounded-none` mot skjermkantene. Hvitt prompt-kort kan fortsatt ha 18px.
- **F5-10:** Full-åpen har ett Grainient (flaten). Prompt i full har ikke eget WebGL/Grainient. Peek-baren beholder sitt Grainient.

Beholdt: stripe uten dropdown, strek under peek-boble / over full-prompt, flush bunn, peek uten overlay, idle-kopi, tenking i stripe, sidebar → idle, Apple-ease, peek = assistent.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen blokkering.

## 3. Hvilke fikser ble gjort

Peek-composer uten `VERKSTED_INNHOLD` / `KORT_KANT`. Full-composer uten andre `<Grainient>`. Tre Grainient-instanser i kilden: stripe-peek, full-flate, peek-bar.

## 4. Neste fase / neste steg

Draft PR #108. Ikke merge. Ikke ny PR.
