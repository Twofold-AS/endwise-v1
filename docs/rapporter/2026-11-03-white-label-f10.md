# Øktrapport 03.11.2026 — White label F10 (onboarding i Oppretter)

**Roadmap:** F31-01 (white label-planens F10)
**PR:** én PR, stacked på F9. Ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F31-01 | Fire Oppretter-steg på `/oppstart`. Kunde-RLS (`withCustomer`, RESTRICTIVE). Ikke offentlig før Gå live. Idempotent. |

## 2. Hva gikk galt

Alt gikk som planlagt i denne fasen. F9 er PR #199. F2 ble rebaset mot main etter F1-squash (PR #187 MERGEABLE).

## 3. Hvilke fikser ble gjort

`customerProcedure` fantes fra F7. Shop-ordrer har ikke `customer_id` (blokkert F10-03). Kundetråder får RLS i F11b når koblingen kommer.

## 4. Neste fase / neste steg

White label-planens **F11a** (kundeportal les). Ikke merget.
