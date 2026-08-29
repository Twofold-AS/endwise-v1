# Rapport — passord-utløp i Europe/Oslo (29.08.2026)

**Roadmap:** F1-16 (visning) · F1-17 (samme resetlenke fra Profil)
**Godkjenning:** Mikael (bug 29.08.2026 ~07:16 CEST)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-16** | Utløpsklokke for resetlenke vises i `Europe/Oslo`, ikke prosess-UTC. E-post (`sendPasswordReset`) + kvittering på `/glemt-passord` og «Send passordendring» i team. |
| **F1-17** | Settings › Profil / «Bytt med e-postlenke» lander på `/glemt-passord` — samme klokke. |

**Display-only.** `resetPasswordTokenExpiresIn` / `PASSORD_RESET_TTL_SEKUNDER` (30 min) er uendret. Lagret `expiresAt` er et ekte UTC-øyeblikk (`Date.now() + 30 min`). Bare `toLocaleTimeString` uten `timeZone` skrev vertens UTC.

### Filer

- `packages/auth/src/tid.ts` — `formaterKlokkeslett` + `PRODUKT_TIDSSONE`
- `packages/auth/src/senders/resend.ts` — e-post og dev-logg
- `apps/web/app/glemt-passord/page.tsx` — kvittering
- `apps/web/app/(app)/innstillinger/team/_detaljer.tsx` — «Send passordendring»
- Tester: `packages/auth/test/tid.test.ts`, e-postinnhold, `apps/web/test/passord-utlop-tz.test.ts`

SMS printer ikke reset-klokke (Twilio Verify eier OTP-teksten).

## 2. Hva gikk galt

Ingenting i implementasjonen. Rotårsaken var bekreftet før fiks: på UTC-vert gir `toLocaleTimeString('nb-NO')` `05:46` for `2026-08-29T05:46:00.000Z`; med `timeZone: 'Europe/Oslo'` blir det `07:46`. Matcher Mikaels 07:16 CEST + 30 min = 07:46, vist som 05:46.

## 3. Hvilke fikser ble gjort

- Ny formatter med eksplisitt `Europe/Oslo` (konto-tz når den kommer).
- E-post og de to kvitteringene bruker den. Ingen TTL-endring.

## 4. Neste steg

- Merge PR mot `main` (ikke merget her).
- Ingen videre fase — F1-16 var allerede `done`.
