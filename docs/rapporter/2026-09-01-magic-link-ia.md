# Øktrapport — 1. september 2026 (magic link + IA + Mons-lås)

PR: https://github.com/Twofold-AS/endwise-v1/pull/105 (utkast, ikke merge)

## 1. Hva er gjort

- **F1-11 / F1-24:** Innlogging er magic link (konto-e-post) + TOTP-app. E-post-OTP er ute som 2FA. Egen etter-hook river sesjonen etter `/magic-link/verify` når 2FA er på.
- **F1-15 / F1-16 / F1-17 / F1-18:** Passord-UI fjernet (signin, invite, reset, profil). `ByttPassordSkjema` og `PassordFelt` slettet. `/glemt-passord` og `/nytt-passord` redirecter til `/signin`. `emailAndPassword.enabled` er `false` først når UI og reset er borte.
- **F1-20 / F1-21 / F1-22 / F1-25:** TOTP-oppsett uten passord. Status «På — autentikator-app». Backup-koder på skjerm, ikke e-post; tekstfilen advarer mot samme innboks som magic link. Selvbetjent disable er FORBIDDEN; leder tilbakestiller.
- **F1-27:** E-postbytte krever `twoFactorEnabled`, ikke passord. Krever ikke fersk TOTP i klikket (kalt ut).
- **Chrome:** Forhandlernavn som ren tittel. Samarbeid ute av telefon-hjem. Sidebar-ikon ved logo (16px begge). Tilbake = history via lokal SVG. Logo = hjem. TipCard → Grainient «Oppgrader til {neste}» / «Enterprise».
- **Piller:** Org-stil wrap på Tjenester/Kunder/Lager/Butikk. Innboks to linjer uten divider. Telefon: åpen melding skjuler lista.

## 2. Hva gikk galt

Alt gikk som planlagt etter testrydding. Innlogget Vercel-preview kan ikke vises uten sesjon — `/dashboard` og `/innboks` redirecter til `/signin`.

Kjente restrisikoer (Mons, kalt ut, ikke lukket):
- customer-kontoer krever ikke 2FA
- levende sesjoner etter mailbox-tyveri til idle/absolutt timeout (revoke-all på magic-link-forespørsel ville vært DoS)
- backup-koder er andre faktor hvis brukeren lagrer dem i samme innboks (advart, ikke e-postet)
- uenrollert bruker har et enroll-vindu (`/2fa-oppsett`) der innboks er faktor 1
- e-postbytte krever at TOTP er på, ikke en fersk kode i klikket
- SPF/DKIM ligger hos Resend, ikke i repo

## 3. Hvilke fikser ble gjort

- `passordResetHull` returnerer `[]` når passord er av.
- E-postbytte krever `twoFactorEnabled`, ikke `checkPassword`.
- **0035 tømmer bare `account.password` — ikke `two_factor` / `two_factor_enabled`.** Første utkast tvang alle gjennom mailbox-only enroll.
- `/two-factor/disable` og `/two-factor/send-otp` er FORBIDDEN.
- `trustDevice` tvinges `false` på verify-totp og verify-backup-code.
- Selvbetjent slå-av-UI fjernet. Leder tilbakestiller.
- Web-tester oppdatert (TipCard, PhoneHScroll, PassordFelt, dealer-tittel, tilbake-pil).
- `ByttPassordSkjema` / `PassordFelt` slettet så ingen passord-UI ligger igjen.
- Samarbeid fjernet fra `PHONE_KORT_META`.
- Klient-import av `OppgraderPille` går via `@endwise/modules/billing/plans` (ikke `./billing` — den dro inn `pg`).

## 4. Neste steg

- Kjør migrasjon `0035` mot preview/prod når PR skal merges (ikke nå). Den nuller bare passord-hash.
- Innlogget telefon-preview av `/dashboard` og `/innboks` når sesjon finnes.
- Ikke merge. Ingen ping til Jonas.

## 5. Mikael-lås (samme dag, senere)

Uenrollert fikk kode-vegg. Deretter tre-valg som var feil.

**Nå:** etter e-post `/signin?steg=valg` med to knapper: Skriv kode manuelt · Bytt konto. Ingen magiclink-knapp. Lenka og koden er samme token. Bare siste ubrukte lenke gjelder (eldre slettes ved ny send). Stale verify: «Lenken er utløpt eller erstattet…». Enroll uten sesjon: åpne nyeste e-post, ikke «trykk på linken først».

**Preview verifisert** på `dpl_2Emut96ufjrRzcor41AQQ4NmfMoP` (`3971588`):
- `/signin` — e-post + Fortsett
- `/signin?steg=valg` — nøyaktig «Skriv kode manuelt» og «Bytt konto»
- Bytt konto → tilbake til e-post
- `?error=INVALID_TOKEN` — «Lenken er utløpt eller erstattet. Åpne den nyeste e-posten fra Endwise.»
- `/2fa-oppsett` uten sesjon — «Åpne den nyeste innloggingslenken i e-posten. Eldre lenker er ugyldige. Deretter binder du appen.»
