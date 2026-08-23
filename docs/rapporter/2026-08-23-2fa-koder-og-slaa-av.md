# Rapport — 23.08.2026 — Gjenopprettingskoder og passord før 2FA av (F1-21, F1-22)

**Roadmap:** F1-21 · F1-22 → `done`
**Ikke bygget:** F1-24 (TOTP — beslutning utestår) · F1-13 · F1-07 · shop
**Godkjenning:** Mikkis (eksplisitt bestilling)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-21** | `/2fa-oppsett` viser Better-Auths `backupCodes` fra `enable` ÉN gang. Steg: passord → kode → koder → ferdig. Fullfør krever nedlasting eller kopiering **og** avkrysning. Ingen «Hopp over». Innlogging tar imot gjenopprettingskode som erstatning for e-post-OTP. |
| **F1-22** | Slå av krever gjeldende passord på serveren. `hooks.before` nekter tomt passord. Feil passord og annen auth-feil får samme generiske svar. Vellykket avslutting skriver `two_factor.disabled` til `audit_log` (én rad per medlemskap). UI i `ToFaktorRad` (Settings › Profil og «Meg») og på `/2fa-oppsett`. |

### Hypotese som ble forkastet

Canary-dokumentasjonen sier at `enable({ method: "otp" })` returnerer `{ method: "otp" }` uten koder. **1.6.23 gjør ikke det.** `enable` lager alltid `backupCodes` og returnerer dem i klartekst. Vi viser det svaret — vi kaller ikke `generateBackupCodes` i oppsettet.

### Filer

**Regler** i `packages/auth/src/to-faktor-oppsett.ts`. **Server** i `bytt-passord-server.ts` + `to-faktor-server.ts`. **UI** i `apps/web/app/2fa-oppsett/page.tsx`, `_shell/to-faktor-rad.tsx`, `signin/signin-skjema.tsx`. **Tester** i `to-faktor-oppsett.test.ts` og `to-faktor-disable.test.ts`.

## 2. Hva gikk galt

Context.dev MCP krevde innlogging (samme som 22.08). Better-Auth-kontrakten ble hentet fra offisiell 1.6.23-kilde (`dist/plugins/two-factor/index.mjs`), ikke fra canary-docs.

Invitasjonsflyten (`/invitasjon`) fullfører fortsatt 2FA uten å vise kodene. De som kommer den veien, ser kodene bare hvis de går gjennom `/2fa-oppsett` før `verifyOtp`. Bevisst utenfor denne PR-en — F1-10-testene skulle ikke røres.

## 3. Hvilke fikser ble gjort

- F1-21: `bekreft` går til `koder`, ikke `ferdig`. `fullforKoder` er sperren. `location.assign` sitter fortsatt bare på Fortsett (F1-23).
- F1-22: passord er serverkrav, ikke et klientflagg. Audit skrives i `hooks.after` mot samme `db` som `createAuth` fikk.
- Ingen nye UI-pakker. Ingen Admin-tab. F1-24 ikke bygget.

## 4. Neste fase / neste steg

- **F1-24** TOTP — ikke bygg før beslutningen om e-post vs likestilt valg er tatt.
- Vurder å vise kodene også i invite-flyten (F1-10) hvis eier vil at den stien skal være like trygg.
