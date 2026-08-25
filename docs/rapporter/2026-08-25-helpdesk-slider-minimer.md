# Rapport — 25.08.2026 — Helpdesk-slider: minimer (ikke visningsvelger)

**Roadmap:** F5-23 (slider) · F5-13 (visningsvelger tilbakestilt)
**Godkjenning:** Mikael (minimer på feil kontroll)

## 1. Hva er gjort

- **F5-13:** Tok bort X → pille på visningsvelgeren (`context-switcher.tsx`). Ingen
  `endwise.visningsvelger.minimer`, ingen kompakt pille. Dropdown er igjen logo + navn + chevron
  med inspect/plattform/forhandler som før.
- **F5-23:** Minimer sitter på `TipCard` (slideren nederst). X lukker til kompakt bar (tittel + Ny
  hvis ulest). localStorage `endwise.helpdesk-slider.minimer`. Ulest ved lasting tvinger fullt
  åpen; bruker kan likevel lukke; ny ulest id eller ulest none→some åpner igjen. Utvidet høyde
  208px, karusell pauset når minimert.
- `helpdesk.list` og `helpdesk.ulesteAntall` har ikke lenger 5 min `staleTime`;
  `refetchOnWindowFocus: true`. PR #36 LiveSync har ingen helpdesk-SSE (kun inbox/entitlements) —
  ingen ny event-buss.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen helpdesk-event i LiveSync å koble på; window-focus + query-oppdatering
er oppfriskningen.

## 3. Hvilke fikser ble gjort

- Rene regler i `helpdesk-slider.ts` (Ny→åpen, persist) med test.
- Visningsvelger-testen snudd: ingen X/pille.

## 4. Neste steg

- Mikael merger når CI er grønn. Ikke merget av agenten. PR #28 / Quick urørt.
