# Rapport — 04.11.2026 — White label gå live (F38)

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F38-01 | `ENDWISE_WHITE_LABEL` og `ENDWISE_WHITE_LABEL_SPIKE` fjernet. White label er eneste versjon. Gammel dual-path slettet. `erWhiteLabelAktiv()` returnerer alltid true (kompat-stub). |
| F38-02 | Migrasjon `0057_white_label_ga_live` + `vercel-migrate` ved Vercel production-build. GitHub Action `migrate-prod.yml` som reserve. Eksisterende forhandlere slettes (fresh start). `mikael_rk@hotmail.com` seedes som `endwise_admin` på Endwise-tenanten. |
| F38-03 | `signin-skjema.tsx` (og kunde/platform-skjema) bruker `authClient.magicLink.verify` (fetch). Norsk feilmelding, også 429. Try/catch i etter-hooken. |

## 2. Hva gikk galt

Alt gikk som planlagt i koden. Context7 MCP var ikke tilgjengelig; Better-Auth-klienten er den som allerede ligger i stacken (`better-auth` ~1.7). UI er ikke verifisert i nettleser i denne økten (ingen kjørende app).

## 3. Fikser

- iPhone lastet ned `/api/auth/magic-link/verify` fordi skjemaet navigerte dit. Byttet til fetch via `authClient.magicLink.verify`.
- Etter-hooken kan kaste utenom 302 — try/catch rethrower bare omdirigering.

## 4. Neste steg

Hold-rutinen squash-merger når CI er grønn. Mikael setter env/domener (se under).

## 5. Hva Mikael må gjøre

### Domener (mangler i Vercel)

Prosjekt `endwise-v1-web` har i dag bare `endwise.no` (verifisert, A `216.150.1.1`) og `endwise-v1-web.vercel.app`. DNS ligger hos Domeneshop (`ns*.hyp.net`), ikke Vercel DNS.

1. I Vercel → `endwise-v1-web` → Domains: legg til `platform.endwise.no` og `*.endwise.no`.
2. Hos Domeneshop, CNAME (anbefalt):
   - `platform` → `cname.vercel-dns.com` (eller `2cc3d1bfa1c1c5d0.vercel-dns-016.com.`)
   - `*` → samme mål
3. Vent til Vercel merker begge som verified.

Uten disse hostene svarer ikke `https://platform.endwise.no` og forhandler-subdomener.

### Env

Allerede satt i Vercel (production + preview): `DATABASE_URL`, `APP_DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`.

Mangler / rydding:

- Slett `ENDWISE_WHITE_LABEL` i Vercel (production) etter merge. `ENDWISE_WHITE_LABEL_SPIKE` finnes ikke.
- `TENANT_ROOT_DOMAIN` er ikke satt — koden defaulter til `endwise.no`. Valgfritt å sette eksplisitt.
- Valgfritt: GitHub secret `DATABASE_URL` (Scaleway eier, `:5432`) så Action `migrate-prod` kan kjøre som reserve. Production-build på Vercel er primærvei og har allerede `DATABASE_URL`.
- Bekreft at `BETTER_AUTH_URL` er `https://endwise.no` (eller kompatibel). Platform-auth bruker egen `platformOffentligUrl()`.

Ingen ny secret kreves for seed av Mikael — 0057 gjør det i SQL.

### Etter merge (rekkefølge)

1. Domener + DNS som over (kan gjøres før merge).
2. Squash-merge når CI er grønn.
3. Første production-deploy kjører 0057 **én gang**: sletter alle ikke-platform-tenants og seeder Mikael som `endwise_admin`. Senere deploy er no-op via drizzle-journal.
4. Slett `ENDWISE_WHITE_LABEL` i Vercel.

## 6. Innlogging og invitere forhandler

1. Åpne **https://platform.endwise.no/logg-inn** (ikke endwise.no).
2. Skriv `mikael_rk@hotmail.com` → Fortsett.
3. Skriv den 5-sifrede koden fra e-posten. Ikke trykk på lenka i e-posten på iPhone — skriv koden i skjemaet (fetch, ikke filnedlasting).
4. Første gang: registrer passkey («Bruk nøkkel»). Senere: bekreft med nøkkelen.
5. Du lander på `/endwise`. Gå til **Forhandlere** (`/endwise/forhandlere`).
6. Fyll **Ny forhandler**: Navn, Slug, E-post til eier, pakke (Start/Pro/…) og ev. tillegg. Ikke kryss Demo-tenant for ekte kunde.
7. **Opprett og inviter**. Eieren får e-post og logger inn med magic link + TOTP på `<slug>.endwise.no`, deretter onboarding.

Hvis sendingen feiler: **Send invitasjon på nytt** på raden. Listen viser «Ingen forhandlere ennå» etter 0057 til den første er opprettet.
