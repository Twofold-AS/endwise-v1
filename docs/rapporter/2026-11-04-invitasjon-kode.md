# Rapport — F38-07 invitasjonskode (prod-test Mikael)

## Hva er gjort
- **F38-07:** Årsak funnet og fikset. Mottaker åpnet lenken (~18:35–18:39 Oslo) og fikk ingen kode.
  1. `INVITASJON_KODE_PEPPER` finnes ikke i Vercel. `genererInvitasjonskode` kastet.
  2. `invitation_codes` har FORCE RLS, policy bare `TO authenticated`. Eier-INSERT ga 42501.
  3. `POST /send-kode` svelget feilen og svarte 200. GET sender aldri kode (kontrakt).
- Pepper faller tilbake på `BETTER_AUTH_SECRET` (ingen ny env).
- 0059 + grants: eier SELECT/INSERT/UPDATE på `invitation_codes`.
- Feil logges; svaret er fortsatt 200.
- Akseptside: auto-send, egne felt for Kode og Navn, «Fikk ingen kode?» (3/time).
- Invitasjons- og kode-e-post: Mobbin (hvit, ink, understreket lenke / stor kode, forhandler-From).

## Hva gikk galt
- Runtime-logger i Vercel viste ikke «invitasjon»/«send-kode» fordi catch var tom. Ingen rate-limit-treff.

## Fikser
- `packages/modules/src/invitasjon-kode/index.ts` — pepper-fallback.
- `packages/db/drizzle/0059_invitation_codes_owner_rls.sql` + `grants.sql`.
- `packages/auth` — `byggMobbinEpostHtml`, `sendInvitasjonskode`.
- `apps/web/app/invitasjon/[token]/page.tsx`.

## Neste
- F39: admin setter subdomene, `app.endwise.no`, kundeselvbetjening. Egen PR.
- Ikke merge.
