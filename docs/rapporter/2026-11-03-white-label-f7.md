# Øktrapport 03.11.2026 — White label F7 (Privat/Bedrift)

**Roadmap:** F26-01 (white label-planens F7)
**PR:** én PR, stacked på F6c. Ikke merget. Mons-review.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F26-01 | Sesjonsfelt kontekst + Bedrift-vindu. Tenant-dest. /logg-inn og /velg. byttKontekst med TOTP og token-rotasjon. Bedrift-API krever CSRF. Kunde-kobling. |

## 2. Hva gikk galt

Alt gikk som planlagt i denne fasen. F6c er PR #194.

## 3. Hvilke fikser ble gjort

`krevBedriftFlate` på staff/admin/område. Uten flagg uendret. Chrome uten Bedrift-krav.

## 4. Neste fase / neste steg

White label-planens **F8a** (invitasjon: lenke, så kode). Ikke merget.
