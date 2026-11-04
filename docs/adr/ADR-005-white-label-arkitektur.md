# ADR-005 — White label: vert, innlogging, tillatelser og Mons-krav

**Roadmap:** F16 (white label-plan F0 — ADR og spike)
**Status:** **Godkjent** av Mikael 3. november 2026. Mons' sikkerhetskrav (§3.11) formelt godkjent samme dag.
**Dato:** 3. november 2026
**Kilder:** white label-planen 2026-11-03 · Mikaels beslutninger 2026-11-03 · ADR-002 · Better-Auth 1.7.x i repoet · Vercel «Resolve tenants by subdomain with Next.js proxy.ts» · eksisterende `apps/web/proxy.ts`, `packages/auth`, `packages/db`

Dette er arkitekturbeslutningen for Endwise som selvstendig white label-plattform. F0 leverer ADR-en og isolerte, flagg-vaktede spiker. Ingen atferdsendring for dagens brukere på `endwise.no` / `www.endwise.no` før senere faser merges.

---

## Kontekst

I dag er Endwise én flate på én vert: samme innlogging, samme cookie-prefiks og samme `(app)`-skall for forhandler, mekaniker og Endwise-admin. Tenant velges fra sesjonen, ikke fra `Host`. Branding er hardkodet «Endwise». Invitasjoner bruker SHA-256 av et langt token, uten e-postkode-trinn. Tillatelser er faste roller i kode (`rbac.ts`), ikke per område i databasen.

Målet er at hver forhandler eier adressen `<sted>.endwise.no` (platform-admin setter subdomenet ved opprettelse), at kundesiden bor der, at ansatte logger inn på `app.endwise.no`, og at Endwise-admin bor skjult på `platform.endwise.no`.

---

## Beslutning

### 1. Adresser og soner

| Flate | Adresse | Hvem |
|---|---|---|
| Marked | `endwise.no`, `www.endwise.no` | Offentlig. Uendret. |
| Forhandler (kunde) | `<slug>.endwise.no` | Bare kunder. Ingen Privat/Bedrift-valg. |
| Bedrift | `app.endwise.no` | Forhandler og ansatte. E-post + kode + 2FA. Ruter til riktig forhandler. |
| Admin | `platform.endwise.no` | Kun Endwise-team. Ingen lenke fra marked eller forhandlersider. `robots: noindex`. |

`app` er reservert slug og egen host-sone (Mikael 04.11.2026). Eget CNAME-domene kommer senere via `tenant_domains` (samme oppslag på full vert).

Proxyen (`apps/web/proxy.ts`, Next 16) leser `Host` og klassifiserer sonen: `marked | platform | app | forhandler | reservert | ukjent`. Den gjør **ikke** databaseoppslag. Tenant-oppslag med offentlige felt skjer i layout via `lookup_tenant_by_host` (F2). Ukjent slug gir nøytral 404 uten å røpe hvilke som finnes.

F0-spiken setter bare informasjonsheadere bak `ENDWISE_WHITE_LABEL_SPIKE=1`. Standard matcher og no-store på `/signin`, `/2fa-oppsett` og `/api/auth/*` er uendret. Innkommende `x-endwise-sone` / `x-endwise-slug` strippes og settes bare av proxyen (klienten skal ikke kunne forfalske tenant).

Dev: `<slug>.localhost:3000`. Preview (`VERCEL_ENV !== 'production'`): `x-tenant-slug` eller `?tenant=` som overstyring. Produksjon ignorerer overstyringen.

**DNS (besluttet 2026-11-03):** Sonen `endwise.no` **blir der den er i dag**. Den flyttes ikke til Vercel. Wildcard `*.endwise.no` peker mot Vercel med CNAME. Sertifikat via `_acme-challenge`-delegering / CNAME til Vercel.

### 2. Subdomene (`<sted>.endwise.no`)

Subdomenet settes av platform-admin ved opprettelse, for eksempel `bergen.endwise.no`. Forhandleren ser kundelenken som kopierbar info i onboardingen — ingen redigering.

**Regler (låses i F1 som delt zod-skjema):**

- 3–32 tegn, `a–z`, `0–9` og bindestrek. Ikke bindestrek først eller sist. Ikke to bindestreker på rad (`--` og `xn--` er forbudt). Kun ASCII, små bokstaver.
- Forslag fra firmanavn eller sted med `æ→ae`, `ø→o`, `å→aa`. Bare admin kan sette.
- **Globalt unikt**, uavhengig av store/små bokstaver. Unik indeks på `lower(slug)` mot både `tenants.slug` og `organization.slug`.
- Kollisjon (to i Bergen): først til mølla. Nummer to får «`bergen` er tatt» og forslag som `bergen-sentrum`, `bergen-<firmanavn>`, `bergen-2`. Ingen opplysning om hvem som har navnet. Endwise flytter aldri et navn i det stille.

**Reserverte ord** (utkast — kodefallback i F0 + tabellen `reserverte_slugs`). Endelig liste er **ikke besluttet**; listen under står som draft til Mikael låser den:

`platform`, `admin`, `www`, `app`, `api`, `mail`, `smtp`, `imap`, `ftp`, `status`, `docs`, `help`, `hjelp`, `support`, `kunde`, `login`, `logg-inn`, `auth`, `static`, `assets`, `cdn`, `dev`, `test`, `staging`, `preview`, `demo`, `widget`, `cron`, `stream`, `framer`, `noreply`, `no-reply`, `post`, `webmail`.

Alt som er `endwise` eller starter med `endwise-` er reservert. Merkenavn som lett kan forveksles (Vipps, BankID, Posten, Nav, Skatteetaten) går til manuell godkjenning.

### 3. Innlogging: kunde og bedrift er adskilt

- **Kunde** på `<slug>.endwise.no/logg-inn`: e-post eller telefon. OTP bare hvis personen finnes som kunde (Endwise-db eller importert fra Quick). Samme svar uansett. Rate limit. GDPR-varsel ved første innlogging. Ingen massee-post. Ingen Privat/Bedrift.
- **Ansatt** på `app.endwise.no`: e-post + kode + 2FA. Destinasjon er dealer_admin/dealer_staff. Etter innlogging lander de i forhandler-appen på samme vert (`__Host-`-kake, ingen Domain).
- **Endwise** på `platform.endwise.no`.

Kunden er en Better-Auth-bruker koblet til `customers.userId` (én kundepost per forhandler). Samme person hos to forhandlere er to kunder med samme `user`.

### 4. Roller og tillatelser — ingen rollemaler

Rollemaler er droppet.

| Rolle | Hvordan | Hva |
|---|---|---|
| Hovedkonto, daglig leder | Oppretter forhandlerkontoen via invitasjonslenken. Nøyaktig én per forhandler | Alt hos forhandleren. **Eneste** hos forhandleren som kan dele ut og endre tillatelser, invitere og fjerne ansatte, overføre rollen |
| Ansatt | Invitert av daglig leder. Bare merket Ansatt | Bare tillatelsene som er gitt, per område Se eller Endre |
| Kunde | Logger inn med kode | Egne data på kundesiden |
| Endwise (platform) | Ansatt hos Endwise med passkey | Kan dele ut og endre tillatelser og gjøre alt for å hjelpe. Alt i uforanderlig audit, synlig for forhandleren |

Områder: Bookinger, Kunder, Kjøretøy, Innboks, Timeplan, Tjenester og priser, Lager, Nettbutikk, Ansatte, Innstillinger og branding, Økonomi. Hvert område er Se eller Endre. «Ansatte: Endre» kan ikke dele ut tillatelser.

Tillatelser bor i `member_permissions`, leses per forespørsel, ikke fra sesjonen. Rollen daglig leder er låst av DB-trigger og endres bare via overføring.

### 5. Tofaktor

- **Bedrift** og **inviterte ansatte:** påkrevd. Ansatte setter opp ved første innlogging. Daglig leder før første Bedrift-handling. Gjenopprettingskoder.
- **Kunder:** valgfri.
- **Platform:** passkey / WebAuthn.

Dagens TOTP-mur ved kodeinnlogging flyttes til byttet til Bedrift (F7).

### 6. Invitasjon: lenke, så «Send meg kode»

GET på lenken endrer ingenting og sender ingen kode. Knappen «Send meg kode» er POST med CSRF, alltid til e-posten som er lagret på invitasjonen. Brukt lenke med registrert forhandler virker ikke. Samme feilmelding for feil kode, utløpt, brukt, låst og ukjent token.

Koden er 6–8 tegn (anbefalt 8), 10–15 minutter, maks 5 forsøk. Lagres som HMAC-SHA-256 med server-pepper (`INVITASJON_KODE_PEPPER`) og rad-salt. Konstant-tids sammenligning. Vanlig SHA-256 (som det lange tokenet bruker) holder ikke for en kort kode. Lenke, kode og opprettelse av forhandler skjer i én atomisk transaksjon.

### 7. Branding, e-post og GDPR

- Forhandlerens navn, logo (PNG/WebP, **ikke SVG**) og farge på kundesiden, innloggingen og kunde-e-poster.
- Ingen Endwise-logo i headeren på forhandlerflaten.
- «Levert av Endwise» i e-postfot og profil, styrt av `vis_levert_av` (default på).
- Ved opprettelse av kundeforhold: GDPR-informasjon på e-post (art. 13) med lenke til personvernerklæring. Aldri ved Quick-import (`source='quick'`). Ingen personopplysninger i e-postteksten.
- Avsenderadresse er dagens Resend-avsender. **Ingen nytt domene.** Kanonisk From i koden: `Endwise <noreply@endwise.no>` (`RESEND_FROM_KANONISK` i `packages/auth/src/resend-avsender.ts`). Verifisert apex: `endwise.no` (`RESEND_STANDARD_DOMENE`). Visningsnavn = forhandlerens navn.

### 8. Sesjon, cookie og `app.actor`

Ett vertslåst cookie per forhandlerhost: `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, ingen `Domain`, ingen `crossSubDomainCookies`. Kontekst (`privat` / `bedrift`) bor på sesjonsraden, ikke i cookien.

- Bytte til Bedrift krever ferskt TOTP og roterer sesjonen (CWE-384).
- `app.actor` er `customer` eller `staff`. Policyene feiler lukket. Ingen forespørsel blander kunde og ansatt.
- Tenant tas fra `Host`. Sesjonen avvises hvis `activeOrganizationId` ikke er vertens forhandler.
- Bedrift: 30 min inaktivitet, maks 8–12 t (forslag 10).
- Bedrift-API krever egen CSRF-header og nonce-CSP. Sensitive handlinger krever ny TOTP.
- `endwise_admin` / `endwise_support` får **aldri** sesjon på en forhandlervert. Forhandlerroller får aldri sesjon på `platform`.

### 9. Admin (`platform.endwise.no`)

Egen auth-sone, eget cookie-prefiks, passkey, kort sesjon. **IP-allowlist i Vercel Firewall er utsatt** (senere; adressene oppgis når det tas). Support er read-only som standard. Skriving og innlogging som forhandler krever just-in-time-tilgang: begrunnelse, tidsbegrensning, fire øyne, varsel til daglig leder. Uforanderlig `audit_log`.

Daglig leder-nødvei: valgfri stedfortreder (kan bare starte), firmaattest + ID, to Endwise-administratorer, 7 dagers varsel til gammel leder, alle økter til gammel leder avsluttes, gjenopprettingskoder.

---

## Sikkerhetskrav (Mons)

**Formelt godkjent av Mikael 3. november 2026.** Skrives inn i ADR-en i F0 og er akseptansekriterier i fasene. Mons reviewer F5, F6a, F7 og F8a som egne PR-er.

**1) Invitasjon**
- GET på lenken endrer ingenting. Koden sendes bare via «Send meg kode» (POST med CSRF), alltid til e-posten lagret på invitasjonen.
- Utsending begrenses til 3 per time.
- Koden har 6–8 tegn, varer 10–15 min og tåler maks 5 forsøk. Lagres som HMAC-hash. Ny kode gjør den gamle ugyldig.
- Lenke, kode og opprettelse av forhandler i én atomisk transaksjon. Alle feil gir samme feilmelding.
- TOTP må settes opp før Bedrift-handlinger.
- Siden har no-referrer, og token fjernes fra URL-en.
- Valgfritt for hovedkonto: SMS eller muntlig bekreftelse fra admin.

**2) Privat/Bedrift**
- Cookie per subdomene med `__Host-`, HttpOnly, Secure og SameSite=Lax.
- Bytte til Bedrift krever ferskt TOTP og roterer sesjonen. Konteksten lagres på sesjonsraden.
- `app.actor` er customer eller staff, policyene feiler lukket.
- Nonce-CSP på forhandlerverter, ingen HTML/SVG/JS fra forhandler.
- Bedrift-API krever egen CSRF-header.
- Sensitive handlinger krever ny TOTP.
- Bedrift-vinduet: 30 min inaktivt, maks 8–12 t.
- Tenant tas fra Host, sesjonen avvises ved avvik.

**3) Økt rettighet**
- Bare daglig leder og admin kan gi tillatelser. «Ansatte: Endre» kan ikke dele ut.
- Tildeling sjekkes i samme transaksjon (`FOR UPDATE`).
- Rollen daglig leder er låst med DB-trigger og kan bare endres via overføring.
- `omradeProcedure` og RLS per område, med negative tester og IDOR-tester.

**4) Daglig leder**
- Valgfri stedfortreder som bare kan starte nødprosess.
- Frivillig overføring med TOTP.
- Nødvei via platform: firmaattest, ID, to admins og 7 dagers varsel til gammel leder.
- Ved overføring avsluttes alle økter til gammel leder.
- Gjenopprettingskoder.

**5) Admin**
- Passkey/WebAuthn, kort sesjon og egen auth-sone. IP-allowlist i Vercel Firewall er utsatt (senere).
- Support er read-only som standard. Skriving og impersonering krever just-in-time-tilgang med begrunnelse, tidsbegrensning, fire øyne og varsel til daglig leder.
- Uforanderlig `audit_log` (GDPR art. 28/32).
- Admin får aldri sesjon på forhandlervert.

**6) Andre krav**
- Logo uten SVG, med re-encoding.
- Host-cache bare med offentlige felt.
- Mons reviewer F5, F6a, F7 og F8a som egne PR-er.

---

## F0-spike: funn og valg

Spikene er isolert og bak `ENDWISE_WHITE_LABEL_SPIKE` (default av). De endrer ikke produksjonsatferd.

### A. Tenant fra Host (`@endwise/modules/tenant-host` + `apps/web/proxy.ts`)

Ren funksjon, ingen DB. Reservert-liste i kode. Stub for eget domene returnerer alltid `null` (F3 fyller `tenant_domains`). Enhetstester dekker marked, platform, forhandler, reserverte ord, `endwise-`*, `--`, dev-localhost og preview-overstyring.

Next 16 bruker `proxy.ts` (ikke `middleware.ts`). Matcher forblir dagens auth-stier, så `/signin` fortsatt får `no-store`. Når flagget er på, settes `x-endwise-sone` / `x-endwise-slug` på request-headers etter at innkommende verdier er strippet. Ingen rewrite og ingen 404 i F0.

### B. Migrasjonsutkast 0045

Nye tabeller, ikke endring av eksisterende `invitations`-rader (triggeren der låser alle felt unntatt `revoked_at` / `accepted_at`):

- `tenant_branding` — visningsnavn, farger, logo PNG/WebP, `vis_levert_av`
- `tenant_domains` — subdomene eller eget, unik vert
- `reserverte_slugs` — redigerbar av admin, speiler kodefallback
- `invitation_codes` — HMAC-hash, salt, forsøk, utløp, `used_at`
- `member_permissions` — område × Se/Endre

RLS: `tenantPolicy` + inspect-SELECT på tenant-tabellene. `reserverte_slugs` bare med `app.platform_admin`. Skisse for `lookup_tenant_by_host` (SECURITY DEFINER, bare offentlige felt) og `app.actor` dokumenteres, men håndheves ikke på eksisterende tabeller i F0.

### C. Invitasjonskode-hjelper (`@endwise/modules/invitasjon-kode`)

`generer`, HMAC-SHA-256 med pepper + salt, `vurder` med konstant-tids sammenligning, forsøk og utløp. Alltid samme offentlige feil. Pepper leses fra `INVITASJON_KODE_PEPPER` (Mikael setter). Tester injiserer pepper.

### D. Better-Auth 1.7.x (lesing, ikke produksjonskode)

| Spørsmål | Funn i dagens kode | Valg for senere faser |
|---|---|---|
| Dynamiske origins | `trustedOrigins` er en statisk liste (`authTrustedOrigins()`). Jokertegn avvises bevisst (`auth-origins.ts`). | F7: funksjon som godtar `https://<slug>.endwise.no` bare hvis sluggen finnes i `tenants`. Aldri `*.endwise.no`. |
| Sesjonsfelt for kontekst | `session.additionalFields` brukes allerede til `absoluteExpiresAt`. | F7: `kontekst`, `bedrift_verifisert_at`, `bedrift_utloper_at` på samme måte. |
| TOTP step-up | `twoFactor`-plugin finnes. `assertTwoFactorSatisfied` er tom siden 02.09.2026. Muren sitter i `magic-link-2fa`. | F7: flytt muren til Bedrift-bytte. Ny TOTP for sensitive handlinger. |
| Rotasjon av sesjons-ID | 2FA-hooken sletter delsesjonen og lager ny (ADR-002). | F7: samme mønster ved bytte til Bedrift (CWE-384). Avklar eksakt Better-Auth-API i den PR-en. |
| Passkey | Plugin fjernet pga. peer-drift. `passkey`-tabellen ligger dormant. | F5: reaktiver `@better-auth/passkey` + klient når admin-sonen bygges. |
| Resend-domene | Kanonisk From er `Endwise <noreply@endwise.no>` (`resend-avsender.ts`). Verifiserte domener i `env.ts`: `endwise.no` og `no-reply.endwise.no`. Standard: `endwise.no`. | **Besluttet 2026-11-03:** bruk dagens Resend-avsender. Ingen nytt domene. Visningsnavn = forhandler. |

---

## Konsekvenser

1. F1 kan bygge `@endwise/modules/slug` og `reserver_slug()`. **Ingen migrasjon av eksisterende forhandlere.** Eksisterende forhandlere slettes; daglig leder settes via invitasjonsflyten (fresh start). Ingen slug-migrasjonsrapport.
2. F2 kan utvide proxyen til rewrite mot `/_kunde` og `/_plattform` uten å flytte 153 `(app)`-filer.
3. F3–F4 eier branding-UI og e-postmal. F5/F5b eier admin-sonen (`jit_grants` i F5b: to øyne, varsel, inspect-skriv). F6a–c eier tillatelser. F7 eier Privat/Bedrift. F8a–c eier invitasjon og daglig leder-overføring.
4. Ingenting av dette merges uten Mikaels OK på PR-en. Mons §3.11 er formelt godkjent 2026-11-03. Mons reviewer fortsatt F5, F6a, F7 og F8a.
5. Flagg `ENDWISE_WHITE_LABEL_SPIKE` forblir av i produksjon til F2.
6. DNS-sonen flyttes ikke. Sertifikat via `_acme-challenge` / CNAME til Vercel. IP-allowlist for `platform` tas senere.
7. **F14 (2026-11-03):** Framer-pluginen er et tillegg. Kundesiden er hele løsningen. Widgeten viser forhandlerens publiserte merke.

---

## Beslutninger (Mikael 3. november 2026)

1. **Mons §3.11** er formelt godkjent av Mikael 2026-11-03. Kravene over er akseptansekriterier i senere faser.
2. **Eksisterende forhandlere slettes.** Ingen migrasjon av daglig leder. Fresh start via invitasjonsflyten.
3. **Reservert-listen er utkast.** Endelig liste er ikke besluttet; listen i §2 og i `RESERVERTE_SLUGS` står som draft.
4. **E-postavsender:** dagens Resend-domene. Ingen nytt domene. Kanonisk From: `Endwise <noreply@endwise.no>` (`endwise.no`).
5. **DNS:** sonen blir der den er. `_acme-challenge`-delegering / CNAME til Vercel. Sonen flyttes ikke.
6. **IP-allowlist for `platform`:** utsatt. Markert som senere.

Ingen åpne spørsmål fra F0 gjenstår. F1 er ikke startet.
