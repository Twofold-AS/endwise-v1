# Arbeidsrapport — kilder inn, lokal utvikling opp, F1-08 grønn

**Dato:** 14. juli 2026 (økt 4)

---

## 1. Hva er gjort

### Kildene inn (steg 1)

| Pakke | Resultat |
|---|---|
| **dither-kit** | ✅ Installert via `@dither-kit/cli` (source-mode) i `packages/ui/src/components/dither-kit/` — 22 filer, `area-chart` + `Sparkline`, trakk inn `core` (motion, d3-scale, d3-shape). Lockfile: `dither-kit.json` |
| **matrix-loaders** | ✅ Vendorisert fra https://github.com/zzzzshawn/matrix, pinnet commit `e30b80a`, i `packages/ui/src/vendor/matrix-loaders/` (124 filer + LICENSE + VENDOR.md) |
| **beUI** | ❌ Fortsatt ingen kilde — står igjen som eneste åpne punkt i `docs/MISSING-GITHUB-LINKS.md` |

**⚠️ Lisens som krever din vurdering:** matrix-repoet har en **egendefinert proprietær lisens**
(«All rights reserved»). Kommersiell bruk er uttrykkelig tillatt, men det er forbudt å
publisere komponentene som frittstående gjenbrukbare komponenter eller framstille dem som del
av et annet komponentbibliotek. Derfor ligger de under `vendor/`, adskilt fra våre egne
primitiver, i en pakke som er `private: true`. **Jeg mener bruken er innenfor — men jeg er ikke
jurist, og dette er din beslutning.**

### Lokal utvikling (steg 2) — og F1-08 endelig grønn

```bash
docker compose up -d     # Postgres 16 + pgvector + roller
pnpm db:setup            # migrasjoner + RLS-policyer + grants
pnpm dev                 # web :3000 · api :3001 · stream :3002
pnpm test                # F1-08 kjører mot ekte DB
```

**F1-08: 6/6 grønn mot en ekte Postgres.** Ikke lenger en påstand.

Det avgjørende designvalget: **to databaseroller.**

| Rolle | Env | Brukes til |
|---|---|---|
| `endwise` (eier) | `DATABASE_URL` | Migrasjoner, seeding. **RLS gjelder ikke for eieren** |
| `endwise_app` | `APP_DATABASE_URL` | All runtime + alle angrepstestene. RLS gjelder |

Kjørte vi angrepene som eier, ville alle seks «bestått» fordi RLS var usynlig. Det ville vært
den farligste grønne testen i repoet.

### To ekte feil funnet av testene

**1. `''::uuid` — ville ha krasjet i produksjon.**
Etter en transaksjon med `set_config(..., is_local => true)` tilbakestiller Postgres GUC-en til
**tom streng**, ikke NULL. Neste spørring på den gjenbrukte pool-forbindelsen kastet
`invalid input syntax for type uuid: ""` i stedet for å returnere null rader. Fikset med
`nullif(current_setting(...), '')` i RLS-uttrykket.

**2. Append-only feiler STILLE.**
Postgres kaster ikke feil når UPDATE/DELETE mangler policy — raden blir bare usynlig for
kommandoen, og du får `0 rows affected`. Tukling med audit-loggen gir altså ikke et unntak.
Testene er skrevet om til å verifisere det som faktisk gjelder: **raden er uendret.** Appkode kan
aldri stole på et unntak her.

### Roadmap endret (brukergodkjent)

Ny sistefase **F13 — «Deploy & drift (Vercel)»**. F0-07 (Vercel-prosjekter), F0-08 (Neon PITR) og
F0-09 (Firewall) flyttet dit fra `blocked` i F0, pluss nytt `F13-01` (Neon EU + branch-per-PR).
F0-03 er satt til **done** — skjema, RLS og migrasjoner er ferdige og verifisert; det er kun
*hostingen* som er utsatt. Dokumentert i `docs/roadmap-endringer.md`.

**Ingen techstack-endring.** Vercel, Neon, fra1/EU, Firewall og Flags står fast. Vi byttet
rekkefølge, ikke teknologi.

### Desktop-app (steg 4) — `docs/notater/desktop-app-vurdering.md`

Kort: **Vercel Native SDK finnes** (`vercel-labs/native`, Apache-2.0, v0.4.4, pre-1.0) — men den
løser ikke problemet. README-en er tydelig: «no browser, no WebView… logic is plain **Zig**».
Det betyr hele forhandler-UI-et skrevet om i Zig, ingen React, ingen shadcn, ingen dither-kit,
og to frontends å vedlikeholde. **Anbefaling: nei.**

Reelt alternativ: **installerbar PWA først** (Next.js 16 gir det gratis, og techstacken har
allerede en PWA), og et **Tauri 2-skall mot den hostede appen** hvis vi senere trenger tray/
auto-oppdatering. Merk: Tauris egen doku sier at Next.js må være **statisk eksport** —
vår RSC/tRPC-arkitektur tåler ikke det, så et skall mot hostet URL er den eneste farbare veien.

Foreslått som **F14 — Desktop-app (valgfritt)**, sist i roadmap. **Ikke lagt inn ennå** — venter på ditt ja.

### UI-forslag (steg 3) — `docs/notater/UI-forslag.md`

Kjernen: **forhandler og admin får samme dither-motor i motsatt dosering.**
Forhandler = aksent (sparklines i KPI-kort, maks én stor graf — de skal booke, ikke se på lysshow).
Admin = språk (stacked area med aura-bloom, rad-sparklines for 250 forhandlere — dithering skiller
lag der vanlige flater blir gjørme).

**Ingenting av UI-et er bygget.** Fem spørsmål venter på deg i dokumentet.

---

## 2. Hva gikk galt

1. **Neon-driveren (`@neondatabase/serverless`) kan ikke koble til lokal Postgres** — den snakker
   WebSocket til Neons proxy. Blokkerte hele lokal-dev-planen.
2. **Vendorisert kode tålte ikke `noUncheckedIndexedAccess`** — dither-kit og matrix-loaders ga
   ~40 typefeil.
3. Sandkassen har verken Docker eller root, så jeg kunne ikke kjøre din `docker-compose.yml` direkte.

## 3. Fikser

1. **Driverbytte til `pg` (node-postgres).** Databasen er den samme — Neon er en ekte Postgres og
   tar imot standard TCP. Kun klientdriveren er den vanlige. Dokumentert i `docs/roadmap-endringer.md`.
2. **`noUncheckedIndexedAccess` slått av** i `tsconfig.base.json`. Techstacken krever «TypeScript
   strict, 0 `any`» — det flagget er *ikke* en del av `strict`, og begge holdes fortsatt. Vendorisert
   kode er også utelatt fra Biome-lint (vi retter ikke andres kildekode).
3. Kjørte en ekte Postgres 18 i sandkassen (embedded-postgres, kun sandkasse — **ikke** i repoet)
   for å bevise at migrasjoner, grants og RLS-testene faktisk virker før jeg påsto det.

**Verifisering:** typecheck (16 pakker) · biome · `next build` · **6/6 RLS-tester mot ekte DB** — alt grønt.

---

## 4. Hva gjenstår

**Fra deg — i prioritert rekkefølge:**

1. **Svar på UI-forslaget** (5 spørsmål). Uten det bygger jeg ikke UI.
2. **Prototypen inn i repoet** → F0-11/F0-12 kan lukkes med ekte token-verdier.
3. **Lisens-avgjørelsen** på matrix-loaders.
4. **`beUI`** — hva er det?
5. Ja/nei på **F14 Desktop-app** i roadmap.

**Uten deg kan jeg gå videre med:** F2 — Kjernedata, backend-delene (F2-01 kjøretøyregister,
F2-04 tjenestekatalog, F2-06 kunderegister, F2-08 Vegvesen-oppslag). Alle er RLS-tabeller på
det fundamentet som nå er bevist. Admin-sidene (F2-02/05/07) venter på UI-godkjenningen.

Ingenting er pushet.
