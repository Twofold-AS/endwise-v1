# Øktrapport — 1. september 2026 (Mons residual + Resend-lås)

PR: https://github.com/Twofold-AS/endwise-v1/pull/105 (utkast, ikke merge)

## 1. Hva er gjort

- **F1-11 / CWE-770:** Magic-link fyrer Resend bare mot eksisterende Endwise-bruker. Ukjent adresse: stille nei, samme 200. Innboks-`to` = `threads.external_ref` fra DB, og den må tilhøre en kjent kunde hos forhandleren. Klient-`externalRef` avvises.
- **F1-11 / CWE-20:** Produkt-From er hardkodet `Endwise <noreply@endwise.no>`. `sendEmail` kaller `avsenderErKanonisk` + `avsenderErVerifisert`. `RESEND_FROM` ignoreres i prod. Klient-`from` kastes.
- **F1-11 / CWE-308:** Leder-reset av 2FA krever fersk TOTP fra lederen. Ingen e-post-OTP. `sendTwoFactorOtp` og `sendPasswordReset` kaster. `/two-factor/send-otp` og `/two-factor/disable` forblir FORBIDDEN.
- **F1-11 / CWE-287:** `/change-email` og `team.endreEpost` krever fersk TOTP i samme request. `twoFactorEnabled` alene er ikke nok.
- **F1-11 / CWE-308 enroll:** Uenrollert magic-link-verify gir ingen app-sesjon. Kortlivet `enroll_2fa`-kake, bare `/2fa-oppsett`. Etter TOTP-bind + verify: ekte sesjon. Andre sesjoner revokes.
- **F1-11 / roller:** `customer` i `ROLES_REQUIRING_2FA`. Widget uten app-innlogging får ingen konto.
- **F1-11 / CWE-262:** `team.sendPassordendring` og `settPassordUtenSesjon` er stengt. `emailAndPassword.enabled` forblir false.
- To-knappers signin uendret: Skriv kode manuelt + Bytt konto.

## 2. Hva gikk galt

`@better-auth/utils/otp` er ikke en direkte avhengighet — importen i enroll/step-up sprakk i tester. Byttet til lokal RFC 6238 (`totp-verify.ts`, HMAC-SHA1, periode 30, vindu ±1) som matcher Better-Auth. Rolle-testen forventet bare `dealer_staff`; customer er nå i `ROLES_REQUIRING_2FA`.

Innlogget Vercel-preview av `/2fa-oppsett` krever enroll-kake; `/signin` kan vises uten sesjon. SPF/DKIM ligger hos Resend, ikke i repo.

## 3. Hvilke fikser ble gjort

- `erProduktDestinasjon` rundt magic-link-send.
- `avsenderErKanonisk` i `sendEmail` og toolkit-Resend.
- `verifiserFerskTotpForBruker` for tRPC (e-postbytte, leder-reset).
- Innboks: `erKjentKundeKontakt` før createThread og før Resend.
- Backup-koder: advarsel mot samme innboks som magic-lenken.
- Tester for From-lås, send-otp 403, disable 403, enroll uten sesjon, e-postbytte uten TOTP, stale-lenke, innboks foreign to/replyTo.

## 4. Neste steg

Preview verifisert på `dpl_FcJggwoxaCqNKH3zCxLkN5EHyDFU` (`2ee72b4`): `/signin?steg=valg` har Skriv kode manuelt + Bytt konto; `/2fa-oppsett` uten sesjon viser Start oppsett. Ikke merge.
