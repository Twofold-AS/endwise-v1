# Rapport — Mons-residual etter #17

23.08.2026 · F14-16 / F1-10 / F5-26

## 1. Hva er gjort

### erasure_requests-hash (F14-16)
- Ingen server-pepper i repoet. Flyttet `subject_id` / `requested_by` hashes nå med `sha256(verdi || slettet tenant_id)` (PG `encode(sha256(convert_to(...)))`), ikke md5.
- Rå ID-er lagres ikke etter flytt. `id` roteres fortsatt. Raden slettes aldri (art. 5(2)) — dokumentert i SQL-kommentar.
- `grants.sql` urørt.

### invite-OTP `revokeOtherSessions` (F1-10)
- `land()` svelget feil i `.catch(() => undefined)` («likevel videre»).
- `krevRevokeAndreSesjoner` logger bare feilklasse (ingen token) og kaster en trygg UI-feil. `bekreftKode` viser den på invitasjonssiden — fail closed.
- `destinasjonEtterInvite` uendret: `TWO_FACTOR_REQUIRED` → `/2fa-oppsett`, eier → `/oppstart`, staff → `session.me.landing`.

Priser 4490/8490/12490 urørt. shop fortsatt blokkert. SMS-tillegg på alle nivåer urørt. Ingen Admin-fane.

## 2. Hva gikk galt
Alt gikk som planlagt. Ingen blokkering. Context7 MCP var utilgjengelig (trenger auth). Better-Auth-klienten returnerer `{ error }` uten å kaste; helperen dekker begge stier.

`/2fa-oppsett` advarer fortsatt og fortsetter ved revoke-feil — utenfor denne residualen (kun invite-OTP).

## 3. Hvilke fikser ble gjort
- `packages/db/sql/functions.sql` — sha256 + tenant_id, aldri-slett-kommentar
- `apps/web/app/invitasjon/_landing.ts` — `krevRevokeAndreSesjoner`
- `apps/web/app/invitasjon/[token]/page.tsx` — `land()` kaller helperen før navigasjon
- Tester: `slett-forhandler-sql.test.ts`, `uiux-p0.test.ts`, integrasjon i `forhandler-slett.test.ts` (skip uten DATABASE_URL)

## 4. Neste steg
- Mikael kjører **`pnpm db:setup`** på Scaleway etter merge (`functions.sql` endret; `grants.sql` urørt). Ingen ny Drizzle-migrasjon.
- Ikke merge før review.
