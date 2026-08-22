# Rapport — 22.08.2026 — Sikkerhetsfiks bytt-passord (CWE-613 / CWE-307 / CWE-209)

**Roadmap:** F1-17 (herding, status forblir `done`) · F1-20 / F1-23 / F1-25 urørt i UX
**PR:** #3 (`cursor/f1-passord-og-2fa-ca0e`) — ikke merget
**Bestilling:** Sikkerhetssjef Mons, «go with fixes»

---

## 1. Hva er gjort

| CWE | Hva |
|---|---|
| **CWE-613** | `/change-password` behandlet `revokeOtherSessions` som valgfri request-body (Better-Auth default `false`). En angriper som kalte API-et uten flagget, beholdt andre sesjoner. `hooks.before` tvinger nå flagget til `true` før handleren kjører. Klientens `byttPassordKall` er et ekstra lag, ikke sperren. 2FA-påslag var allerede sperret av databasetriggeren `endwise_2fa_session_cutoff` (migrasjon 0010) — klientens `revokeOtherSessions()` er fortsatt bare et ekstra lag. |
| **CWE-307** | Ingen `customRules`-oppføring på `/change-password`. Stien arvet den slakke globalen (60/min). Låst til 5 forsøk per 60 s, samme tak som `/sign-in/email`. Samme grense på `/two-factor/enable` og `/two-factor/disable` (passordsjekk, samme brute-force-trussel). |
| **CWE-209 / CWE-287** | Handleren svarte `INVALID_PASSWORD` når det gjeldende passordet var feil. `hooks.after` mapper den og `CREDENTIAL_ACCOUNT_NOT_FOUND` til `CHANGE_PASSWORD_FAILED` / «Kunne ikke bytte passordet.» UI viser samme generiske tekst for alle API-feil. Klientvalidering (tomt felt, ulikt, for kort) er uendret. Kvittering og `/2fa-oppsett`-restyle er urørt. |

### Filer

- `packages/auth/src/bytt-passord.ts` — grenser som data + `byttPassordHull()`
- `packages/auth/src/bytt-passord-server.ts` — `hooks.before` / `hooks.after` (ikke i web-bundle)
- `packages/auth/src/auth.ts` — hookene og `customRules`
- `apps/web/app/(app)/_shell/bytt-passord.tsx` — sluttet å skille `INVALID_PASSWORD` i UI
- `packages/auth/test/bytt-passord.test.ts` — hull + orakel-lås + kilde-skann

## 2. Hva gikk galt

Alt gikk som planlagt. Context MCP krevde innlogging; Better-Auth 1.6.23 ble lest fra installert `dist/api/routes/update-user.mjs` (handleren) og `dist/api/dispatch.mjs` (hooks). `DATABASE_URL` er ikke satt i dette miljøet, så DB-integrasjonstestene er skrevet men hoppes over (`describe.skip`). Hull-testene kjører alltid.

## 3. Hvilke fikser ble gjort

- Serveren tvinger `revokeOtherSessions` — ikke lenger et klientvalg.
- Rate-limit på bytt-passord og 2FA enable/disable.
- API-et (og UI-et) skiller ikke «feil gammelt passord» fra annen auth-feil.
- Ingen nye UI-pakker. F1-23-kvittering og F1-25-restyle urørt. F1-24 ikke bygget.

## 4. Neste fase / neste steg

- **F1-21** gjenopprettingskoder.
- **F1-22** krev passord før 2FA slås av (endepunktet er nå rate-limitet).
- **F1-24** TOTP — ikke bygg før beslutningen er tatt.
