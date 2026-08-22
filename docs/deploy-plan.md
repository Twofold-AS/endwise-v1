# F13 — Deploy-plan: to leverandører, Vercel + Scaleway

**Status:** PLAN (topologi) + **API-porten bygget 22.08.2026** (F13-03 del).
Scaleway-delen er ikke bygget.
**Sist oppdatert:** 22. august 2026
**Verifisert mot koden**, ikke mot hukommelse.

---

## Beslutningen

**To leverandører. Ikke tre, ikke fem.**

| | Leverandør | Hva |
|---|---|---|
| **Compute** | **Vercel** (fra1, EU) | `apps/web` + `apps/api` portet inn som Next route handlers |
| **Data** | **Scaleway** (Frankrike, EU) | Managed PostgreSQL · Serverless Container for `apps/stream` · Key Manager |

⚠️ **Neon er droppet.** To grunner, og den andre er den tekniske:

1. **Færre leverandører.** To parter å ha databehandleravtale med, to konsoller,
   to fakturaer. Hver ekstra leverandør er en avtale, en revisjon og et sted til
   å lekke fra.
2. **`LISTEN/NOTIFY` trenger en vanlig Postgres.** Sanntidskanalen vår holder én
   permanent `LISTEN`-forbindelse (`packages/modules/src/stream/subscriber.ts`
   bruker bevisst en `pg.Client`, ikke en `Pool` — `LISTEN` er sesjonstilstand).
   Serverless-Postgres med pooling foran er en kjent dårlig match for langlevde
   `LISTEN`-forbindelser: pooleren kan resirkulere forbindelsen under føttene på
   deg, og varselet forsvinner uten en feilmelding. Scaleway Managed PostgreSQL
   er en helt vanlig Postgres.

**⚠️ Den ærlige kostnaden ved å droppe Neon:**

| Vi mister | Betydning |
|---|---|
| **Branch-per-PR** | Preview-deploys får ikke lenger sin egen database automatisk. Enten deles en felles preview-DB (og da må testdata ryddes), eller så settes et branch-oppsett opp manuelt |
| **Scale-to-zero** | Vi betaler for en databaseinstans som står på, også om natta. For en pilot er beløpet lite, men det er ikke null |
| **PITR «gratis»** | Scaleway har automatiske backups, men gjenopprettingsvinduet og rutinene må settes opp og **testes** eksplisitt (F0-08) |

Byttet er verdt det fordi `LISTEN/NOTIFY` er fundamentet for sanntid. Å beholde
Neon ville betydd å bygge om sanntidsarkitekturen for å slippe unna pooleren —
altså å betale i kode for å spare i leverandørliste.

---

## Utgangspunktet (slik koden faktisk er i dag)

| App | Teknologi | Hvordan den startes | Byggetrinn? |
|---|---|---|---|
| `apps/web` | Next.js 16 + porterte API-ruter | `next dev` / `next build` | Ja |
| `apps/api` | Hono + tRPC **som bibliotek** | `node --experimental-strip-types src/dev.ts` (valgfri lokal `serve()`) | **Nei** — `build` er `tsc --noEmit` |
| `apps/stream` | Hono + SSE | samme | **Nei** |
| `apps/framer-agent` | Hono | samme | **Nei** |

⚠️ **Ingen av Hono-appene har et byggetrinn som produserer noe kjørbart.** De
kjøres fra TypeScript-kilde med Nodes `--experimental-strip-types`, og `serve()`
fra `@hono/node-server` binder en port — en **langlevd prosessmodell**.

Alle tre har `vercel.json` med `regions: ["fra1"]`, men **ingen** har en
Vercel-entrypoint. Filene er en intensjon, ikke et fungerende oppsett.

**Nettleseren snakker kun med `apps/web`.** Fra 22.08.2026 er API-et *i* web:

```
/api/auth/*  Next route handler  →  @endwise/api handleAuth
/trpc/*      Next route handler  →  @endwise/api handleTrpc
/widget/*    Next route handler  →  Hono via handleHono
/stripe/webhook  Next route handler  →  raw req.text()
/cron/*      Next route handler  →  Hono via handleHono
/health      Next route handler  →  handleHealth
/chat/*      Next route handler  →  Hono via handleHono
/invitasjoner/*  Next route handler  →  Hono via handleHono
/stream/*    rewrite → STREAM_INTERNAL_URL  (default http://localhost:3002)
```

`API_INTERNAL_URL` brukes ikke. `Set-Cookie` fra Better-Auth går same-origin
rett til nettleseren. `/stream/health` svarer fortsatt gjennom port 3000 via
rewriten.

---

## `apps/api` → inn i Next som route handlers

tRPC bruker allerede `fetchRequestHandler`, og Better-Auth er en ren
`handler(request)`. Begge ligger bare *bak* Hono i dag.

**Gevinst:** `API_INTERNAL_URL` utgår helt · same-origin uten proxy (sesjons-
cookien virker uten CORS) · én deploy · preview-per-PR uten å koordinere to
prosjekters URL-er · ingen dobbel kaldstart · ett sett miljøvariabler.

**⚠️ Må flyttes bevisst, ikke kopieres:**

- **Stripe-webhooken trenger RÅ request-body** til signaturverifisering. Next
  route handlers gir `await req.text()` — det fungerer, men må skrives om med
  vitende vilje.
- `secureHeaders()` og `logger()` fra Hono må erstattes (Next `headers()` i
  config, eller middleware).
- De fire Hono-rutene: `/widget/*`, `/stripe/webhook`, `/cron/*`, `/health`.
- Cron flyttes fra `apps/api/vercel.json` til web-prosjektets `vercel.json`.
- Serverless-timeout gjelder. Uproblematisk for tRPC (millisekunder); kjøretiden
  for `/cron/quick-pull` må sjekkes.

`apps/api` blir stående som **bibliotek** — `appRouter` og routerne lever videre,
det er bare Hono-skallet og `serve()` som forsvinner.

---

## `apps/stream` → Scaleway Serverless Container, minimum 1 instans

### Hva koden faktisk gjør (verifisert)

1. `subscriber.ts` åpner en `pg.Client` og kjører `LISTEN endwise_stream`.
   **Én permanent forbindelse per prosess**, med automatisk gjenoppkobling.
2. `apps/stream/src/app.ts` holder **åpne SSE-tilkoblinger** per innlogget
   bruker: hjerteslag hvert 15. sekund, maks levetid **30 minutter**, maks 5
   samtidige per bruker og 100 per forhandler.
3. Når `NOTIFY` kommer, fanes signalet ut **i minnet** til de tilkoblingene det
   gjelder — etter en hard sjekk på forhandler og mottaker.

### Hvorfor Scaleway Serverless Container og ikke Vercel

⛔ **Vercel serverless passer ikke.** Tre uavhengige grunner:

1. **Permanent `LISTEN` krever en prosess som lever.** En frossen funksjon
   mottar ingenting — og ingenting feiler synlig. Kanalen blir bare stille.
2. **Fan-out i minnet forutsetter én delt prosess.** Ved flere instanser har
   hver sin `LISTEN` og sitt eget minne, og tilkoblingsgrensen
   (`createConnectionRegistry`) teller per prosess.
3. **30-minutters tilkoblinger** betyr å betale for venting, ikke arbeid.

Scaleway Serverless Container med **`min_scale = 1`** løser alt tre: prosessen
står alltid på, `LISTEN` lever, SSE-tilkoblinger holdes. Det er i praksis en
managed container — vi slipper å drifte en maskin, men får prosessmodellen
appen er skrevet for. Og den ligger hos samme leverandør som databasen, altså
lav nettverkslatens og ingen ekstra databehandleravtale.

**⚠️ Krever et ekte byggetrinn.** `--experimental-strip-types` i produksjon er
ikke greit. Enten en `Dockerfile` som kompilerer TypeScript, eller et
bundle-steg. Dette må gjøres uansett host.

---

## Skaleringssti for `apps/stream` (dokumentert for fremtiden)

⚠️ Skriv dette ned nå, mens vi husker hvorfor — ellers blir svaret om to år
«sett opp Kubernetes», som ikke løser problemet.

### Steg 1 — én container (i dag → lenge)

`min_scale = 1`, `max_scale = 1`. Én prosess, én `LISTEN`, fan-out i minnet.
Dette er der vi starter, og det holder lenger enn man skulle tro.

### Steg 2 — vertikal skalering (rekker langt)

Flere CPU/minne på samme container. **En SSE-tilkobling er nesten gratis mens
den venter** — den koster en socket og litt minne, ikke CPU. En vanlig
container håndterer tusenvis av åpne tilkoblinger. Med 5 tilkoblinger per bruker
som tak, og et par hundre forhandlere, er vi ikke i nærheten av en grense.

**Målepunktet som betyr noe:** antall samtidige SSE-tilkoblinger og minnebruk —
ikke CPU.

### Steg 3 — horisontal skalering krever **APP-ENDRING**, ikke bare flere instanser

⛔ **Dette er hele poenget med å skrive ned stien.** Skrur man opp
`max_scale` til 2 i dag, får man to prosesser som hver holder sin egen `LISTEN`
og sitt eget minne. Det *virker* tilsynelatende — begge får `NOTIFY`, begge
sender til sine egne tilkoblinger. Men:

- Tilkoblingsgrensene (5/bruker, 100/forhandler) teller **per prosess**, så det
  reelle taket dobles i stillhet.
- Hver instans holder sin egen databaseforbindelse til `LISTEN`. Det skalerer
  lineært med instanser, og databasen har et forbindelsestak.
- Enhver fremtidig tilstand i minnet (f.eks. «hvem er online») blir feil.

**Grepet som må komme først:** flytt fan-out ut av prosessminnet til en delt
pub/sub — Redis er det opplagte valget, og Scaleway har managed Redis. Da blir
`LISTEN` én abonnent som publiserer videre til Redis, og instansene lytter der.
Tilkoblingsregisteret må samtidig flyttes til delt lagring.

### Steg 4 — Kubernetes (Scaleway Kapsule), hvis det noen gang blir så stort

Samme leverandør, så ingen ny avtale. **Men merk rekkefølgen:** Kapsule løser
*drift* av mange instanser. Det løser **ikke** at appen deler tilstand i minnet.

> ⚠️ **K8s uten pub/sub-grepet gir flere instanser som er uenige med hverandre.**
> Arkitekturgrepet i steg 3 må komme **først**. Kubernetes er et svar på
> «hvordan drifter jeg tjue containere», ikke på «hvordan deler de tilstand».

---

## GDPR-notat for `apps/stream`

Verifisert i koden 09.08.2026. **To lag, og de er ikke like.**

### Lag 1 — `pg_notify`-payloaden: ✅ kun IDer

`packages/modules/src/stream/publisher.ts` sender nøyaktig:

```js
JSON.stringify({ id: event.id, tenantId, audienceId })
```

Tre identifikatorer. **Ingen meldingsinnhold, ingen navn, ingen fritekst.** Det
er bevisst og dokumentert i koden: *«NOTIFY er varselklokka. Tabellen er
sannheten.»* Payloaden er dessuten begrenset til 8000 byte av Postgres selv.

### Lag 2 — SSE-rammen til nettleseren: ⚠️ **ikke alltid kun IDer**

Her må vi være presise. `apps/stream/src/app.ts` leser hele raden fra
`stream_events` og sender:

```js
data: JSON.stringify({ subjectId: event.subjectId, ...event.payload })
```

`event.payload` varierer per hendelsestype:

| Hendelse | Innhold i payload | Vurdering |
|---|---|---|
| `message.created` | `{ threadId, messageId, authorId }` | ✅ Kun IDer |
| `thread.escalated` | `{ threadId, reason, **summary** }` | ⚠️ `summary` er AI-generert **fritekst** om kundens problem |
| `agent.token` m.fl. | `{ ...event }` fra `stream-bridge.ts` | ⚠️ AI-genererte **tokens** strømmer gjennom |

**⚠️ Påstanden «stream-payloaden er kun IDer» stemmer altså for `NOTIFY`, men
ikke for alt som går ut på SSE.** Ved eskalering og AI-streaming passerer tekst
avledet fra kundesamtaler gjennom stream-prosessen.

### Hvorfor `apps/stream` likevel er lav risiko

Begrunnelsen er ikke «bare IDer» — den er:

1. **EU-residens.** Scaleway Frankrike. Samme jurisdiksjon som databasen.
2. **Ingen lagring.** `apps/stream` skriver **ingenting** til disk. Alt er
   transient i minnet i den tiden det tar å sende én ramme. Sannheten ligger i
   `stream_events`-tabellen, som allerede er dekket av retensjonspolicyen
   (F14-03) og sletterutinen (F14-16).
3. **Mottakerfiltrering.** `audienceId` sjekkes hardt i tjenesten — vi stoler
   ikke på at `NOTIFY` var riktig adressert — og innholdet hentes gjennom
   `readEventsSince` → `withTenant` → **RLS**.
4. **Metadata å ta hensyn til:** IP-adresser i containerens tilgangslogg
   (loggretensjon må settes) og hvem som er tilkoblet når.

**Konklusjon:** lav risiko, men **ikke fordi den bare ser IDer**. Fordi den
ligger i EU, ikke lagrer noe, og bare videreformidler det mottakeren uansett
ville fått gjennom RLS.

---

## Anbefalt topologi

```
Vercel (fra1, EU)         apps/web + tRPC/auth/widget/stripe/cron
                          som Next route handlers
                              ↓ (samme origin, ingen proxy)
                              ↓
Scaleway (Frankrike, EU)  ├─ Managed PostgreSQL   ← RLS + FORCE RLS
                          │      ↑ LISTEN/NOTIFY
                          ├─ Serverless Container ← apps/stream (min. 1 instans)
                          ├─ Serverless Container ← apps/framer-agent (F8-09/F13-04,
                          │                          senere — ikke i første deploy)
                          └─ Key Manager          ← ENDWISE_KEK (F1-13)
```

| Variabel | Etter omleggingen |
|---|---|
| `API_INTERNAL_URL` | **Utgår** — api er en del av web |
| `STREAM_INTERNAL_URL` | Scaleway container-URL, per miljø |
| `DATABASE_URL` / `APP_DATABASE_URL` | Scaleway Managed PostgreSQL (eier + app-rolle) |
| `ENDWISE_KEK` | Flyttes til Scaleway Key Manager (F1-13, egen sak) |
| `BETTER_AUTH_URL` | Prod-domenet |

`/stream/*`-rewriten **beholdes**: nettleseren skal fortsatt kjenne ett domene,
så sesjonscookien følger med uten CORS og uten token i URL.

---

## Rekkefølge

1. **Scaleway-konto + Managed PostgreSQL** (Frankrike). To roller: eier +
   app-rolle. Kjør migrasjoner og `db:grants`. **Verifiser at
   `force row level security` faktisk står på i produksjon** — ikke anta det.
2. **⚠️ Sjekk `drizzle.config.ts`.** Den har `entities.roles.provider: 'neon'`,
   som er en *funksjonell* innstilling: den forteller drizzle-kit å ignorere
   Neon-styrte roller. Mot en vanlig Postgres må dette trolig endres, ellers kan
   drizzle prøve å administrere `authenticated`-rollen. **Testes mot en
   engangsdatabase før produksjon** — ikke endres blindt.
3. **✅ Port `apps/api` inn i Next (22.08.2026).** `/trpc` → `/api/auth` →
   `/widget` → `/stripe/webhook` (rå `req.text()`) → `/cron/*` → `/health` →
   `/chat/*` → `/invitasjoner/*`. Cron i `apps/web/vercel.json`.
4. **Deploy web til Vercel.** Alle variabler fra `.env.example`, Production og
   Preview hver for seg. ⚠️ **Ulike Stripe-nøkler** — preview på live-nøkler tar
   ekte penger.
5. **Bygg og deploy `apps/stream` til Scaleway Serverless Container.**
   `min_scale = 1`, `max_scale = 1`. Ekte byggetrinn (Dockerfile), ikke
   `--experimental-strip-types`. Sett `STREAM_INTERNAL_URL`.
6. **Verifiser i produksjon:** innlogging holder over refresh · en melding gir
   sanntidsvarsel i et annet vindu · Stripe-webhooken flipper en modul · cron
   kjører · RLS: forhandler A ser ikke forhandler B.
7. **Backup-rutine** (F0-08): Scaleway automatiske backups + **testet**
   gjenoppretting. En backup ingen har gjenopprettet fra er en antakelse.
8. **framer-agent** — egen, senere deploy. Ikke en del av første produksjonssetting.
   Se avsnittet under.

---

## `apps/framer-agent` — egen container, senere

**Status i dag:** kun `/health`. Ingenting bygget, ingenting koblet på Framer.
Arkitekturen er besluttet (11.08.2026) og ligger som **F8-09** (produktet) og
**F13-04** (infrastrukturen). Dette avsnittet er kortversjonen for deploy.

**Hva den skal gjøre:** forhandleren beskriver en endring på sin egen nettside i
en chat → agenten foreslår → diff → **forhandleren godkjenner** → publiser.
⛔ **Aldri publisering uten godkjenning.**

**Hvordan den snakker med Framer:** Framers offisielle **Server API**
(server-side, uten at forhandleren har Framer åpen). ⛔ **Ikke**
community-MCP-pluginen — den krever en åpen Framer-klient på en persons maskin,
og det er ikke noe 250 forhandlere kan dele.

**Hvorfor en container og ikke en serverless funksjon:** en redigeringsøkt er
*stateful* — WebSocket og streaming mot Framer gjennom hele jobben. Samme
konklusjon som `apps/stream`, men av en litt annen grunn: stream trenger en
levende prosess for å **lytte**, framer-agent for å **holde en økt åpen mens den
jobber**.

⚠️ **Merk endringen fra tidligere plan:** techstacken sa *Vercel Container* +
*External Agent CLI* (CLI-en trengte shell og filsystem). Server API trenger
ikke shell. Konklusjonen «ikke serverless funksjon» står — verten er byttet til
Scaleway, som resten av dataplanet.

### Skala: 250 forhandlere er ikke 250 koblinger

Dette er det ene tallet som er lett å feiltolke.

| Størrelse | Ved 250 forhandlere |
|---|---|
| Krypterte tokens i databasen | 250 — **lagring, ikke last** |
| Alltid-åpne koblinger til Framer | **0** |
| Koblinger som betyr noe | **samtidige redigeringsjobber** |

En redigeringsøkt åpner en kobling, gjør jobben, og lukker. Redigeringer er
sporadiske — en forhandler endrer nettsiden noen ganger i måneden, ikke hele
dagen. Realistisk samtidighet er **enkeltsifret**, ikke tresifret.

**Jobb-kø med to grenser:** en global grense (maks N samtidige jobber per
instans, så en burst ikke velter containeren) og en **per-tenant** grense (maks
1–2 per forhandler, så én forhandler ikke spiser hele køen). Uten den andre er
den første verdiløs. Jobber over grensen står i kø med synlig status i UI-et —
de skal ikke feile mot brukeren.

⚠️ **Køen hører hjemme i Postgres, ikke i minnet.** `SELECT … FOR UPDATE SKIP
LOCKED` gir tre ting: jobber overlever restart og deploy, flere instanser kan
plukke fra samme kø uten koordinering, og forhandleren kan se status. Beslutningen
tas **før** bygging — å flytte en kø fra minne til database i etterkant er en
omskriving, ikke en justering.

**Containerskalering:** start på `min_scale = 1` (ingen kaldstart midt i en
forhandlers redigering). Kaldstart er i seg selv akseptabelt her — en jobb tar
sekunder til minutter — men `min_scale = 0` forutsetter at køen ligger i
databasen **og** at noe vekker containeren. `max_scale` holdes lav og heves målt
mot faktisk kø-lengde.

⚠️ **Motsatt konklusjon av `apps/stream`, og det er verdt å merke seg.**
`apps/stream` kan **ikke** skaleres horisontalt uten app-endring (fan-out i
minnet, én `LISTEN`). `apps/framer-agent` **kan** — jobbene er uavhengige, ingen
fan-out, ingen delt tilstand — **men bare hvis køen ligger i databasen.** Samme
leverandør, samme containertjeneste, ulik skaleringsegenskap. «Stream kan ikke,
altså kan ikke framer-agent heller» er en nærliggende og feil slutning.

**Rate limits mot Framer:** antar per-prosjekt *og* globale (per konto) grenser —
den globale er den farlige, fordi den gjør én travel forhandler til alles
problem. Mekanikk: eksponentiell backoff med jitter, global token-bucket foran
alle utgående kall, og **429 legger jobben tilbake i køen** i stedet for å feile
mot brukeren. ⛔ **De faktiske tallene er ikke kjent for oss** og skal leses ut
av Framers dokumentasjon før grensene settes. Ingen konstanter gjettes.

**Isolasjon:** eget token per forhandler, envelope-kryptert i
`integration_config` (`provider='framer'`) med RLS — samme mønster som
Quick-tokenet. Prosjekt-IDen leses fra tenantens config i en `withTenant()`-
transaksjon og **aldri fra modellens output eller fra sideinnhold**; ellers kan
en promptinjeksjon plantet i en side-tekst peke agenten på en annen forhandlers
prosjekt.

**Kostnad ved 250 forhandlere (grovt, forutsetningene synlige):** tre linjer —
AI-modellbruk per redigering, Framer Server API, og containerleien. Forutsetning
~2 redigeringer per forhandler per måned ≈ 500 redigeringer/mnd. **Kostnaden
skalerer med bruk, ikke med antall forhandlere:** 250 forhandlere som ikke
redigerer koster containerleien og ingenting mer. ⛔ Den største usikkerheten er
ikke AI-en, det er Framer: **krever Server API en bestemt plan, og er den per
prosjekt?** I så fall er kostnaden per forhandler og dominerer hele modellen.
Må avklares før modulen prises (F5-32).

⚠️ **Alt over hviler på eierens bekreftelse av at Server API-en finnes og hva den
kan.** API-flate, autentisering, grenser og prising er ikke lest av oss og må
verifiseres mot Framers dokumentasjon før bygging.

## Kundewidgeten

**Kundewidgeten deployes ikke av oss.** Den er `packages/widget-ui` (UI) +
`framer-plugin/` (Vite-app publisert gjennom Framer) + `/widget/*`-rutene i
`apps/api`. Widgeten lever på forhandlerens egen nettside; kun API-endepunktene
må deployes, og de følger `apps/api` inn i Next.

⚠️ **`apps/widget` finnes ikke.** Navnet brukes i samtale, men er ikke en app i
repoet.

---

## Åpne spørsmål for eier

1. **Preview-databaser:** uten Neons branch-per-PR — deler alle previews én
   felles Scaleway-database, eller settes det opp en engangsbase per PR?
   Førstnevnte er enklest, men da må testdata ryddes rutinemessig.
2. **Eget `stream.`-subdomene eller sti på hoveddomenet?** Påvirker cookie-scope
   og hvor mye rewriten må gjøre.
3. **Skal polling bygges som reserve** hvis stream-containeren er nede? Backend
   støtter det allerede (`readEventsSince` + `Last-Event-ID`); det er kun
   klientarbeid.
4. **Loggretensjon på Scaleway-containeren** — IP-adresser i tilgangsloggen er
   persondata. Hvor lenge beholdes de?
5. **Framer Server API: plan og prising.** Krever den en bestemt Framer-plan, og
   er den per prosjekt? Svaret avgjør om Framer-agenten koster per forhandler
   eller per bruk — og dermed hvordan modulen kan prises (F8-09/F13-04).
6. **Hvem eier Framer-prosjektet?** Forhandleren autoriserer tilgangen selv
   (F14-21), men om prosjektet ligger på forhandlerens egen Framer-konto eller
   på vår, endrer det både DPA-bildet og hva som skjer den dagen en forhandler
   sier opp.
