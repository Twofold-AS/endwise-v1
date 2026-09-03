# Rapport — Ronny flytende prompt (transparent composer)

**Dato:** 03.09.2026 · draft PR · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F5-10 / F5-13:** Peek/dock/collapsed-composer (`data-ronny-composer` / `data-ronny-prompt-flate`) er transparent. Ingen eget Grainient, ingen ugjennomsiktig fyll — parchment/hvit canvas synes gjennom. Prompt-kortet (Verksted-familie, `#fff`, 18px, `#e0e0e0`) er uendret.
- **F5-10 / F5-13:** Full-åpen beholder ett stripe-koblet Grainient på `data-ronny-flate`. Prompt nederst på den flaten har ikke et andre Grainient-lag.

Beholdt: etter send = peek (svar øverst, input alene nederst), full via strek, flush full-bredde 0 radius, tenking kun i stripe, sidebar lukker Ronny, expand utenfor prompt, Apple DESIGN (pergament, hårlinje, Action Blue, ink, Inter, 17px). Ingen tool/Mistral/API-endring.

## 2. Hva gikk galt

Alt gikk som planlagt i koden. `workshop-bloub` / chrome-tester: 16/16. Innlogget live-sesjon mot DB mangler i VM; peek/full er verifisert mot kilde + isolert forhåndsvisning (Grainient-WebGL maler ikke i headless Chrome — CSS-stand-in på flaten).

## 3. Hvilke fikser ble gjort

Fjernet WebGL-Grainient fra peek-composer. Én felles transparent `promptFlate` for peek og full. To Grainient-instanser igjen: stripe/peek-panel og full-åpen flate.

## 4. Neste fase / neste steg

Draft PR. Ikke merge.
