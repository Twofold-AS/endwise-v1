# Rapport — 27.08.2026 — Utløpt OTP og gjenopprettingskoder (F1-21)

**Roadmap:** F1-21 → `done` (live-fiks)
**Ikke rørt:** priser, SMS, shop, sidebar, Quick, slå av 2FA, 2FA-av bekreft-kode-flyt
**Godkjenning:** Mikael (live-bug) + Mons-lås (CWE-640)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-21** | Utløpt/ugyldig OTP gir norsk feil og «Send ny kode». `onVerify` fanger kast og tomt svar — knappen går til `error`, aldri hengende «Sjekker koden…». Gjenopprettingsvalg på innlogging vises bare når `two_factor.backup_codes` har ubrukte koder. Enable uten koder avbrytes. Invite viser kodene én gang etter OTP. Better-Auth lagrer kodene kryptert (`storeBackupCodes: encrypted`); hver kode er engangs. |

### Rotårsak (målt i koden, ikke antatt)

1. **Heng.** `/signin` `onVerify` hadde ingen `try/catch`. Kast fra Better-Auth (typisk `OTP_HAS_EXPIRED` etter ~3 min, opplevd som «ca. fem») lot `busy` stå på `loading`. Tomt `{ data: null }` uten `error` gikk videre til `finishSignIn()` og ble værende på «Sjekker koden…».
2. **Død gjenoppretting.** Valget «Bruk gjenopprettingskode» sto alltid fremme. Invite-enable fanget aldri `backupCodes` (bevisst utenfor PR 23.08). Oppsett fortsatte selv om `plukkBackupKoder` ga tom liste.

## 2. Hva gikk galt

Context.dev MCP krevde innlogging. Better-Auth 1.6.30-kilden ble hentet fra `v1.6.30` (`enable` lager alltid `backupCodes`, default `storeBackupCodes: encrypted`). `hashed` finnes ikke i 1.6.30 — vi fant ikke på egen kolonne.

Integrasjonstester mot Postgres hopper over uten `DATABASE_URL` i dette miljøet. Enhets- og kildescan-tester kjører.

## 3. Hvilke fikser ble gjort

- `tolkToFaktorVerifySvar` — én utfallstype: ok eller error + norsk tekst. Aldri pending.
- `visGjenopprettingsvalg` / `harUbrukteGjenopprettingskoder` — skjul uten ubrukte.
- Etter-hook på `/sign-in/email` setter `harUbrukteGjenopprettingskoder` på `twoFactorRedirect`.
- `/2fa-oppsett` og invite avbryter enable uten koder; invite har koder-steg.
- `backupCodeOptions.storeBackupCodes: 'encrypted'`.

## 4. Neste fase / neste steg

- **F1-24** TOTP — ikke bygg før beslutningen om e-post vs likestilt valg er tatt.
- Eksisterende kontoer som fikk 2FA på uten å se koder, har fortsatt ingen klartekst. Valget er skjult til de slår 2FA av/på og får et nytt sett.
