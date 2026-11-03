# Øktrapport 03.11.2026 — White label F8a (invitasjon: lenke, så kode)

**Roadmap:** F27-01 (white label-planens F8a)
**PR:** én PR, stacked på F7. Ikke merget. Mons-review.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F27-01 | GET uten sideeffekt. «Send meg kode» (POST + CSRF, 3/time, alltid 200). HMAC-kode 8 tegn / 10 min / 5 forsøk. Godta krever kode i samme tx som consume (FOR UPDATE). Samme feil. Token ut av URL, no-referrer. |

## 2. Hva gikk galt

Alt gikk som planlagt i denne fasen. F7 er PR #195.

## 3. Hvilke fikser ble gjort

Send-kode sender e-post bare når koden faktisk er skrevet. Uten flagg er godta uendret (ingen kode). Valgfri SMS utsatt.

## 4. Neste fase / neste steg

White label-planens **F8b** (admin: ny lenke og tilbakekall). Ikke merget.
