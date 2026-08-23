# Rapport — Mons-oppfølging etter #14 og #15

23.08.2026 · F5-26 / F1-10 / F1-11 / F14-16

## 1. Hva er gjort

### Fra #14 (GDPR-slett / FORCE RLS)
- **TO PUBLIC slett-policyer** i `packages/db/sql/grants.sql` krever nå tre porter: `app.platform_admin = on`, `NOT pg_has_role(authenticated)` og `app.slett_tenant_id`. App-rollen kan fortsatt kalle `set_config`; authenticated stenger policyen.
- **`WITH CHECK (true)` fjernet** på `audit_log_slett_update` og `erasure_requests_slett_forhandler`. NEW.tenant_id må være slett-GUC-målet eller Endwise-tenanten (`slug = 'endwise'`).
- **erasure_requests-ID (CWE-359/863/284):** Ved flytt til Endwise roteres `id` (`gen_random_uuid`), `subject_id` og `requested_by` hashes med `md5`, og `report.requestId` strippes. Raden slettes aldri. Samme UUID i Endwise-kontekst ville gitt Endwise-admin en annen forhandlers request-identifikator utover det GDPR-slett krever. Hashen holder art. 5(2)-beviset uten rå ID-er.

`slett_forhandler` hard-sletter fortsatt aldri `audit_log`, sletter aldri `user`, nekter slug `endwise`, og krever `platform_admin`.

### Fra #15 (invite + 2FA)
- Etter passord + OTP som lager sesjon: `revokeOtherSessions` i `land()`. Ingen token i logg.
- `destinasjonEtterInvite` / `destinasjonNarSesjonFeiler`: `TWO_FACTOR_REQUIRED` → `/2fa-oppsett`, aldri dashboard eller `/oppstart`.
- Eksisterende konto (`kreverPassord:false` → `/signin`) og `/` bruker samme helper.

Priser 4490/8490/12490 urørt. shop fortsatt blokkert. SMS vis/skjul urørt.

## 2. Hva gikk galt
Alt gikk som planlagt. Ingen blokkering. Context7 MCP var utilgjengelig (trenger auth); Better-Auth `revokeOtherSessions` er samme kall som `/2fa-oppsett`.

## 3. Hvilke fikser ble gjort
Se §1. Kommentar i `withPlatformAdmin()` oppdatert så den ikke lenger sier at slett-policyene ignorerer `platform_admin`. Tester: `slett-forhandler-sql.test.ts` (SQL-kontrakt), `uiux-p0.test.ts` (landing/revoke), integrasjon i `forhandler-slett.test.ts` (skip uten DATABASE_URL).

## 4. Neste steg
- Mikael kjører **`pnpm db:setup`** på Scaleway etter merge (grants + functions, ingen ny Drizzle-migrasjon).
- Ikke merge før review. SMS-visning er egen PR.
