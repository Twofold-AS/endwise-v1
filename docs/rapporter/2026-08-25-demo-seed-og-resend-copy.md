# Rapport — 25.08.2026 — Demo-data, seed-knapper og Resend-copy

## 1. Hva er gjort

**F5-26** — Ny forhandler skal være tom.

- `tenants.create` seeder ikke kunder, tjenester eller lager. Avkrysningen «Demo-tenant» er bare merking (`kind`), ikke data.
- `pnpm db:seed` fyller bare de kjente seed-tenantene Verksted A/B (`SEED_DEMO_SLUGS`). Admin-opprettede demo-tenants får ikke lenger lager + alle tillegg når noen kjører seeden.
- Innboksen viser ikke lenger uklikkbare eksempelsamtaler når den er tom. Tom tilstand er ærlig.

**F5-27** — Seed-knappen lyver ikke.

- Funnet: én «Seed demo-data»-knapp på `/endwise/innstillinger`. Ingen tilsvarende på forhandlere-siden eller `/oppstart`.
- Rotårsak: knappen krevde at *sesjonen* var i en demo-tenant. Endwise-admin sitter i plattform-tenanten, så knappen var alltid disabled.
- `tenants.seedDemo` tar nå valgfri `tenantId`. Flagget må være på, målet må være `kind=demo`. Live nektes.
- UI: velg demo-tenant fra lista. Uten flagg eller uten demo-tenant vises ærlig tekst — ingen død knapp.

**F1-10 / F1-11 / F1-15** — Lokal Resend-copy bort fra brukerflaten.

- Fjernet «Kjører du lokalt uten Resend, står koden/lenken i api-loggen» fra invitasjon, 2FA-oppsett og glemt passord.
- Erstattet med vanlig e-posthjelp (sjekk søppelpost). Teknisk local-fallback i `packages/auth/src/senders/resend.ts` er urørt (serverlogg).

## 2. Hva gikk galt

Alt gikk som planlagt. Context7 MCP ble ikke brukt — ingen nye API-er. Browser-verifikasjon mot kjørende app var ikke tilgjengelig her; låst med kilde- og tRPC-tester.

## 3. Hvilke fikser ble gjort

- Innboks-mock (`_mock.ts` + `brukerMock`) fjernet.
- `seed.ts` looper `SEED_DEMO_SLUGS`, ikke alle demo-medlemskap.
- `seedDemo({ tenantId })` + ærlig innstillinger-UI.
- Resend-workaround-copy fjernet fra tre auth-flater.

## 4. Neste fase / neste steg

- Mikael: slå på dev-mode-flagget, opprett ev. en merket demo-tenant, seed fra Innstillinger.
- Ikke merge uten gjennomgang.
- Ikke rørt: settings-faner, blobatar, live-SSE, priser, sidebar-IA.
