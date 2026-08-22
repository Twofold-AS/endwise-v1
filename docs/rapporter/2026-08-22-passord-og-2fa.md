# Rapport — 22.08.2026 — Passordbytte og 2FA-flate (F1-17, F1-20, F1-23, F1-25)

**Roadmap:** F1-17 · F1-20 · F1-23 · F1-25 → `done`
**Ikke bygget:** F1-24 (TOTP — beslutning utestår)
**Godkjenning:** Mikkis (eksplisitt bestilling)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-17** | Bytt passord i Settings › Profil og mekanikerens «Meg»: gjeldende, nytt, bekreft. Better-Auth `changePassword` med `revokeOtherSessions: true` låst i `byttPassordKall`. Resetlenka står under som utvei. |
| **F1-20** | 2FA-statusrad på forhandlerens profil (`session.user.twoFactorEnabled`), lenke til `/2fa-oppsett`. Samme rad på «Meg». Slå-av er F1-22 og er ikke her. |
| **F1-23** | Kvittering når 2FA er slått på. `etter2faBekreftet()` returnerer `navigerTil: null`. `location.assign` skjer først på «Fortsett». |
| **F1-25** | `/2fa-oppsett` bruker `StatefulButton`, `Field`, `INPUT` og `PassordFelt` — samme kort som `/signin`. |

### Filer

**Regler** i `packages/auth/src/bytt-passord.ts` og `to-faktor-oppsett.ts` (rene funksjoner, samme grep som `password-reset.ts`). **UI** i `_shell/bytt-passord.tsx`, `_shell/to-faktor-rad.tsx`, `ProfilKort`, Settings › Profil, `/2fa-oppsett`. **Tester** i `bytt-passord.test.ts` og `to-faktor-oppsett.test.ts`.

## 2. Hva gikk galt

Alt gikk som planlagt. Context7 MCP var ikke tilgjengelig (Context-serveren krevde innlogging); Better-Auth `changePassword`-kontrakten ble hentet fra offisiell dokumentasjon (currentPassword, newPassword, revokeOtherSessions).

## 3. Hvilke fikser ble gjort

- F1-23: `bekreft` setter bare `steg = 'ferdig'`. Navigasjon er en egen `fortsett()`-handler.
- F1-17: `revokeOtherSessions` er ikke et valg i UI-et — default `false` er et hull.
- Ingen nye UI-pakker. Ingen rørte widget-filer (F4-20) eller admin-flagg (F0-04). `billing/plans.ts` urørt. F1-24 ikke bygget.

## 4. Neste fase / neste steg

- **F1-21** gjenopprettingskoder (hører sammen med kvitteringen).
- **F1-22** krev passord før 2FA slås av.
- **F1-24** TOTP — ikke bygg før beslutningen om e-post vs likestilt valg er tatt.
