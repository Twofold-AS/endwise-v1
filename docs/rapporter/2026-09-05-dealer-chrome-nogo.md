# Rapport — 05.09.2026 — Dealer-chrome CODE-NO-GO + Galaxy-merke (F5-10 / F5-13)

**Roadmap:** F5-10 (`progress`), F5-13 (`progress`)

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| **F5-13** | `phone-shell.tsx`: logo er kun merke — `<span className="text-title">Endwise</span>` fjernet. Midt-logo `absolute` urørt. |
| **F5-10** | Ronny toppbar + desktop-avatar + sheet/desktop-header bruker `RonnyBot` / `playing` (ikke `still` + `playing={false}` + fast `heureux`). Idle happy/angry/spin. |
| **F5-13** | `DestinasjonSeksjonBar` returnerer `null` for dealer uten innboks-tråd. `/organisasjon` = `ForhandlerKort` + gruppert liste Ansatte → Timeplan → Abonnement → Integrasjoner. Ingen piller. |
| **F5-10** | Galaxy på **både** Oppgrader-CTA og Enterprise-merke (`data-plan-badge`, uten lenke). Ikke Galaxy på Ronny. |

Beholdt: mid-logo, Ronny\|toggle, sheet 80/100 r16, desktop overlay 400, ingen stripe, TilbakePil.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen ny UI-pakke. Enterprise-merke fikk Galaxy etter Mikael-lås i kø (ikke lenger merke-as-is).

## 3. Fikser

- `RonnyBot` + `useRonnySpinn` på telefon- og desktop-inngang.
- Sheet/desktop-header: `playing` i stedet for `playing={false}` (BloubBot default er false).
- `GalaxyKlipp` delt mellom CTA og merke.

## 4. Neste steg

F5-10/F5-13 forblir `progress`. Ikke redesign forhandler-hjem. Innboks-tråd-chrome (Tilbake/slett/inviter) står.
