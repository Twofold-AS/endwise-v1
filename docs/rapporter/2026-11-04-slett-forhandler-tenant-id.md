# Rapport — F41-06 (slett forhandler etter #215)

## Hva er gjort
- **F41-06:** `slett_forhandler` rev=0027. Prod-feil 42703 på `tenants.slett` fikset. Migrasjon `0062_slett_forhandler_slug`. Test: opprett forhandler med invitasjon, branding og logo, slett, bekreft at subdomenet er ledig.

## Hva gikk galt
- Mikael: «Slett» på platform.endwise.no etter #215. Vercel runtime (prod, `dpl_CrF8vTsoCdbi5EYDoG5UovBBKDFV`, `8rrn8-1793829606521-16a926c04949`, tenant `9811bc98-06e1-437c-a04f-d108660f95ca`):
  `[tenants.slett] { code: '42703', message: 'column "tenant_id" does not exist' }`
- Rot: hardkodet `DELETE FROM slug_reservations WHERE tenant_id = $1`. Tabellen har `slug`, `holder`, `expires_at` — ingen `tenant_id`. Unntaket svelget bare `undefined_table` / FK, ikke `undefined_column`.

## Fikser
- Slett reservasjon på `slug`. Historikk, branding, invite, logo-rad, domene i kjent rekkefølge. `undefined_column` svelges.
- Audit på Endwise med `slug_frigitt`. Subdomene kan gjenbrukes.
- `db:grants` krever rev=0027.

## Neste
- F39-01 admin-redesign (Mikael designer).
- Ikke merge.
