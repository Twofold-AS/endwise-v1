# Rapport — F40 (forhandler-isolasjon og admin-subdomene)

## Hva er gjort
- **F40-01:** Kundevert isolert. Proxy leser Host (ingen DB). Ukjent/reservert → nøytral 404 (`/_kunde/_ukjent`). OTP bare for kunder hos vertens forhandler (samme 200). Sesjon bundet til dealer-id + host: mismatch = logout. `customerProcedure` 403 ved host ≠ sesjon. Cookie `__Host-`, ingen `Domain=.endwise.no`. 0061: `lookup_tenant_by_host` hopper over `www`, `app`, `platform`, `api`.
- **F40-02:** «Ny forhandler» på platform.endwise.no: navn, subdomene, e-post til forhandler-admin. Validering (små bokstaver/tall/bindestrek, unikt, ikke www/app/platform/api). Forhåndsvisning `<sub>.endwise.no`. Etter opprett virker subdomenet via wildcard + invitasjon. Admin kan endre subdomene på forhandlerkortet. Ingen redesign (F39-01).
- **Vercel:** `*.endwise.no` er allerede verifisert på prosjektet. Ingen manuell DNS-endring i denne PR-en.

## Hva gikk galt
- Context slapp gjennom `userId` ved host ≠ sesjon, og falt tilbake på `sesjonOrg` når host-tenant var ukjent. Tettet.

## Fikser
- `vertSesjonTillatt` / `kundeTenantFraHost`.
- Subdomene-felt + `sjekkSlug` + preview. `sjekkSlug` tar `excludeTenantId` ved redigering.
- 0061 lookup-rev.

## Neste
- F39-01 admin-redesign (Mikael designer).
- Ikke merge.
