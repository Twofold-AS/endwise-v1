# F1-07 — Endwise-admin live oversikt (23.08.2026)

## Hva er gjort
- **F1-07 (progress):** `/endwise` er ikke lenger en redirect. Landing = oversikt med live KPI fra Postgres via `tenants.census` (`endwiseAdminProcedure` + `withPlatformAdmin` / Better-Auth-tabeller uten RLS).
- **F0-04:** `/endwise/flagg` og oversikten viser read-only `tenant_modules` (`tenants.listModules`). Feature-flags kan fortsatt ikke selge moduler. Ingen skrivesti for entitlements.
- **F5-26:** kontekst-landing peker på `/endwise`. Oversikt ligger først i Endwise-navet. Ingen Admin-tab i forhandler-sidebaren.
- Server-gate urørt: `krevEndwiseAdminSide` + `force-dynamic` (PR #8).

## KPI-er (live)
- Forhandlere (`tenants`, live/demo-split)
- Brukere (`user`)
- Aktive medlemskap (`member`)
- Bookinger: bevisst ikke telt — `withPlatformAdmin` åpner bare `tenants`

## Hva gikk galt
Alt gikk som planlagt. Postgres fantes ikke i dette miljøet, så DB-integrasjonstestene er skrevet men hoppes over uten `DATABASE_URL`/`APP_DATABASE_URL`. Rolle-sperretestene kjører alltid.

## Fikser
- `isItemActive` behandler `/endwise` som eksakt treff, så Forhandlere ikke lyser «Oversikt».

## Neste steg
F1-07 gjenstår: mekanikere på tvers, entitlements-skriving uten Stripe, Quick-onboarding-veiviser.
