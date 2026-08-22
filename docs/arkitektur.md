# Endwise — arkitektur

**Sist oppdatert:** 22. august 2026 (F13-03: `apps/api` portet inn i Next)
**Formål:** én oversikt over hva hver del gjør, og hvordan de henger sammen.
Skrevet så en ikke-utvikler kan lese hoveddelene.

Alt her er verifisert mot koden, ikke mot hukommelse. Ser du et avvik, er det
koden som har rett — og da skal dette dokumentet rettes.

---

## Kortversjonen

Endwise består av **tre kjørende tjenester i prod** (web+api er samme
Vercel-prosjekt), ett **delt kodebibliotek**, og **én database**.

| Del | Hva den gjør | Port lokalt |
|---|---|---|
| `apps/web` | Alt du ser + API-et som Next route handlers (`/trpc`, `/api/auth`, …) | 3000 |
| `apps/api` | Bibliotek: `appRouter`, Better-Auth-handler, Hono-flater. `serve()` kun lokal dev | 3001 (valgfri) |
| `apps/stream` | Sanntid: «det kom en ny melding» | 3002 |
| `apps/framer-agent` | Skall for Framer-agenten (F8-09/F13-04, ikke bygget ennå) | 3003 |

Nettleseren snakker **kun** med `apps/web`. Auth og tRPC lever same-origin i
web. Bare SSE videresendes til `apps/stream`. Du ser aldri port 3001 eller
3002 i adressefeltet.

---

## Applikasjonene

### `apps/web` — flatene

Next.js 16 (App Router, React 19). Inneholder tre ulike verdener i samme app:

- **Forhandlerpanelet** (`app/(app)/…`) — dashboard, saker, kunder, kjøretøy,
  innboks, lager, innstillinger. Krever innlogging.
- **Mekaniker-appen** — samme kodebase, men mekanikere låses til `/min-dag` og
  får et mobil-skall med bunnmeny i stedet for sidebaren. Installerbar som app
  (PWA) med offline-støtte.
- **Offentlige sider** — `/` (landingsside), `/veikart`, `/signin`.

⚠️ **UI-et har ingen egen database-tilgang.** Datakall går gjennom
`@endwise/api` (`appRouter` og Hono-rutene). Fra F13-03 kjører det biblioteket
*inne i* `apps/web` som route handlers — samme kode, samme RLS, ingen annen
prosess på Vercel.

**Videresending (rewrites) i `next.config.ts`** — bare SSE går ut av appen:

```
/stream/*    →  STREAM_INTERNAL_URL  (apps/stream / senere Scaleway)
```

`/api/auth/*`, `/trpc/*`, `/chat/*`, `/invitasjoner/*`, `/widget/*`,
`/stripe/webhook`, `/cron/*` og `/health` er Next route handlers. Same-origin
betyr at sesjonscookien sendes med automatisk, uten CORS og uten at en
tilgangstoken må ligge i en URL.

### `apps/api` — logikken (bibliotek)

Hono + tRPC v11, importert av `apps/web`. Eier:

- **Innlogging** — hele `/api/auth/*` håndteres av Better-Auth
- **Alle datakall** — `/trpc/*`, ~25 routere (bookinger, kunder, kjøretøy,
  meldinger, lager, abonnement, team …)
- **Den offentlige kundewidgeten** — `/widget/*` (egen nøkkel, ikke sesjon)
- **Stripe-webhooken** — `/stripe/webhook`, signaturverifisert
- **Planlagte jobber** — `/cron/*` (opprydding, retensjon, Quick-synk)

Hver tRPC-rute går gjennom en kjede av sperrer: er du innlogget → er du medlem
av forhandleren → har du rollen → har forhandleren betalt for modulen → og til
slutt RLS i databasen.

### `apps/stream` — sanntid

Hono + SSE (Server-Sent Events). Én jobb: fortelle nettleseren at *det har
skjedd noe*, slik at den kan hente det på nytt.

**Mekanismen, i den rekkefølgen den skjer:**

1. Noen skriver en melding → `apps/api` lagrer den og kaller `pg_notify`
2. `apps/stream` holder **én permanent `LISTEN`-forbindelse** til Postgres og
   fanger opp signalet
3. Streamen sender signalet videre til de nettleserne som skal ha det
4. Nettleseren henter selve meldingen gjennom `apps/api` — altså gjennom RLS

⚠️ **`NOTIFY`-signalet inneholder aldri innhold** — nøyaktig
`{ id, tenantId, audienceId }`, altså tre identifikatorer (verifisert i
`publisher.ts`). Postgres kutter uansett `NOTIFY` på 8000 byte, men
hovedgrunnen er en annen: alle som lytter på kanalen ser payloaden.
*NOTIFY er varselklokka. Tabellen er sannheten.*

⚠️ **Men SSE-rammen ut til nettleseren er ikke alltid kun IDer.** Streamen leser
hele raden fra `stream_events` og sender `payload` videre. For
`message.created` er det bare IDer, men ved **eskalering** (`summary`) og
**AI-streaming** (tokens) passerer generert tekst fra kundesamtaler gjennom
prosessen. Den lagres aldri av streamen, og mottakeren ville uansett fått den
gjennom RLS — men påstanden «streamen ser bare IDer» er ikke presis nok. Se
GDPR-notatet i `docs/deploy-plan.md`.

Tilkoblingene er **langlevde**: hjerteslag hvert 15. sekund, maks levetid 30
minutter per tilkobling. Det er dette som gjør deployment vanskelig — se
`docs/deploy-plan.md`.

### `apps/framer-agent` — skall

Hono, kun `/health` i dag. **Ikke bygget.** Arkitekturen ble besluttet
11. august 2026 og ligger som plan i roadmapen (F8-09 + F13-04).

**Hva den skal bli:** forhandleren beskriver en endring på sin egen nettside i en
chat. Agenten foreslår, viser en diff, og forhandleren godkjenner før noe
publiseres. ⛔ **Agenten publiserer aldri selv.**

Den snakker med Framer gjennom **Framers offisielle Server API** — server til
server, uten at forhandleren har Framer åpen på maskinen sin. Kjører som en egen
Scaleway Serverless Container ved siden av `apps/stream`, fordi en redigeringsøkt
holder en åpen forbindelse mens den jobber.

⚠️ **250 forhandlere betyr ikke 250 åpne koblinger.** Hver forhandler har sitt
eget krypterte Framer-token, men en kobling finnes bare mens en jobb kjører.
Det som må dimensjoneres er antall *samtidige redigeringer*. Se
`docs/deploy-plan.md`.

### Kundewidgeten — ikke en egen app

⚠️ Verdt å vite fordi den ofte omtales som «apps/widget», som **ikke finnes**.
Widgeten er tre deler:

| Del | Hva |
|---|---|
| `packages/widget-ui` | Selve bookingflaten kunden ser |
| `framer-plugin/` | Vite-app som pakker den for Framer, med forhandlerens nøkkel |
| `apps/api/src/routes/widget/` | De offentlige API-ene widgeten kaller |

Den **deployes ikke av oss** — den publiseres gjennom Framer og lever på
forhandlerens egen nettside.

---

## Kodebiblioteket (`packages/`)

Disse kjører ikke av seg selv. De er delt kode appene bruker.

| Pakke | Eier |
|---|---|
| `db` | Databaseskjema, migrasjoner, RLS-policyer, `withTenant()`, kryptering |
| `auth` | Better-Auth-oppsettet, roller, sesjonspolicy, tenant-oppretting |
| `modules` | Forretningslogikken: booking, meldinger, lager, abonnement, profil, Quick |
| `providers` | AI-leverandører + **dataregion-reglene** (hva som må kjøre i EU) |
| `agent-runtime` | Motoren AI-agentene kjører i (verktøy, budsjetter, eskalering) |
| `agents` | De konkrete agentene (kundestøtte, drift-innsikt) |
| `guardrails` | Sikring rundt AI: sladding av persondata, tema-sperrer, revisjonslogg |
| `events` | Typet hendelseskatalog |
| `tools` | Verktøy agentene kan kalle |
| `ui` | Delte komponenter og ikoner |
| `widget-tokens` | Farger, avstander og typografi — én kilde for hele produktet |
| `widget-ui` | Kundens bookingflate |
| `uploads` | Filhåndtering |

---

## Databasen

**Postgres 16** — lokalt i Docker, **Scaleway Managed PostgreSQL (Frankrike, EU)**
i produksjon.

⚠️ **Hvorfor en helt vanlig Postgres, og ikke en serverless-variant:**
sanntidskanalen holder én permanent `LISTEN`-forbindelse. Serverless-Postgres
med en pooler foran kan resirkulere den forbindelsen under føttene på oss — og
da forsvinner varselet uten en feilmelding. Det er hovedgrunnen til at Neon ble
droppet til fordel for Scaleway. Se `docs/deploy-plan.md`.

### To databasebrukere, og det er en sikkerhetsmekanisme

| Bruker | Brukes til | RLS |
|---|---|---|
| `DATABASE_URL` (eier) | Migrasjoner og seeding | Gjelder **ikke** |
| `APP_DATABASE_URL` (app) | **Alt** som kjører i drift | Gjelder |

⚠️ Kobler applikasjonen seg til som eier, forsvinner RLS **uten en eneste
feilmelding** — bare rader fra alle forhandlere. Derfor leser `apps/api`
`APP_DATABASE_URL` først, og derfor står `force row level security` på alle
tenant-tabeller: `force` fjerner unntaket som ellers gjelder tabelleieren.

### Row Level Security (RLS)

Hver tabell med forhandlerdata har en regel: *du ser bare rader der
`tenant_id` = den forhandleren du er logget inn hos.* Regelen håndheves av
databasen selv, ikke av koden — en glemt `WHERE` kan derfor ikke lekke data på
tvers av forhandlere.

`withTenant()` setter forhandler-IDen for én transaksjon om gangen. Før den
settes, sjekker `assertMember()` at brukeren faktisk er medlem. RLS beskytter mot
*lekkasje*; medlemskapssjekken beskytter mot *løgn*.

⚠️ **Unntak:** Better-Auth sine tabeller (`user`, `session`, `member`,
`organization`) har bevisst **ingen** RLS — de er globale identiteter, og
innloggingen skjer før noen forhandler er valgt. Grensen går i stedet på
`organization.id` (= `tenant_id`) i hver spørring.

---

## Eksterne tjenester

| Tjeneste | Brukes til | Kritisk? |
|---|---|---|
| **Vercel** (fra1, EU) | ⭐ **All compute:** `apps/web`, med `apps/api` portet inn som route handlers | Ja |
| **Scaleway** (Frankrike, EU) | ⭐ **All data:** Managed PostgreSQL · Serverless Container for `apps/stream` · Key Manager | Ja |
| **Stripe** | Abonnement og betaling. **Webhooken er det eneste som skrur på moduler** | Ja, for salg |
| **Resend** | E-post: engangskoder ved innlogging, bekreftelser, nyhetsbrev | Ja — innlogging med 2FA feiler uten |
| **Twilio** | SMS til kunder og engangskoder på telefon | Nei |
| **Mistral (EU)** | ⚠️ **All AI som ser kundens egne ord.** Ingen reserveløsning — mangler nøkkelen, nekter agenten å starte i produksjon | Ja, for AI mot kunde |
| **Fireworks** | AI på våre egne driftsdata (antall saker, kapasitet). Aldri kundetekst | Nei |
| **Statens vegvesen** | Regnr → merke, modell, EU-frist. Betales per oppslag | Nei |
| **Quick** | Synk av kunder og bookinger mot forhandlerens ERP | Nei |
| **Sentry** | Feilrapportering | Nei |

### ⛔ Dataregion er en regel, ikke en preferanse

Kode i `packages/providers/src/data-region.ts` deler data i to klasser:

- `customer_freetext` — kundens egne ord → **må** til EU-leverandør (Mistral)
- `tenant_operational` — vår egen strukturerte drift → kan gå hvor som helst

En feilkonfigurasjon her er ikke en bug, det er et personvernbrudd. Derfor er
det en type som ikke lar seg kompilere feil, og det finnes ingen fallback fra
EU til USA.

---

## Slik flyter en vanlig forespørsel

Eksempel: forhandleren åpner kundelista.

```
1. Nettleser          GET /kunder                      → apps/web
2. apps/web           kaller /trpc/customers.list      → egen route handler
3. @endwise/api       sesjonscookie → hvem er du?
                      assertMember → er du medlem her?
                      rolle + modulsjekk
4. withTenant()       setter forhandler-ID for transaksjonen
5. Postgres           RLS filtrerer bort alt som ikke er din forhandler
6. Svar tilbake       route handler → nettleser
```

Fem sperrer før en rad forlater databasen. Hver av dem fanger en **annen** feil,
og det er derfor de ikke er overflødige.

## Slik flyter sanntid

Eksempel: en kollega sender deg en melding.

```
1. Kollegaens nettleser  →  apps/web  →  apps/api
2. apps/api              lagrer meldingen i Postgres
                         kaller pg_notify («ny melding, tenant X, til deg»)
3. Postgres              varsler apps/stream over LISTEN-forbindelsen
4. apps/stream           sjekker: riktig forhandler? riktig mottaker?
                         sender signalet på din åpne SSE-tilkobling
5. Din nettleser         får signalet → henter meldingen via /trpc
                         → gjennom RLS, som alt annet
6. Skjermen oppdaterer seg, og det spiller en lyd
```

⚠️ Merk steg 5: nettleseren **stoler aldri på signalet som innhold**. Den bruker
det bare som et varsel om å hente på nytt. Et grensesnitt som viser pushet
innhold direkte, viser før eller siden noe RLS aldri godkjente.

⛔ Avsenderen får **ikke** signal om sin egen melding — man skal ikke varsles om
noe man selv nettopp gjorde. Derfor har avsenderen en egen kvitteringslyd.

---

## Hvor ting kjører (besluttet 09.08.2026)

**To leverandører. Vercel er compute, Scaleway er data.**

```
Vercel (fra1, EU)         apps/web + api som Next route handlers
                              ↓ samme origin
Scaleway (Frankrike, EU)  ├─ Managed PostgreSQL   ← all lagring, RLS
                          │      ↑ LISTEN/NOTIFY
                          ├─ Serverless Container ← apps/stream (alltid på)
                          ├─ Serverless Container ← apps/framer-agent (senere)
                          └─ Key Manager          ← krypteringsnøkkelen
```

Hvorfor akkurat denne delingen: compute passer serverless perfekt, data gjør det
ikke. Sanntidstjenesten trenger en prosess som lever, og databasen trenger å være
en helt vanlig Postgres. Begge deler får vi hos Scaleway, i EU, hos én
leverandør. Full begrunnelse og skaleringssti i `docs/deploy-plan.md`.

---

## Hva som gjenstår før produksjon

Se **`docs/deploy-plan.md`** for hele analysen. Kortversjonen:

- `apps/web` er Vercel-klar, og `apps/api` **er portet inn** som route handlers.
  `API_INTERNAL_URL` utgår.
- `apps/stream` kjører som **Scaleway Serverless Container med minst én
  instans** — langlevde tilkoblinger og en permanent databaseforbindelse er det
  motsatte av det Vercel serverless er god på.
- Databasen flyttes til **Scaleway Managed PostgreSQL**. Vi mister Neons
  branch-per-PR og scale-to-zero; vi får en vanlig Postgres der
  `LISTEN/NOTIFY` er til å stole på.
- Ingen av Hono-appene har et byggetrinn i dag — det må lages for `apps/stream`.
- `apps/framer-agent` får **sin egen container hos Scaleway**, men er ikke med i
  første produksjonssetting. Plan: F8-09 (produktet) + F13-04 (skalering til
  minst 250 forhandlere).
