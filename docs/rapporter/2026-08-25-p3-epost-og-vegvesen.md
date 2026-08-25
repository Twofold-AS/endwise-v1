# Rapport — P3 batch C: e-postbytte + Vegvesen-nøkkel

Dato: 25. august 2026. Slack #endwise-v1. Stripe urørt.

## 1. Hva er gjort

### F1-27 — Bytt e-post i to steg
- Hypotesen stemte: Settings › Profil viste e-post som skrivebeskyttet («E-post endres ikke herfra»). Ingen `changeEmail`.
- Better-Auth `user.changeEmail.enabled` + `sendChangeEmailConfirmation` (gammel innboks) + `sendVerificationEmail` (ny innboks).
- `updateEmailWithoutVerification` er ikke satt. `updateUser({ email })` avvises.
- Passord kreves på serveren (F1-22-mønster). Rate-limit 5/60s på `/change-email`.
- UI: `ByttEpostSkjema` i `/innstillinger/profil`, bekreftelse på `/bekreft-epost`.
- Tester: `packages/auth/test/bytt-epost.test.ts`, `apps/web/test/bytt-epost-ui.test.ts`.

### F2-08 — Vegvesen-API-nøkkel i innstillinger
- Hypotesen stemte: nøkkelen kom bare fra `VEGVESEN_API_KEY`. `/integrasjoner/vegvesen` var placeholder.
- Per-tenant nøkkel i `integration_config` (envelope-kryptert, samme mønster som Quick).
- `vegvesen.config` returnerer bare `hasKey`. Lookup leser tenant-nøkkel først, env som reserve.
- Ingen logg av hemmeligheten. Ingen nøkkel i klientbundle.
- Tester: `packages/modules/test/vegvesen-config.test.ts`, `apps/api/test/vegvesen-nokkel.test.ts`.

Låser holdt: norsk UI, aksent `#111`, Settings = lenke til `/innstillinger/profil`, plattform ser ikke dealer-fakturering, Stripe/CONNECT/invite/#28/#46/avatar/booking/customer-create urørt.

## 2. Hva gikk galt
Context7 MCP var ikke tilgjengelig; Better-Auth 1.6.23 ble lest fra installert pakke. Første utkast av passord-hooken hoppet over `checkPassword` når sesjonen ikke var lastet i `hooks.before` (session-middleware kjører etter). Det er rettet.

## 3. Hvilke fikser ble gjort
- `getSessionFromCtx` + `checkPassword` i `hooks.before` på `/change-email`. Feil passord mappes til generisk kode (samme som F1-17/F1-22).
- Bekreftelsessiden kaller `verifyEmail` uten `callbackURL`, så Better-Auth ikke redirecter vekk fra forklaringen.

## 4. Neste fase / neste steg
- F1-24 (autentikator-app) står fortsatt planned.
- Kunde-e-postbytte (Slack: «både ansatte og kunder») er ikke med — customer-create eies av annen agent.
