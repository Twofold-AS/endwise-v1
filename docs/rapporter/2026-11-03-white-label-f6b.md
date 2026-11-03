# Øktrapport 03.11.2026 — White label F6b (områder 1)

**Roadmap:** F24-01 (white label-planens F6b)
**PR:** én PR, stacked på F6a. Ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F24-01 | `omradeSjekk` på Bookinger, Kunder, Kjøretøy, Innboks og Timeplan. Uten flagg: eksisterende staff/admin/protected. Mekanikerflaten uendret (hopp på les/egne jobber). Meny deaktiverer uten grant («Spør daglig leder»). `tillatelse.mine`. |

## 2. Hva gikk galt

F5 CI: destinasjon-grep + CodeQL ReDoS på `erEnkelEpost`. Fikset og cherry-pick til F5b/F6a før F6b.

## 3. Hvilke fikser ble gjort

Tester matcher `destinasjon(db, email)`. `erEnkelEpost` er lineær.

## 4. Neste fase / neste steg

White label-planens **F6c** (områder 2). Ikke merget.
