# Øktrapport — 1. september 2026 (magic link + IA)

PR: https://github.com/Twofold-AS/endwise-v1/pull/105 (utkast, ikke merge)

## 1. Hva er gjort

- **F1-11 / F1-24:** Innlogging er magic link (konto-e-post) + TOTP-app. E-post-OTP er ute som 2FA. Egen etter-hook river sesjonen etter `/magic-link/verify` når 2FA er på.
- **F1-15 / F1-16 / F1-17 / F1-18:** Passord-UI fjernet (signin, invite, reset, profil). `ByttPassordSkjema` og `PassordFelt` slettet. `/glemt-passord` og `/nytt-passord` redirecter til `/signin`.
- **F1-20 / F1-21 / F1-22 / F1-25:** TOTP-oppsett uten passord. Status «På — autentikator-app». Backup-koder på skjerm, ikke e-post. Disable uten passord (sesjon).
- **Chrome:** Forhandlernavn som ren tittel. Samarbeid ute av telefon-hjem. Sidebar-ikon ved logo (16px begge). Tilbake = history via lokal SVG. Logo = hjem. TipCard → Grainient «Oppgrader til {neste}» / «Enterprise».
- **Piller:** Org-stil wrap på Tjenester/Kunder/Lager/Butikk. Innboks to linjer uten divider. Telefon: åpen melding skjuler lista.

## 2. Hva gikk galt

Alt gikk som planlagt etter testrydding. Innlogget Vercel-preview kan ikke vises uten sesjon — `/dashboard` og `/innboks` redirecter til `/signin`.

Kjente restrisikoer (Mons, kalt ut i PR, ikke lukket): customer uten 2FA, disable uten ny TOTP, levende sesjoner etter mailbox-tyveri, backup-koder hvis de lagres i innboks, enroll-vindu etter 0035, SPF/DKIM ikke i repo.

## 3. Hvilke fikser ble gjort

- `passordResetHull` returnerer `[]` når passord er av.
- E-postbytte krever `twoFactorEnabled`, ikke `checkPassword`.
- Web-tester oppdatert (TipCard, PhoneHScroll, PassordFelt, dealer-tittel, tilbake-pil).
- `ByttPassordSkjema` / `PassordFelt` slettet så ingen passord-UI ligger igjen.
- Samarbeid fjernet fra `PHONE_KORT_META`.

## 4. Neste steg

- Kjør migrasjon `0035` mot preview/prod når PR skal merges (ikke nå).
- Innlogget telefon-preview av `/dashboard` og `/innboks` når sesjon finnes.
- Ikke merge. Ingen ping til Jonas.
