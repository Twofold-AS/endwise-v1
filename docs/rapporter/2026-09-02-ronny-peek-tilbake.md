# Rapport — Ronny peek uten overlay

**Dato:** 02.09.2026 · samme gren/PR #108 · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F5-13:** Revertert feilen der peek dekket siden med grainient/pergament. Etter send er default peek: assistent-svar under stripen, composer-kort alene nederst, Verksted synlig. Ingen scroll-lås i peek.
- **F5-10:** Full-dekning (grainient under chrome + scroll-lås) bare når brukeren trykker streken over input. Samme ikon lukker tilbake til peek.
- **F5-10:** Peek-composer har eget Grainient i kortet (Verksted-kolonne), ikke fullskjerm-bakgrunn.

Beholdt: «Trykk på KI-Ronny», tenking i stripe, sidebar lukker til idle, 18px + `#e0e0e0`, Apple-ease, peek = assistent, felt ≥16px, composer løftet, Gradual Blur på overlapping logg.

## 2. Hva gikk galt

Forrige runde la overlay på peek — det var feil mot IA. Revertert.

## 3. Hvilke fikser ble gjort

Scroll-lås og `data-ronny-flate` kun ved `utvidet`. Peek er in-flow kort + hevet composer-kort.

## 4. Neste fase / neste steg

Draft PR #108. Ikke merge. Ikke ny PR.
