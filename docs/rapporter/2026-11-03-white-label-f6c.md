# Øktrapport 03.11.2026 — White label F6c (områder 2)

**Roadmap:** F25-01 (white label-planens F6c)
**PR:** én PR, stacked på F6b. Ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F25-01 | `omradeSjekk` på Tjenester, Lager, Nettbutikk, Ansatte, Innstillinger og Økonomi. Entitlement beholdt (shop/widget/quick). `LAGER_NIVA`. Invitere/fjerne er leder. Chrome uten områdesjekk. |

## 2. Hva gikk galt

F5b/F6a fikk ett rødt CI-varsel på gamle commits (`d9bd099`, `6119a13`). Siste F5/F5b/F6a er grønne.

## 3. Hvilke fikser ble gjort

`omradeSjekk(..., utenFlagg: 'admin')` så staff med grant kan skrive der admin var gaten, uten å åpne det uten flagg.

## 4. Neste fase / neste steg

White label-planens **F7** (Privat/Bedrift). Ikke merget.
