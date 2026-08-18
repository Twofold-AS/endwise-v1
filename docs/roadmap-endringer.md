# Roadmap-endringer

Logg over bevisste, brukergodkjente endringer i `endwise-roadmap.html`.
Roadmap er én kilde til sannhet — derfor skal hver endring i den ha en linje her.

---

## 2026-07-14 — Deploy utsatt: ny fase F13

**Godkjent av:** Mikkis
**Endring:** Tre punkter flyttet ut av F0 og inn i en ny sistefase **F13 — «Deploy & drift (Vercel)»**:

| ID | Punkt | Var | Er |
|---|---|---|---|
| F0-07 | Vercel-prosjekter (fra1) + Container | `blocked` i F0 | `planned` i F13 |
| F0-08 | Neon PITR + restore-test | `blocked` i F0 | `planned` i F13 |
| F0-09 | Vercel Firewall + WAF | `blocked` i F0 | `planned` i F13 |
| F13-01 | **Nytt:** Neon EU som prod-DB + branch-per-PR | — | `planned` i F13 |

**Hvorfor:** vi bygger og tester lokalt først (Docker + localhost). De tre punktene sto som
`blocked` fordi de venter på Vercel-/Neon-kontoer — men de blokkerte i praksis ingenting.
Å la dem stå røde i F0 ga et falskt bilde av at fundamentet var ufullstendig. Fundamentet er
ferdig; det er *deploy-målet* som er utsatt.

**Hva dette IKKE er:** ingen endring i techstacken. Vercel, Neon, fra1/EU, Firewall og Flags SDK
står fast (techstack §0/§2/§5). Vi bytter ikke teknologi — vi bytter rekkefølge.

**Konsekvenser:**

- `F0-03` er satt til **done**: skjema, RLS-policyer og Drizzle-migrasjoner er ferdige og
  verifisert mot en ekte Postgres. Selve Neon-*hostingen* er skilt ut som `F13-01`.
- Lokal Postgres kjøres via `docker compose up -d` (`docker/init/01-roles.sql` lager app-rollen).
  Techstack §2 sier allerede «Docker Compose — kun for lokal dev», så dette er innenfor.
- Alle API-nøkler leses fra env-variabler (`.env.example`). Fireworks/Resend/Twilio/Vercel kan
  kobles på når som helst uten kodeendring.
- Sentry (F0-14) og Flags/Edge Config (F0-04) står fortsatt som `progress`: koden er på plass,
  men de trenger Vercel-/Sentry-kontoer for å bli grønne. De hører naturlig sammen med F13.

---

## 2026-07-14 — Driverbytte i `packages/db` (ikke en roadmap-endring, men relevant)

`@neondatabase/serverless` → `pg` (node-postgres). Neon-driveren snakker WebSocket til Neons
proxy og kan ikke koble til en vanlig Postgres — altså heller ikke Docker-basen vi utvikler mot
og kjører F1-08 mot. Neon er en ekte Postgres og tar imot standard TCP.

**Databasen er den samme** (Neon, techstack §2/§5). Kun klientdriveren er den vanlige.

---

## 2026-07-14 — Recharts ut. dither-kit er eneste chart-motor

**Godkjent av:** Mikkis (eksplisitt ja)
**Type:** **techstack-endring** (§2 Frontend + §1 «Døde valg» + §6)

| Var | Er |
|---|---|
| `Recharts` (charts) + `dither-kit` (signatur-estetikk) | **kun `dither-kit`** — områder, linjer, søyler, pai, radar, sparklines |

**Hvorfor:** to chart-lag ga to visuelle språk i samme produkt. dither-kit dekker alle
chart-typene vi trenger *og* signatur-estetikken. Recharts ville blitt en avhengighet vi later
som vi har.

**Gjort i samme økt:**
- `docs/endwise-techstack.md`: §2 oppdatert, rad lagt til i §1-tabellen, Recharts lagt til i §6
  «Hva vi bevisst IKKE bruker»
- `docs/UI-PAKKER.md`: dither-kit merket som eneste chart-motor
- Hele dither-kit hentet inn (`bar-chart`, `pie-chart`, `radar-chart`, `avatar`, `button`,
  `gradient` i tillegg til `area-chart`)
- Recharts var aldri installert som avhengighet — ingenting å fjerne fra `package.json`

---

## 2026-07-14 — Full dither-behandling. Tilgjengelighet skjøvet, ikke droppet

**Godkjent av:** Mikkis
**Endring:** to nye punkter i **F11 (Avansert)** i stedet for som blokkerende krav i F3/F5:

| ID | Punkt |
|---|---|
| `F11-07` | **Reduced-motion-variant** av dither-flatene — brukervalgt statisk/dempet modus |
| `F11-08` | **Performance-budsjett** — Playwright-måling av fps + tak på samtidige canvas. **Måling/advarsel i CI, ikke blokkerende** |

**Hva som IKKE er skjøvet, og hvorfor:**

1. **`prefers-reduced-motion` beholdes.** dither-kit og beUI respekterer den allerede i sin egen
   kildekode. Vi *fjerner ikke* tilgjengelighet som allerede er der — vi utsetter den eksplisitte
   valg-varianten. F11-07 er ekstrautstyret, ikke sikkerhetsbeltet.
2. **«Dither bærer aldri informasjon alene» beholdes.** Tetthet forsterker; tallet står alltid i
   klartekst. Regelen koster oss ingenting, holder WCAG, og gjør at F11-07 blir enkel når den
   kommer.

**Risikoen eieren har tatt bevisst:** ytelse på lav-ende forhandlermaskiner. F11-08 måler den, men
stopper ikke bygget. Vurderes skjerpet når vi har tall fra ekte maskiner.

---

## 2026-07-14 — cal.com vurdert og forkastet

**Besluttet av:** Mikkis. **Ingen endring** i techstack eller roadmap — vi fortsetter med egen
booking-motor (F3-01). Begrunnelse i `docs/adr/ADR-004-cal-com-vurdert-og-forkastet.md`:
domenet er verkstedkapasitet (ferdigheter, versjonert varighet, mekaniker-lås), ikke møtebooking ·
motoren er allerede bygget og bevist med 9 tester · AGPL-3.0 mot et SaaS-produkt · nok et system å
drifte, i strid med «én leverandør» (techstack §0).

---

## 2026-07-14 — Rettelse: F3-04-teksten sa «BullMQ»

**Type:** tekstrettelse i roadmap, ikke en endring av hva som bygges.

F3-04 var formulert som «Varslingsmodul (Twilio + **BullMQ**)». BullMQ står i techstack §1 som
et **dødt valg** og i §6 under «Hva vi bevisst IKKE bruker». Køen er **Vercel Workflows**
(F0-13 / ADR-003). Koden har hele tiden fulgt techstacken — det var roadmap-teksten som hang
igjen fra den forkastede Hetzner-arkitekturen.

**Ny tekst:** «Varslingsmodul (Twilio + Resend via Vercel Workflows …) … Idempotens-vakt hindrer
dobbeltsending ved Workflow-retry».

---

## 2026-07-14 — NYTT PUNKT: F3-12 Kompetanseregister per mekaniker

**Godkjent av:** Mikkis. **Ingen techstack-endring.**

**Hvorfor det trengs:** F3-02-matcheren rangerer på ferdigheter — men det fantes ingen flate for
å *vedlikeholde* dem. Ferdighetene lå som en `text[]`-kolonne på `mechanics`, satt ved seeding.
En motor uten ratt.

**Sjekket mot eksisterende punkter først:** F1-05 er RBAC (rollene, ikke kompetansen). F1-07 er
Endwise-admin (tenants/mekanikere, ikke ferdighetsnivå). **F3-08 er UI-en** («mekanikerliste m/
load-bars, skills, sertifisering») — men backend-en den skal vise fantes ikke. Derfor et nytt
backend-punkt, ikke en omskriving av F3-08.

**F3-12:** forhandler-admin vedlikeholder ferdigheter + gradert nivå (1–5) + sertifisering med
utløpsdato per mekaniker. Kilden F3-02 rangerer på. RBAC-gate + RLS. UI-en forblir F3-08.

**Konsekvens:** `mechanics.skills`-kolonnen er **fjernet**. Én kilde til sannhet:
`mechanic_skills`.

---

## 2026-07-14 — TECHSTACK-ENDRING: OpenAI → Fireworks

**Godkjent av:** Mikkis (eksplisitt instruks).

⚠️ **Merk:** techstacken sa **OpenAI**, ikke Fireworks. Jeg sjekket §2 og §5 før jeg bygde —
Fireworks sto ingen steder. Dette er derfor en **reell techstack-endring**, ikke en presisering.
Den er gjennomført fordi eier ba om det, og loggført her.

| Var | Er |
|---|---|
| «OpenAI primær; leverandører bak abstraksjon» (§2) | **Fireworks primær** (`@ai-sdk/fireworks`) |
| «OpenAI / OpenRouter» (§5) | **Fireworks** (primær) + **OpenRouter** (kun Fusion/Council) |

**Oppdatert i samme økt:** §1 «Døde valg» (ny rad), §2 AI-lag, §5 Eksterne tjenester, `.env.example`.

**Poenget som er verdt å merke seg:** byttet kostet **én fil**
(`packages/providers/src/fireworks.ts`). Agent-runtimen kjenner bare `ModelProvider`-grensesnittet
og ber om en ROLLE, aldri om et modellnavn. Det er nøyaktig det modellkatalogen og
AIProvider-abstraksjonen (techstack §2) ble bygget for — og første gang det ble testet i praksis.

---

## 2026-07-14 — OpenAI ut, fullført. Fireworks **serverless**

**Godkjent av:** Mikkis (bekreftet).

Fullført det som ble påbegynt tidligere i dag:

- **§6 «Hva vi bevisst IKKE bruker»:** OpenAI lagt til (som LLM-leverandør).
- **§1 «Døde valg»:** raden lå allerede der.
- **§2:** presisert til **Fireworks serverless**, ikke dedicated/on-demand.
- **Kode/avhengigheter:** ingen OpenAI-rester. (`@ai-sdk/openai-compatible` finnes i lockfila,
  men det er en **transitiv avhengighet av `@ai-sdk/fireworks`** — Fireworks' eget API er
  OpenAI-kompatibelt. Det er ikke OpenAI, det er protokollen.)

### Konsekvenser av *serverless* (hentet fra Fireworks' egne docs)

| | Serverless (valgt) | On-demand |
|---|---|---|
| Tool calling | ✅ Støttes — men **kun modeller merket `supportsTools`** | ✅ |
| Billing | Per token | Per GPU-sekund |
| Rate limits | **Harde grenser** | Kun kapasitet |
| Modellutvalg | **Smalere** | Bredere + egne modeller |
| Latens | Delt kapasitet — varierer med last | Dedikert, forutsigbar |
| **Region** | ⚠️ **Ingen region-pinning** | `--region EUROPE` mulig |

**To ting som er ført inn i techstacken som følge av dette:**

1. **`supportsTools` må sjekkes** før en modell velges til en agent-rolle. Hele tool-loopen
   avhenger av det. Fireworks anbefaler også **lav temperatur (0.0–0.3)** ved tool calling.
2. ⚠️ **GDPR-avveiningen** (§5, nytt avsnitt): resten av arkitekturen er EU-bundet (Vercel fra1,
   Neon EU). Serverless kan ikke region-pinnes. Så lenge agentene kun ser tenant-skopede
   driftsdata er eksponeringen begrenset — men skal kundenes fritekst inn i prompten, må det
   avklares (DPA/SCC, eller on-demand i EU). **Eier er informert.**

---

## 2026-07-14 — Agenten bindes til én tenant ved spawn (F6-13)

**Godkjent av:** Mikkis. **Ingen techstack-endring** — dette er en strukturell innstramming.

**Ærlig vurdering, som bestilt:** de tre lagene vi hadde (sesjon → L2-stripping → RLS) var
**allerede tilstrekkelige** mot angrepet. `spawnAgent()` stopper ingen lekkasje som ellers ville
skjedd i dag.

**Det den gjør, er å endre hvilke feil som er mulige å INTRODUSERE senere.** Før var «hent tenant
fra konteksten» en *konvensjon* hvert nytt verktøy måtte huske. Konvensjoner overlever ikke fem
års vedlikehold av folk som ikke leste kommentaren. Nå bygges verktøyene **én gang, ved spawn,
med en frosset kontekst** — løkka får dem ferdige og kan ikke lage nye. Det finnes ikke lenger et
sted i koden der en tenant-ID kan *settes*.

Invarianten er dermed ikke «alle husker å gjøre det riktig», men **«det er ikke mulig å gjøre det
galt»**. Forskjellen på en regel og en struktur.

---

## 2026-07-14 — NY FASE: F14 Personvern, GDPR og AI Act

**Godkjent av:** Mikkis. **Ingen techstack-endring.**

Bakgrunn: `docs/personvern/GDPR-og-AI-veikart.md` (nytt dokument). Research gjort mot Fireworks'
egne docs og personvernerklæring, DPF-lista, Datatilsynets DPIA-liste og EU AI Act art. 50 —
alt sitert i dokumentet.

**Seks nye tekniske punkter, alle backend/UI vi bygger selv:**

| ID | Punkt | Merknad |
|---|---|---|
| `F14-01` | **Pseudonymisering før prompt** | Viktigste tiltaket. Fjerner premisset for overføringsdiskusjonen |
| `F14-02` | Assert på leverandør/endepunkt + kill-switch | En feilkonfigurert base-URL er en lekkasje ingen ser |
| `F14-03` | Logg-policy + retensjonstid | Mekanismen finnes (`pruneEvents`), policyen mangler |
| `F14-04` | **AI Act art. 50-transparens i UI** | ⏰ **Lovpålagt fra 2. august 2026** |
| `F14-05` | Art. 9-vakt på fritekst | Det kjente hullet i AI-laget |
| `F14-06` | Compliance-artefakter generert fra kode | En manuelt vedlikeholdt dataflyt er utdatert innen tre måneder |

**Hovedfunn fra researchen:**

1. **Fireworks er sannsynligvis IKKE DPF-sertifisert.** Ikke funnet i DPF-lista, og deres egen
   personvernerklæring (§13) viser til **SCC/Model Clauses** — ikke DPF. ⚠️ DPF-lista er
   JS-basert og lot seg ikke lese maskinelt; **må sjekkes manuelt** før beslutning.
2. **ZDR er standard** for chat completions (det vi bruker). ⚠️ **Ikke** for «Response API»
   (`store=True` default, 30 dagers retensjon) — vi må aldri ta den i bruk uten å vurdere det.
3. **Ingen trening på våre data** uten opt-in — står skriftlig i personvernerklæringen.
4. Fireworks har **ISO 27001 + 27701 + 42001** (AI-styring) + SOC 2 Type II.
5. **AI Act art. 50 gjelder fra 2. august 2026** — chatbot må opplyse at den er en AI.

**Juridisk:** rolleavklaring behandlingsansvarlig/databehandler, DPA-er, TIA og DPIA er markert
**[ADVOKAT]** i dokumentet. Ingenting av dette er juridisk rådgivning.

---

## 2026-07-14 — TECHSTACK-ENDRING: Mistral (EU) inn ved siden av Fireworks

**Godkjent av:** Mikkis. **To LLM-leverandører, delt etter dataklasse.**

| Dataklasse | Leverandør | Region |
|---|---|---|
| **Sluttkundens fritekst** (kunde-support-agenten) | **Mistral** | EU |
| **Tenant-skopede driftsdata** (drifts-agenten) | **Fireworks** | Global |

**Oppdatert:** techstack §2 (AI-lag) + §5 (Eksterne tjenester), `.env.example`,
`docs/personvern/GDPR-og-AI-veikart.md`, roadmap (F14-02 og F14-05 → `progress`).

### Rutingregelen er KODE, ikke dokumentasjon

Hver agent erklærer `dataClass`. Hver provider erklærer `region`. `spawnAgent()` **nekter å starte**
en `customer_freetext`-agent mot en ikke-EU-leverandør. Samme sjekk i `runAgent()`, fordi en
sikkerhetsregel som bare gjelder den ene inngangen er ingen sikkerhetsregel.

**Begrunnelsen:** en feilkonfigurasjon her er ikke en bug man retter i neste sprint. Det er norske
kunders helseopplysninger sendt ut av EU. Den skal ikke kunne kompilere.

### ⚠️ Tre funn som IKKE var som antatt

1. **Mistral har et US-endepunkt.** «Fransk selskap» ≠ «EU-hosting» — det er base-URL-en som
   avgjør. Derfor `assertEuEndpoint()`: provideren **nekter å bli opprettet** mot
   `api.us.mistral.ai`.
2. **Trenings-opt-out er ikke helt entydig.** Docs sier «API brukes ikke til trening»;
   hjelpesenteret sier gratisbrukere må opt-oute manuelt. **Og «Labs models» overstyrer opt-out
   uansett plan** — den må stå av.
3. **ZDR hos Mistral er en SØKNAD, ikke en bryter.** Man må oppgi «legitimate reasons», og Mistral
   godkjenner «at our discretion». Uten ZDR: 30 dagers retensjon. **Fireworks har ZDR som standard,
   uten søknad** — et poeng i deres favør.

### Scope-gaten (F14-05) kjører i EU

`mistral-moderation-2603` — kategoriene `health`, `pii`, `law`, `selfharm` → eskaler til menneske
(F6-05). Bygget med audit-modus først, så vi kan måle falske positive før den blokkerer.

**Hvorfor Mistral Moderations og ikke regex:** regex tar ikke *«jeg har ryggprolaps og klarer ikke
løfte sykkelen»* uten å også ta hundre uskyldige setninger. Og gaten kjører i EU — en scope-gate
som selv måtte sende fritekst til USA for å avgjøre om den kunne sendes til USA, ville vært en
sirkel vi ikke kom ut av.

---

## 2026-07-14 — F14 blir COMPLIANCE-PORTVAKT (ikke en ny F15)

**Godkjent av:** Mikkis.

### Hvorfor utvidet F14 i stedet for å lage F15

F14 inneholdt allerede den **tekniske** halvdelen av compliance-arbeidet (pseudonymisering,
EU-assert, logg-policy, art. 50, scope-gate). En ny F15 med den **juridiske** halvdelen ville
splittet én portvakt over to faser — og en portvakt du kan gå forbi ved å hoppe til neste fase, er
ingen portvakt.

Én port, én fase. F14 er retitulert til:

> **⛔ COMPLIANCE-PORTVAKT (GDPR + AI Act) — INGEN PRODUKSJON FØR ALT ER GRØNT**

ID-ene er **beholdt** (F14-01…F14-06 er referert i flere rapporter), og ti nye er lagt til
(F14-07…F14-16). Rekkefølgen i fasen er endret så det som haster eller blokkerer kommer først —
IDs er stabile, rekkefølgen er prioritert.

### Sortering: hva som står øverst, og hvorfor

1. **F14-04** — 🔴 AI Act art. 50. **Hard frist 2. august 2026.** Eneste punktet med en dato satt
   av noen andre enn oss.
2. **F14-07** — ⛔ Rolleavklaring. **Blokkerer alle de andre juridiske punktene**: hvem som er
   behandlingsansvarlig avgjør hvem som signerer hvilken DPA og hvem som eier DPIA-en.
3. Deretter juridiske punkter (DPA-er, ZDR, TIA, DPIA, personvernerklæring).
4. Til slutt tekniske punkter vi lukker selv.

Hvert punkt er merket **[JURIDISK]** (krever advokat/motpart — kan ikke lukkes med kode) eller
**[TEKNISK]** (vi bygger).

### To punkter fortjener ekstra oppmerksomhet

- **F14-11 (Mistral ZDR) kan bli AVSLÅTT.** ZDR er en søknad, ikke en bryter. Punktet krever derfor
  en *dokumentert beslutning uansett utfall*: aksepterer vi 30 dagers retensjon hos en
  EU-databehandler, eller bytter vi?
- **F14-16 (sletterutine)** er nytt. **En sletterutine som stopper ved vår egen database er ikke en
  sletterutine.** Den må nå leverandørloggene også (Mistral 30 d uten ZDR, Fireworks metadata).

### Kryssreferanse

`docs/personvern/GDPR-og-AI-veikart.md` peker nå på F14, og F14-punktene peker tilbake på
veikartet. **Veikartet er *hvorfor*; F14 er *hva som må krysses av*.**

---

## 2026-07-14 — F14 bygget: sletterutine, retensjon, art. 50-merking, pseudonymisering

**Godkjent av:** Mikkis (grønt lys).

| ID | Var | Er |
|---|---|---|
| `F14-16` Sletterutine | planned | **done** |
| `F14-03` Logg-policy + retensjon | planned | **done** |
| `F14-04` Art. 50-merking | planned | **progress** — bygget, venter design-pass |
| `F14-01` Pseudonymisering | planned | **progress** — bygget, gjenstår å koble inn i `runAgent()` |
| `F4-15` **NYTT** | — | **planned** — `[ART50-UI]` design-pass når tokens er inne |

### `[ART50-UI]` — den søkbare markøren

Alt som berører AI Act art. 50-merkingen er merket med **`[ART50-UI]`**, på tre steder:

- **Roadmap:** F14-04 (implementasjon) og F4-15 (design-pass)
- **Kode:** `packages/ui/src/compliance/ai-disclosure.tsx`, `packages/ui/src/index.ts`,
  `apps/web/app/chat/page.tsx`

`grep -r "\[ART50-UI\]"` finner alt. Ingenting av dette skal bli glemt som «midlertidig» for alltid.

⚠️ **Skrevet inn i både kode og roadmap:** *du kan endre HVORDAN merkingen ser ut. Du kan ikke
fjerne AT den er der, og du kan ikke flytte den bort fra samtalestart. Det er ikke design, det er
lovtekst.*

### Sletterutinen — det som ikke lar seg slette

Rutinen når **alle** ledd, men behandler dem ulikt:

| Ledd | Hva skjer | Hvorfor |
|---|---|---|
| Meldinger, notater, stream-events, kunde | **Slettes** | Ingen grunn til å beholde |
| Booking, kjøretøy | **Anonymiseres** | Bokføringsloven. Vi fjerner personen fra transaksjonen, ikke transaksjonen fra regnskapet |
| `audit_log` | **Redakteres** via SECURITY DEFINER-funksjon | Append-only. App-rollen får aldri UPDATE — den *ber om* redaksjon, den utfører den ikke. **Redaksjonen blir selv en uslettelig rad i loggen den redigerte** |
| `erasure_requests` | **Slettes aldri** | Beviset på at vi slettet må overleve slettingen |
| **Mistral** | ⚠️ **Kan ikke slettes på forespørsel** | 30 dagers logg uten ZDR, og det finnes **ingen API** for å fjerne én enkelt prompt |
| **Fireworks** | Ingenting å slette | ZDR er standard — prompten finnes aldri på disk |

**Derfor rapporterer rutinen status `partial`, ikke `completed`, når leverandørlogger fortsatt har
data.** Å skrive «completed» når Mistral har prompten i 30 dager til, ville vært en løgn i et
dokument vi selv laget for å bevise at vi er til å stole på.

### Retensjonspolicyen er kode

`RETENTION_POLICY` i `packages/modules/src/retention/policy.ts`: tabell, retensjonstid, grunnlag,
**begrunnelse**, tilgangskontroll og `delete | redact` — per tabell. En test feiler hvis en regel
mangler begrunnelse: *en retensjonstid uten begrunnelse er en gjetning.*

Ryddes av Vercel Cron (`/cron/retention`, 04:00), gjennom `withTenant` → RLS. Jobben har ingen
global slette-tilgang og kan ikke tømme feil forhandler.

### Pseudonymisering — ærlig om hva den er

E-post, telefon og regnr → `[EPOST_1]`, `[TLF_1]`, `[REGNR_1]`. Stabile plassholdere (samme verdi →
samme plassholder, så modellen kan resonnere om «samme kunde»), `unmask()` før mennesket ser svaret.

⚠️ **Dette gjør ikke dataene anonyme** (art. 4(5)) — vi holder kartet, altså kan vi
re-identifisere. Det er **dataminimering** (art. 5(1)(c)), ikke anonymisering. Kartet lever kun i
minnet: *et pseudonymiseringskart på disk er en gjenidentifiseringsnøkkel med et pent navn.*

---

## 2026-07-14 — 30-dagers-språk i veikartet + F14-17 offentlig personvernerklæring

**Godkjent av:** Mikkis.

### 1. 30-dagers-formuleringen (GDPR-veikart §4b, nytt)

Utkast til ordlyd, klar til advokat: **når en kunde ber om sletting, slettes/anonymiseres alt hos
Endwise umiddelbart, mens innhold i AI-leddet (Mistral, uten ZDR) kan ligge i inntil 30 dager før
det slettes automatisk.**

Dette matcher **nøyaktig** hvordan sletterutinen (F14-16) oppfører seg — den returnerer status
`partial`, ikke `completed`, av samme grunn. Koden og teksten sier det samme. Modellen er
Dara-modellen: vi opplyser + setter frist, vi unngår ikke problemet.

Får vi ZDR innvilget hos Mistral (F14-11), faller hele 30-dagers-halen bort — notert i §4b som
den beste grunnen til å prioritere den søknaden. **Endelig ordlyd skal kvalitetssikres av advokat.**

### 2. NYTT PUNKT F14-17 — offentlig personvernerklæring

Skilt fra F14-15 med vilje:

| ID | Hva |
|---|---|
| **F14-15** | Personvernerklæring + **subprosessorliste** — compliance-artefaktene (kan være mer teknisk/intern-orientert) |
| **F14-17** | Det **offentlige, brukervendte åpenhetsdokumentet** som *publiseres og vises til sluttbrukerne* — à la meetdara.no/dpa |

F14-17 skal minst dekke: personopplysninger som behandles, behandlingsgrunnlag, underdatabehandlere
**med land/region** (Mistral EU, Fireworks USA, Neon EU, Vercel fra1/EU, Resend, Twilio, Vegvesen),
overføring utenfor EØS + grunnlag, retensjon **inkl. 30-dagers AI-halen**, de registrertes
rettigheter + hvordan de utøves, og AI-bruk (art. 50).

**Merket [JURIDISK]** — innholdet må til advokat — men **vi lager utkastet og strukturen selv.**
Kryssreferert til F14-04 (art. 50), F14-15 (subprosessorliste) og F14-16 (sletting/30-dagers-hale).

Veikartets kryssreferansetabell er oppdatert med F14-17.

---

## 2026-07-15 — Admin-UI bygget: mørkt tema, grønn aksent, dither AKTIVT

**Godkjent av:** Mikkis
**Endring:** Statusoppdateringer etter at det ekte admin-dashboardet ble bygget:

| ID | Punkt | Var | Er |
|---|---|---|---|
| F0-11 | `@endwise/widget-tokens` (token-verdier) | `progress` | `done` |
| F0-12 | `@endwise/ui` v0 primitiver | `progress` | `done` |
| F5-01 | Next.js admin-skall + sidebar-nav | `planned` | `progress` |
| F5-10 | Dashboard-designsystem (dither AKTIVT) | `planned` | `progress` |

**Beslutninger (brukergodkjent):**
- **Mørkt tema som standard.** Ingen Claude Design — vi bruker tokenene fra TheFolds
  `docs/layout-copy/globals.css` som base (svart side, `#151515` surface), med vår grønne
  `#1ED27D` som aksent i stedet for deres hvite. Lyst tema beholdt som toggle.

**Hva ble bygget:**
- Token-verdier satt i `packages/widget-tokens/src/tokens.css` (mørk default + lys toggle),
  mappet til shadcn-semantikk i `packages/ui/src/theme.css`.
- Admin-shell i `apps/web/app/(app)/`: transparent topbar (56px, SSE-pille/søk-⌘K/tema-toggle/
  varsler/profil), floating glass-sidebar (60↔240px uten reflow), 8px gutter. Bygget av shadcn
  `Button` + `@endwise/ui`-ikoner (kuratert lucide-barrel) + beUI-disiplin — ikke TheFolds kode.
- Admin-oversikt (`/dashboard`) med **dither-kit AKTIVT**: stablet `AreaChart` (`bloom="aura"`)
  som bærende element, `Sparkline` som KPI-kortbakgrunn og som rad-trend i forhandlerlista.
  Seed-data, ekte visualiseringer. Nav-punktene er verksted/forhandler-domenet (ikke TheFolds
  byrå-domene).

**Hva dette IKKE er:** ingen endring i techstacken. Ingen ny UI-pakke tatt inn (icons.ts er kun en
re-eksport av eksisterende `lucide-react`). F5-10 er `progress`, ikke `done` — AI Elements,
slot-text-KPI, forhandler-shell og container-queries gjenstår. Typografi (font/skala) er fortsatt
uavklart.

**Verifisert:** typecheck (web + ui + widget-tokens) ✓ · Biome ✓ · `next build` ✓ (`/dashboard`
prerendret). Ikke pushet.

---

## 2026-07-15 — Typografi satt: Plus Jakarta Sans (åpen erstatning for Google Sans)

**Godkjent av:** Mikkis (ba om «Google Sans»)
**Beslutning:** Google Sans er verifisert mot kilden (fonts.google.com / fonts.googleapis.com) og
er Googles **proprietære merkevarefont** — ikke en fritt embeddbar OFL-webfont for
tredjepartsprodukter, og `next/font/google` har den ikke. `Google Sans Flex` er publisert, men
samme merkevarefamilie. **Google Sans ble derfor IKKE tatt i bruk.**

**Valgt:** `Plus Jakarta Sans` (OFL) som `--font-sans` — nærmeste åpne, next/font-støttede
erstatning (geometrisk-humanistisk, rund, Google-Sans-lignende). `JetBrains Mono` (OFL) for mono.
Begge via **`next/font/google`** (selvhostet, ingen FOUT/layout-shift). Typeskala fastsatt (se
`docs/UI-PAKKER.md` §5 «✍️ Typografi»).

**Rørlegging:** `apps/web/app/layout.tsx` (next/font) → `--font-plus-jakarta`/`--font-jetbrains-mono`
på `<html>` → `--ew-font-sans/-mono` (tokens.css) → shadcn `--font-sans/-mono` (theme.css).

**Ikke techstack-endring.** Bytte til ekte Google Sans senere = kun `layout.tsx` + de to
`--ew-font-*`-verdiene.

**Verifisert:** `next build` ✓ (font-woff2 selvhostet, `<html>`-tag får variabel-klassene,
`/dashboard` prerendret). typecheck ✓ · Biome ✓. Ikke pushet.

---

## 2026-07-15 — Font byttet til Google Sans Flex (OFL verifisert)

**Godkjent av:** Mikkis (ba om Google Sans Flex, med krav om lisenssjekk først)
**Lisenssjekk (kilde: Google Fonts metadata-endepunkt):** Google Sans Flex er publisert med
**`"license": "ofl"`** og **`"isOpenSource": true`** — SIL Open Font License, fritt embeddbar for
kommersiell tredjepartsbruk. (Til forskjell fra «Google Sans» uten Flex, som er proprietær og
ikke i OFL-katalogen.)

**Endring:** `--font-sans` byttet fra Plus Jakarta Sans (forrige økts åpne erstatning) til
**Google Sans Flex** — det brukeren egentlig ville ha, nå bekreftet lisenskurant. Variabel font
(hele wght-aksen 1–1000), subsets `latin` + `latin-ext`. Lastes via **`next/font/google`** (finnes
i Next 16-katalogen, `font-data.json`) — selvhostet ved build, ingen runtime-import fra Google.
JetBrains Mono (OFL) beholdt for mono. Typeskala og token/theme-rørlegging uendret; bare
fontfamilien + variabelnavnet (`--font-google-sans-flex`) byttet.

**Ikke techstack-endring.** `next/font/google` var allerede i bruk.

**Verifisert:** `next build` ✓ (16 woff2 selvhostet, `<html>`-tag får `google_sans_flex_…_variable`,
`/dashboard` prerendret). typecheck ✓ · Biome ✓. Ikke pushet.

---

## 2026-07-16 — Tre runtime-feil fra `pnpm dev` fikset (motion, @endwise/auth, sirkulær agent-avhengighet)

**Meldt av:** Mikkis (kjørte `pnpm dev` lokalt; `next build`/typecheck i sandkassen fanget dem ikke)

**1. `Can't resolve 'motion/react'` (blokkerte web).** Rotårsak: `motion` var deklarert i
`packages/ui`, men Next transpilerer `@endwise/ui`-KILDEKODEN i **appens** resolusjonskontekst, og
`apps/web` deklarerte ikke `motion` → `motion/react` uløsbar derfra. (Sandkassens `next build`
skjulte det: tree-shaking droppet motion-modulene fra F0-sidene; `dev` bygger hele barrel-en.)
**Fiks:** `motion@^12.42.2` lagt inn i `apps/web` dependencies. Verifisert: `require.resolve('motion/react')`
fra apps/web-kontekst løser nå. Dokumentert i UI-PAKKER.md §5.

**2. `ERR_MODULE_NOT_FOUND: @endwise/auth` i apps/stream + apps/api.** Diagnose: kilden er korrekt —
`@endwise/auth` er deklarert i begge apper, `exports`/`main` peker riktig, og pakken importeres
FEILFRITT via ESM (`node --experimental-strip-types`) fra begge apper i en ren install. Altså **ikke
en kildefeil**, men en utdatert/ufullstendig lokal `node_modules` (apps ble lagt til etter forrige
install hos brukeren). **Remedie:** `pnpm install`. Lockfilen er dessuten oppdatert i denne økta
(motion/guardrails/agents), så en reinstall trengs uansett og fikser samtidig auth-symlenken.
Audit: alle apper (web/api/stream/framer-agent) deklarerer nå alle `@endwise/*` de faktisk importerer.

**3. Sirkulær avhengighet `@endwise/agent-runtime ↔ @endwise/agents`.** Rotårsak: `agents` →
`agent-runtime` (prod, typer + kjøring), og `agent-runtime` → `agents` (devDep) fordi to
integrasjonstester i agent-runtime importerte konkrete agent-definisjoner. **Fiks:** testene flyttet
til `packages/agents/test/` (toppen av avhengighetskjeden), og importerer nå runtimen via dens
offentlige API (`@endwise/agent-runtime`). `@endwise/agents` fjernet fra agent-runtime devDeps;
`@endwise/guardrails` lagt til agents devDeps (testene bruker den). (De gamle agent-runtime-testfilene
kunne ikke slettes i dette miljøet — de er erstattet med `it.todo`-stubber som peker til ny plassering.)
Verifisert: pnpm/turbo rapporterer ikke lenger syklisk avhengighet.

**Verifisert i sandkassen:** frozen install ✓ (lockfile == manifester), ingen syklisk warning,
typecheck (web/ui/agent-runtime/agents) ✓, Biome ✓, `next build` ✓ (/dashboard), moduloppløsning av
`motion/react` (apps/web) + `@endwise/auth` (stream+api) ✓.
**IKKE verifisert i sandkassen (Node 22 vs brukerens Node 26):** faktisk oppstart av dev-serverne
og kjøring av DB-integrasjonstestene (krever Postgres). Bruker må kjøre `pnpm install` + `pnpm dev`.
Ikke pushet.

---

## 2026-07-16 — Admin-shell rettet mot EKTE TheFold V2-fasit (ny referanse)

**Godkjent av:** Mikkis (ga tilgang til `C:\Users\mikae\Desktop\Twofold\TheFold\Dev\v2`)

**Hvor vi bommet sist:** Forrige admin-shell ble stylet ut fra `docs/layout-copy/globals.css`
(TheFolds LEGACY brand-tokens: `#000` side, `#151515` kort, HVIT aksent) + de gamle
`sidebar.tsx`/`top-bar.tsx`. Men det EKTE shellet i referanseprosjektet er
`apps/web/src/app/(main)/_shell/app-shell.tsx`, som overstyrer globals med en LOKAL `C`-palett via
inline-styles. `globals.css` var altså ikke representativt — den lokale paletten er fasiten.

**Fasit (TheFold V2 `C`):** flater `#1a1a1a` (side = topbar = sidebar), kort `#141414`, kant/hover/
active `#262626`, tekst `#fff` / `#a1a1a1` / `#7e7e7e`. Sidebar er en SOLID statisk 216px-kolonne
(ingen glass, ingen collapse) med borderRight, gruppert flat nav + bunn-forankret profilrad. Topbar
er 56px med borderBottom og KUN logoen + søk.

**Endringer i vårt repo:**
- **Palett (`tokens.css`):** `#000/#151515/hvit-kant` → `#1a1a1a/#141414/#262626`, muted `#a1a1a1`,
  faint `#7e7e7e`. Grønn `#1ED27D` beholdt som aksent (TheFold hadde provisorisk blå `#3b82f6`).
- **Topbar:** «Endwise»-wordmarken **fjernet** — nå KUN logoen (32px, vist i sin grønne farge, ikke
  invertert) + søk-ikon. SSE-pille/tema-toggle/bell/profil fjernet fra topbaren.
- **Sidebar:** glass-rail + collapse **erstattet** med solid statisk 216px-kolonne, flate nav-rader
  (13px, grått ikon, active/hover `#262626`), gruppert (hovednav → «Administrer»), bunn-profilrad
  (Mikkis · Admin + innstillinger), som fasiten.
- **Layout:** topbar + rad(sidebar + `<main>` som scroller); gutteren fjernet (content flush).
- Logoen vises grønn (fjernet `.logo-invert`-bruk). `Settings`-ikon lagt til ikon-barrel-en.

**Beholdt (teknisk):** Google Sans Flex, dither-kit (KpiCard/AreaChart/Sparkline tar automatisk nye
kort-farger via token-laget), shadcn + beUI, mørkt tema som default, grønn logo `#1ED27D`.

**Verifisert:** typecheck (web/ui/widget-tokens) ✓ · Biome ✓ · `next build` ✓ (`/dashboard`
prerendret). Wordmark bekreftet fjernet (kun logo i topbaren). Ikke pushet.

---

## 2026-07-16 — Admin-UI-runde 2 + feature-flags flyttet fra Vercel Edge Config til DB

**Godkjent av:** Mikkis

**UI (mot TheFold V2-fasit):**
- **Dither tilbake på `/dashboard`:** KPI-kortene fikk tydeligere dither-sokkel (full opasitet,
  høyere, aura-bloom) mot #141414; bærende `AreaChart` (aura) + forhandler-rad-`Sparkline` står som
  før. Dither var aldri fjernet fra koden, men ble for svakt synlig på den nye mørke paletten.
- **Hovednav flyttet til topbaren** (TheFold `TopLink`-stil: 13px, grått ikon, active/hover #262626):
  Oversikt · Bookinger · Kalender · Mekanikere · Kunder · Kjøretøy · Tjenester. `_shell/nav.ts` er
  delt kilde.
- **Sidebar forenklet:** «Administrer»-gruppen fjernet (fjernet den ENE av to innstillinger-knapper;
  gear-knappen i profilraden beholdt). Lagt inn **Support split-card** (`_shell/cards.tsx`,
  TheFold-kortstil, dither-gradient-header + **bevel**-knapp «Åpne kanal»).
- **Admin-knapp i topbaren, rollestyrt** via ny `_lib/use-org-role.ts` (speiler TheFolds
  `useOrgRole`-kontrakt). ⚠️ Web har ikke auth-client/tRPC wired ennå, så hooken bruker en
  midlertidig `MOCK_IS_ADMIN` til sesjonsrollen (F1-05: dealer_admin/endwise_admin) kan leses.
  EKTE håndheving er server-side (`adminProcedure`).
- Bevel-knappestil (`BEVEL`) lånt fra TheFold og delt via `_shell/cards.tsx`.

**Feature flags — techstack-endring (Vercel Edge Config UT som betalt avhengighet):**
- **Pris bekreftet mot kilden:** `flags`-SDK er gratis/OSS; det er **Edge Config-LAGRINGEN** som
  koster. Hobby: 100k lesninger + 100 skrivinger/mnd gratis. Pro (per enhet, endret sent 2025):
  **$0,000003/lesning, $0,01/skriving** (Vercel changelog + docs).
- **Løsning:** DB-basert flagg-tjeneste. Ny `feature_flags` (global av/på) + `feature_flag_overrides`
  (per-tenant, RLS) i Postgres. Ny `flags`-tRPC-ruter: `resolve`/`list` + rollestyrt skriving
  (`setGlobal`/`upsert` = endwise_admin, `setOverride` = dealer/endwise-admin). `apps/web/flags.ts`
  skrevet om — `@flags-sdk/edge-config` + `flags` FJERNET fra web-deps; nå et typet flagg-register
  med fail-safe defaults, leses via `trpc.flags.resolve` når web-klienten wires.
- Flagg-KONSEPTET beholdt (release-toggles ≠ entitlements). Techstack §«Vercel hele veien» + Døde valg
  oppdatert.

**Gjenstår (forutsetning, samme som data-sidene):** web-tRPC/auth-client — låser opp ekte flagg-
resolve, ekte rollesjekk, og admin-flaggpanel. DB-migrasjon for `feature_flags` genereres/kjøres av
bruker (`pnpm db:generate` + `db:migrate` mot Docker).

**Verifisert i sandkassen:** typecheck (web/api/db/ui/widget-tokens) ✓ · Biome ✓ · `next build` ✓
(`/dashboard` prerendret). Dither-visning må bekreftes i `pnpm dev` (canvas rendrer klient-side).
Ikke pushet.

---

## 2026-07-16 — To-nivå-nav + ROTÅRSAK til usynlig dither funnet & fikset

**Godkjent av:** Mikkis

**1. Dither-rotårsak (endelig, ikke gjetting):** Tailwind v4 i `apps/web` skannet IKKE
`packages/ui/src`. Utility-klasser som brukes KUN inne i `@endwise/ui` ble derfor aldri generert.
Bevist mot bygget CSS: `absolute`/`w-full`/`h-24` (brukt i apps/web) var med, mens `h-full`,
`overflow-visible`, `fill-current`, `stroke-border` (kun i dither-kit) MANGLET. dither-kit sin
`AreaChart`-rot er `relative h-full w-full` — uten generert `h-full` kollapset chart-containeren til
**0 høyde**, så canvasen tegnet i ingenting. Derfor hjalp det ikke å skru opp opasiteten.
**Fiks:** `@source "../../../packages/ui/src/**/*.{ts,tsx}"` i `apps/web/app/globals.css`. Bygget CSS
gikk 27 335 → 42 090 bytes, og alle fire klassene er nå med. (Dette fikset samtidig ALLE @endwise/ui-
komponenters styling, ikke bare dither.) Lærdom: `next build` grønt ≠ CSS-klasser finnes — dette
fanges verken av typecheck eller build.

**2. To-nivå-navigasjon (rettet fra forrige runde der alt lå i topbaren):**
- **Topbar = seksjoner** (Oversikt · Booking · Verksted · Support · Admin[rollestyrt]).
- **Sidebar = underpunktene for AKTIV seksjon.** Booking → Ny booking · Bookinger · Kalender (brukerens
  fasit). Verksted → Kunder · Kjøretøy · Mekanikere · Tjenester. Admin → Forhandlere · Moduler ·
  Feature-flags · Aktivitetslogg.
- Styrt av ÉN datastruktur (`_shell/nav.ts` → `SECTIONS` + `resolveActiveSectionKey`). Flytt en rad
  for å flytte en side; legg til et objekt for en ny seksjon. Ingenting annet må endres.
- (TheFolds ekte shell bruker en horisontal `secondary`-bar for undernav med statisk sidebar; vi
  fulgte brukerens eksplisitte master/detail-modell i stedet.)
- Placeholder-sider opprettet for alle rutene (`_components/placeholder.tsx`) så navigasjonen holder
  seg inne i shellet (ikke 404 utenfor). 17 ruter prerendrer.

**Verifisert:** typecheck (web) ✓ · Biome ✓ · `next build` ✓ (17 ruter) · dither-klasser bekreftet i
bygget CSS ✓. Visuell dither-rendering bør bekreftes i `pnpm dev`, men rotårsaken er nå fjernet og
bevist i CSS-output. Ikke pushet.

---

## 2026-07-16 — Admin/forhandler-shell: 5-seksjons taksonomi, kortstil-fiks, shadcn Badge, Marked

**Godkjent av:** Mikkis

**1. Ny topbar-taksonomi (5 seksjoner)** — erstatter Oversikt/Booking/Verksted/Support/Admin:
`Forhandler · Mekaniker · Marked · Integrasjoner · Admin` (Admin rollestyrt). ALL booking ligger nå
under **Forhandler**. Én datastruktur (`_shell/nav.ts` → `SECTIONS`) styrer topbar-seksjoner +
sidebar-underpunkter (to-nivå). Placeholder-sider for alle nye ruter (28 ruter prerendrer). Fullt
seksjonstre står i rapporten.

**2. shadcn Badge + New-badge** — hentet inn `packages/ui/src/components/badge.tsx` (canonical shadcn,
variant default/secondary/destructive/outline); erstatter den gamle primitiv-Badgen i eksporten
(F0-12-notat: «shadcn dekker dem»). `NewBadge` (gjenbrukbar, rød gjennomsiktig `bg-danger/12` +
`text-danger`, tekst «New») ligger i `_shell/cards.tsx` og vises på nye nav-punkt/seksjoner.

**3. Marked-seksjon** — `Framer-agent` (chat-ramme mot `@endwise/framer-agent`, Hono :3003; POSTes dit
når klienten wires, env `NEXT_PUBLIC_FRAMER_AGENT_URL`), `Nyhetsbrev` (skjema, utsending via Resend
F3-04 senere), + Kampanjer/Innhold (placeholder).

**4. Kortstil fikset (TheFold-fasit)** — `_shell/cards.tsx` fikk `CardShell` (ytre kort, radius 12,
5px padding, kant) + `CardMedia` (indre panel, radius 8, mørk inset-flate) = **dobbel kant**. KpiCard
er bygget om: **dither-graf ØVERST i indre panel, tall/etikett i EGEN tekstdel UNDER** — ikke lenger
tekst oppå canvas. SupportCard bruker samme mønster.

**Beholdt:** Google Sans Flex, mørkt tema, grønn logo #1ED27D, @source-fiksen (dither-klasser
genereres fortsatt — verifisert i bygget CSS), dither bærer aldri info alene.

**Verifisert:** typecheck (web/ui) ✓ · Biome ✓ (fikset også en pre-eksisterende array-key-lint i
chat/page.tsx) · `next build` ✓ (28 ruter) · dither- + danger-klasser bekreftet i bygget CSS. Ikke pushet.

---

## 2026-07-16 — GDPR: Vercel Web Analytics + Stripe underprosessorer · Endwise-admin oversikt

**Godkjent av:** Mikkis

**1. GDPR-veikart (`docs/personvern/GDPR-og-AI-veikart.md`):**
- Ny seksjon **§8b Underdatabehandlere (subprosessorliste)** — full tabell (Vercel, Neon, Resend,
  Twilio, Fireworks, Mistral) + de to nye:
  - **Vercel Web Analytics** 🆕 — cookieless/anonymisert (hash nullstilles daglig, ingen
    krysssporing, ingen PII). Samler KUN inn på Vercel-deploy (ikke localhost). Lav byrde, men
    Vercel-hostet → listet.
  - **Stripe** 🆕 — betalings-/personopplysninger, US-selskap m/ EU-entitet, SCC + **PCI-DSS**.
    Kortdata lagres aldri hos oss (Stripe-scope).
- Nye F14-punkter: **F14-18** (Web Analytics personvernkonfig) + **F14-19** (Stripe DPA/SCC/PCI-DSS).

**2. Techstack/roadmap:**
- **Stripe var ALLEREDE i techstacken** (§leverandører + `tools/toolkits/stripe` + F5-09
  «Stripe Billing → entitlements»). Ikke et nytt stack-valg — men nå formalisert som GDPR-
  underdatabehandler. Integrasjonen (abonnement + webhooks) = eksisterende **F5-09**.
- **Vercel Web Analytics** er genuint nytt: lagt i techstack §leverandører + roadmap **F13-02**
  (oppsett, deploy-avhengig) + F14-18 (personvern).

**3. Endwise-admin oversikt (ny side):**
- Plassert som **Admin-seksjonens landingsside `/admin` = «Endwise-oversikt»** (endwise_admin,
  rollestyrt). «Forhandlere» flyttet til `/admin/forhandlere`. Distinkt fra forhandlerens egen
  **Forhandler→Oversikt** (`/dashboard`), som beholdes uendret.
- Innhold, ny kortstil (dither øverst / tekst under / dobbel border), New-badge:
  - **Inntekt (Stripe)** — MRR/ARR/omsetning/abonnement (KPI-kort) + MRR-arealgraf. **MOCK** til
    Stripe koblet.
  - **Web Analytics** — besøkende/sidevisninger/unike/avvisning + topp-sider + referrers. **MOCK**
    (kun på deploy).
  - **Booking (aggregert)** — total/belegg/forhandlere/avlyste + booking-flyt-arealgraf. **EKTE
    backend** (bookings-ruteren), seed til web-tRPC-klienten wires.

**Verifisert:** typecheck (web) ✓ · Biome ✓ · `next build` ✓ (31 ruter, `/admin` + `/admin/forhandlere`)
· dither- + danger-klasser bekreftet i bygget CSS. Ikke pushet.

---

## 2026-07-16 — F5-09: Stripe forhandler-selvbetjent abonnement + entitlements + integrasjoner

**Godkjent av:** Mikkis · **Korrigering:** Stripe er FORHANDLER-vendt selvbetjent abonnement (ikke
bare et internt inntektspanel). Modell: **plan → recurring Stripe-charge → entitlements
(tenant_modules) → forhandleren selvbetjener integrasjonene sine, gated av planen.**

**Stripe-docs:** hentet offisielt via context7 (`/stripe/stripe-node`): `checkout.sessions.create({
mode:'subscription' })`, `billingPortal.sessions.create`, `webhooks.constructEvent` (signatur).

**Backend (typechecker):**
- `packages/db/schema/billing.ts` — `billing_customers` (per-tenant, RLS): stripe-kunde/-abonnement,
  plan, status, periodeslutt.
- `packages/modules/billing` — plan-katalog (`PLANS`, `INTEGRATIONS`, `modulesForPlan`,
  `planForPriceId`) + `createBillingService(db)`: `getState`, `applyPlan` (synk tenant_modules),
  `setModuleEnabled` (kaster `NotEntitledError` hvis planen ikke gir tilgang), `setStatus`,
  `getStripeCustomerId`. ALT via `withTenant` → RLS.
- `apps/api`: `stripe`-dep (^19.1.0), `lib/stripe.ts` (lat klient, mock uten nøkkel),
  `trpc/routers/billing.ts` (`plans`/`subscription`/`integrations` protected; `checkout`/`portal`/
  `setIntegration`/`applyPlanMock` **adminProcedure**), `routes/stripe-webhook.ts` (signatur­verifisert,
  finner tenant via metadata → oppdaterer entitlements). Vi utfører ALDRI trekk — checkout returnerer
  en URL forhandleren fullfører selv.

**Sikkerhet:** `packages/modules/test/billing.test.ts` — cross-tenant-angrepstester (A ser/endrer
ikke B sitt abonnement/entitlements; RLS WITH CHECK blokkerer skriving for B; `NotEntitledError` for
ikke-eide moduler). Skippes uten DB (kjør mot Docker), kompilerer + skipper rent i sandkassen.

**UI (mock til web-tRPC-klient + Stripe-nøkler):**
- **Forhandler → «Abonnement»** (`/abonnement`): planer, nåværende plan/status/neste trekk,
  «Administrer i Stripe» (Customer Portal). Ny kortstil + New-badge.
- **Integrasjoner → «Oversikt»** (`/integrasjoner`): forhandler-selvbetjent av/på per integrasjon,
  **gated av plan** — låst (Lock + «Krever [plan]» + lenke til Abonnement) når planen ikke gir tilgang.
- Admin-inntektspanelet (Endwise-oversikt) beholdt som aggregert oversikt.

**F5-09 status:** planned → **progress**. **Trenger for å bli levende:** `STRIPE_SECRET_KEY` +
`STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_*` (lagt i `.env.example`), webhook-endepunkt registrert i
Stripe, og web-tRPC-klienten. **Verifisert:** typecheck (api/modules/db/web) ✓ · Biome ✓ · `next build`
✓ (33 ruter) · billing-test kompilerer/skipper ✓. Ikke pushet.

---

## 2026-07-16 — F1: web-auth + tRPC-klient wiret · rollegating · demo-seed · mekanikerens «Min dag»

**Godkjent av:** Mikkis · Docs: Better-Auth + tRPC v11 hentet via context7.

**1. Auth/tRPC-wiring (forutsetningen som hang):**
- **apps/api:** `createRequestContext(headers)` resolver Better-Auth-sesjon mykt → userId/tenantId
  (activeOrganizationId)/rolle (assertMember). tRPC-context bruker den. Ny `session.me` + `mechanic`-
  ruter. `AppRouter`-type eksportert (`@endwise/api/router`).
- **apps/web:** Better-Auth React-klient (`lib/auth-client.ts`, organization+twoFactor-plugin) + tRPC
  v11-klient (`lib/trpc.ts` + `app/providers.tsx`) i root-layout. `useOrgRole` leser ekte
  sesjonsrolle via `trpc.session.me`. **Next rewrites** proxer `/api/auth/*` + `/trpc/*` til apps/api
  (:3001) → same-origin sesjonscookie.

**2. Innlogging/utlogging (F1-02 → progress):** `/signin` (e-post/passord for DEMO-kontoer; produksjon
= telefon-OTP + obligatorisk e-post-2FA er uendret). Logg ut i sidebar-profilraden. Demo-kontoene har
2FA AV + verifisert e-post via seed (dev-only).

**3. Demo-seed (`pnpm db:seed`, dev-only, `apps/api/scripts/seed.ts`):** endwise_admin (mikkis@twofold.no),
dealer_admin/staff/mekaniker i «Verksted A», dealer_admin i «Verksted B» + kunder/kjøretøy/tjeneste/
dagens bookinger + mekaniker-kompetanse (én sertifisering utløper snart). Passord: `endwise-demo-1`.

**4. Rollegating (F1-05, UI-kosmetikk oppå server-håndhevingen):** topbar-seksjoner + landing filtreres
på sesjonsrollen (`sectionsForRole`/`landingForRole` i nav.ts). Mekaniker (dealer_staff + mekaniker-
profil) ser KUN «Min dag»; dealer_staff = drift uten abonnement/integrasjoner; dealer_admin = +marked/
integrasjoner/abonnement; endwise_admin = alt inkl. Endwise-oversikt. Den EKTE sperren er
adminProcedure/RLS.

**5. Mekanikerens «Min dag» (F7):** dagens jobber (ekte `bookings`, scopet til innlogget mekaniker via
mechanics.userId + RLS), detalj m/ statusknapper (Start→in_progress, Ferdig→completed er ekte booking-
transitions; «Mangler deler/Venter» er placeholder — mangler hold-status i enumen), sertifiseringsvarsel,
Min kompetanse.

**Sikkerhet:** `packages/auth/test/membership-gate.test.ts` — bruker som ikke er medlem av en tenant får
`TenantAccessError` (kan ikke «claime» en annen tenant). Sammen med billing-/f2-isolasjon (RLS) dekker
det «mekaniker ser ikke andre tenants» + «rolle-gating kan ikke omgås». Skippes uten DB.

**Verifisert i sandkassen:** typecheck (web/api/auth/modules/db) ✓ · Biome ✓ · `next build` ✓ (36 ruter,
inkl. /signin + /min-dag) · seed + sikkerhetstester kompilerer/skipper ✓.
**Trenger Docker + begge dev-servere for å KJØRE:** `pnpm db:up && pnpm db:seed`, deretter `pnpm dev`
(web :3000 + api :3001). Ikke pushet.

---

## 2026-07-16 — Build-fiks (tRPC-peers) + mapcn/MapLibre live-globe på Marked

**Godkjent av:** Mikkis

**1. Build-feil fikset (samme klasse som motion-saken):** tRPC v11-klienten fra forrige runde manglet
peers i `apps/web`. `@tanstack/react-query` sto på `^5.62.0` — UNDER `@trpc/react-query` sin peer
`^5.80.3` — og **`@trpc/server` var ikke deklarert i det hele tatt** (også en peer). Fikset:
`@tanstack/react-query` → `^5.80.3`, lagt til `@trpc/server` `^11.18.0`. `@trpc/client` +
`@trpc/react-query` var allerede der. `next build` grønt.

**2. mapcn/MapLibre «Live besøkende»-globe på Marked:**
- Ny pakke **`maplibre-gl`** (open-source kartmotor, ingen API-nøkkel, mørk innebygd). mapcn er en
  shadcn-wrapper OVER MapLibre; mapcn.dev + GitHub var utilgjengelig ved bygging (web_fetch-timeout),
  så globen er skrevet direkte på MapLibre GL i mapcn-ånd. Den offisielle wrapperen kan hentes senere
  (`npx shadcn@latest add https://mapcn.dev/maps/map.json`). Notert i UI-PAKKER.md (kilde + lisens:
  MapLibre GL = BSD-3-Clause, mapcn = MIT).
- **Marked → «Live besøkende»** (`/marked/live`, New-badge): mørkt globe-kart (globe-projeksjon) med
  grønne prikker for besøkende + «X ser på nå»-teller. Vår kortstil (dobbel kant), grønn aksent.
- **Data:** SIMULERT nå (`_visitors.ts`), men strukturert for SSE — bytt `subscribeVisitors`-body til
  en `EventSource('/stream/visitors')` (apps/stream, F4-14/F11) UTEN å røre globe-komponenten.
  Kontrakten (VisitorEvent + subscribe→unsubscribe) er den samme.

**Verifisert:** typecheck (web) ✓ · Biome ✓ · `next build` ✓ (37 ruter, inkl. /marked/live) ·
dither-klasser fortsatt i CSS (@source holder). Ikke pushet.

---

## 2026-07-17 — Runtime-krasj (Node strip-only + env) + peer-dep-opprydding

Utløst av `pnpm dev`-krasj på Node 26 og peer-advarsler i `pnpm install`.

### 1. Node strip-only-krasj (KRITISK) — TS parameter properties
`node --experimental-strip-types` (dev-runneren for api/stream/framer-agent, og
kjøremålet på Node 26) støtter **ikke** TS «parameter properties»
(`constructor(readonly x: T)`) — de krever kodegenerering, ikke bare type-blanking.
`tsc` godtok dem, så typecheck fanget det ALDRI; det krasjet først ved kjøring.

Valg: gjøre KODEN strip-only-trygg (ikke bytte til `tsx`), fordi native Node-TS ER
kjøremålet. Konvertert **6 parameter-property-konstruktører** i **5 filer** til
eksplisitt felt + tilordning:
- `packages/guardrails/src/types.ts` (GuardrailViolation: `level`)
- `packages/guardrails/src/scope-gate.ts` (ScopeGateViolation: `categories`)
- `packages/modules/src/entitlements.ts` (EntitlementError: `moduleKey`)
- `packages/modules/src/billing/index.ts` (NotEntitledError: `moduleKey`)
- `packages/modules/src/booking/lifecycle.ts` (InvalidTransitionError: `from`, `to`)
- `packages/tools/toolkits/vegvesen/src/client.ts` (VegvesenError: `status?`)

Ingen TS `enum`/`const enum` i runtime-kode (skannet — null treff).

**Reprodusert i sandkassen (uten Docker):** importerte hver fil under
`node --experimental-strip-types` → alle `PARSE_OK` (tidligere
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Entrypunktene (api/stream/framer) parser nå
hele grafen; de feiler først på DB/env, ikke på parsing.

### 2. `@endwise/stream` — «APP_DATABASE_URL mangler»
Rotårsak: **dev-scriptene lastet aldri `.env`.** Node auto-laster ikke .env, det
fantes ingen dotenv-import, ingen `--env-file`, og ingen rot-`.env`. Stream kastet
bare først; api ville truffet «DATABASE_URL mangler» etter param-property-fiksen.
Env-navnene er allerede konsistente (to-rolle-modell: `DATABASE_URL` = eier,
`APP_DATABASE_URL` = app-rolle/RLS) og stream falt allerede tilbake
`APP_DATABASE_URL ?? DATABASE_URL`.

Fikser:
- La til `--env-file-if-exists=../../.env` i dev/start-scriptene for api, stream,
  framer-agent (laster rot-.env når den finnes, krasjer ikke når den mangler).
  Web (Next.js) laster .env selv.
- Presis feilmelding i stream/dev.ts + api/workflows/notify.ts (navngir begge vars).
- `.env.example`: header med `cp .env.example .env`-instruks + at dev-scriptene
  laster rot-.env eksplisitt.

**Brukeren må sette** (i rot-`.env`): `DATABASE_URL` (eier) og `APP_DATABASE_URL`
(app-rolle) — se `.env.example`. Deretter `pnpm db:up && pnpm db:seed && pnpm dev`.

### 3. Login `ECONNREFUSED 127.0.0.1:3001` — FØLGE av #1 (bekreftet)
Web proxier `/api/auth/*` + `/trpc/*` til api på :3001. API-en krasjet på
parameter-property-feilen ved oppstart → ingenting lyttet på 3001 → proxy-feil.
**Årsakssammenheng bekreftet:** fiks #1 → api booter (gitt env fra #2) → proxy
virker → login fungerer. Ikke en egen auth-bug.

### 4. Peer-dep-opprydding (fullført fra forrige runde)
- **Passkey fjernet** (`@better-auth/passkey` + ubrukt `@simplewebauthn/server`):
  ingen klientflyt brukte den; den dro inn et foreldet @better-auth/core-1.4.x-tre
  → 4 peer-advarsler borte. `passkey`-tabellen beholdt dormant. Techstack §2
  oppdatert (passkey UTSATT, ikke fjernet permanent).
- **drizzle-orm låst til 0.45.2** via `overrides` i **pnpm-workspace.yaml** (pnpm 11
  leser IKKE lenger `pnpm.overrides` i package.json — flyttet dit). better-auth@1.6.23
  krever `^0.45.2`; @better-auth/cli@1.4.21 (dev-codegen) dro inn better-auth@1.4.21
  som peer-er `>=0.41.0`. 0.45.2 tilfredsstiller BEGGE → fantom-0.41.0 kollapset.
  packages/db lå allerede på 0.45.2, så INGEN kodeendring/bump — kun dedupe.
- drizzle 0.42→0.45 er additivt (cross joins, DrizzleQueryError, bugfikser), ingen
  pgPolicy/RLS-breaking. Vår RLS-kode typecheck+bygger på 0.45.2.
- Ren `pnpm install` (verifisert i sandkasse): **0 peer-advarsler**, én
  drizzle-orm@0.45.2, ingen passkey/simplewebauthn. (Rest: @better-auth/cli sitt
  interne 1.4.x-tre — dev-only, gir ingen advarsler.)
- **pnpm-lock.yaml regenerert** (den committede var korrupt/avkuttet — restaurert
  fra en ren resolusjon).

### 5. Kosmetisk
- `apps/web/app/layout.tsx`: `adjustFontFallback: false` på Google Sans Flex.
  MERK: Turbopack logger fortsatt «Failed to find font override values» — fonten er
  ny og mangler metrics i Next sin database; advarselen er ufarlig (ingen
  runtime/layout-effekt), og opsjonen er semantisk riktig uansett.
- Logo-`<Image>` (top-bar.tsx): `style={{ height: 'auto' }}` → aspect-ratio-warning.

### Verifisert
typecheck ✓ (auth, guardrails, modules, vegvesen, api, stream, framer-agent, web) ·
Biome ✓ · `next build` ✓ (37 ruter) · strip-only-parse ✓ (alle 6 filer + 3
entrypunkter) · ren `pnpm install` uten peer-advarsler ✓. **Ikke pushet.**

**Brukeren MÅ verifisere lokalt (kan ikke i sandkassen):** kjør `pnpm test` mot
Docker-Postgres for å bekrefte at RLS/tenant-isolasjonen fortsatt holder. Merk: vi
BUMPET ikke drizzle (packages/db lå allerede på 0.45.2), så risikoen er lav — men
RLS-testene bør uansett kjøres etter en dep-graf-endring.

---

## 2026-07-17 (b) — db-scripts: env-lasting + `db:up`-alias + riktige feilmeldinger

To oppstartsfeil til:
1. **`pnpm db:up` fantes ikke** (Postgres startes med `docker compose up -d`; kun
   README/seed refererte `db:up`). Lagt til alias i rot: `db:up = docker compose up -d`
   (+ `db:down`). `db:setup` = `db:migrate && db:grants` (migrering + grants —
   starter IKKE Docker, seeder IKKE).
2. **db-scriptene lastet ikke `.env`** (samme klasse som dev-scriptene). Fikset:
   - `db:seed` (rot): `node --env-file-if-exists=.env ...`
   - `db:grants` (packages/db): `node --env-file-if-exists=../../.env ...`
   - `db:generate`/`db:migrate` bruker drizzle-kit (tar ikke node-flagget) →
     `drizzle.config.ts` laster rot-.env via innebygd `process.loadEnvFile('../../.env')`
     (Node 20.12+, ingen ny avhengighet).
   - Rettet villedende feilmeldinger i `seed.ts` + `grants.ts` (pekte på `pnpm db:up`
     som ikke fantes) → peker nå på `cp .env.example .env` → `db:up` → `db:setup` → `db:seed`.

Verifisert i sandkasse: `--env-file-if-exists` laster DATABASE_URL ✓; `process.loadEnvFile`
i config henter DATABASE_URL ✓; seed/grants/config parser under strip-only ✓;
typecheck packages/db + apps/api ✓.

**KORRIGERT oppstartssekvens (erstatter feil `pnpm db:up`-referanser over):**
`cp .env.example .env` (fyll inn) → `pnpm db:up` → `pnpm db:setup` → `pnpm db:seed` → `pnpm dev`.

---

## 2026-07-17 (c) — Seed-krasj: Better-Auth id-generering (config-fiks, INGEN migrasjon)

`pnpm db:seed` krasjet på første `user`-insert: `null value in column "id" ...
violates not-null` — insert-en brukte `default` for `user.id`, men kolonnen har
ingen DB-default.

**Rotårsak (verifisert mot context7 + applied migrasjon 0000_uneven_expediter):**
`advanced.database.generateId: 'uuid'` fungerer IKKE med Postgres-adapteren.
Better-Auth-docs (concepts/database): med `'uuid'` genererer Better-Auth uuid-er
selv for alle adaptere UNNTATT Postgres, der den delegerer til en DB-DEFAULT
(`gen_random_uuid()`). Men alle 10 Better-Auth-tabellene (user, session, account,
verification, organization, member, invitation, two_factor, passkey, rate_limit)
er `"id" text PRIMARY KEY NOT NULL` UTEN default → Better-Auth genererer ingen id,
DB genererer ingen → NULL → brudd. Seeden nådde aldri organization (krasjet på
user først); `member`/`tenants` funket bare fordi seeden gir `id` manuelt
(`randomUUID()` / `org.id`).

**Fiks — auth-laget (config), IKKE schema:** byttet `generateId: 'uuid'` →
`generateId: () => randomUUID()` (funksjon, `import { randomUUID } from 'node:crypto'`).
En funksjon genererer id-en APP-SIDE for ALLE Better-Auth-tabeller (docs-anbefalt
mønster) og omgår Postgres-spesialtilfellet. `organization.id` blir fortsatt en
gyldig uuid-STRENG = tenant_id (uuid-kolonne i domenetabellene, ADR-002 intakt).
Kolonnene forblir `text('id')` — de tar imot uuid-strengen. **Ingen schema-endring,
ingen ny migrasjon.**

Verifisert i sandkasse: typecheck (auth) ✓ · Biome ✓ · strip-only-parse (auth.ts) ✓.
Selve seeden må kjøres mot Docker (kan ikke i sandkassen).

**Brukeren kjører nå bare:** `pnpm db:seed` (DB er allerede oppe + migrert; dette er
en ren config-fiks — ingen `db:generate`/`db:setup` nødvendig). Seeden er idempotent
(upsert på e-post/slug), så en delvis feilet kjøring før er uproblematisk.

Aside: `packages/db/drizzle/` har 3 foreldede `0000_*.sql`-snapshots som IKKE står
i `_journal.json` (kun `0000_uneven_expediter` er applied). Harmløst, men kan ryddes.

---

## 2026-07-18 — Bookinger koblet til ekte backend (F3-06 + F3-09)

Nå som tRPC-klienten virker: erstattet placeholder-sidene med ekte,
RLS-scopet booking-UI. Gjenbrukbart **liste → detalj → status**-mønster
(kunder/kjøretøy/tjenester arver det).

### Backend (utvidelser, ingen migrasjon)
- `bookings.list` (NY): beriket + RLS-scopet liste. Filtre: status, mekaniker,
  dato-vindu, fritekst (kunde/regnr/notat via `ilike`). Join kunde/kjøretøy/
  mekaniker/tjenesteversjon→tjeneste (samme mønster som `mechanic.myDay`).
- `bookings.byId` (NY): beriket detalj + **append-only historikk** fra
  audit-loggen (F1-06).
- `transitionBooking` (engine): tar nå `actor` og skriver en audit-rad
  (`booking.<status>`, from→to) i SAMME transaksjon som statusendringen. Gjelder
  også «Min dag» (samme `bookings.transition`-procedure). Booking-historikk er
  dermed EKTE, ikke mock.
- `services.list`: eksponerer nå `serviceVersionId` (createBooking peker på
  versjonen, ikke tjenesten — F2-04). Additivt.

### Frontend (apps/web/app/(app)/bookinger/)
- `_status.ts`: delt status-lag (labels, toner, lovlige overganger speilet fra
  lifecycle, kr/tid-formattering).
- `page.tsx` — LISTE: ekte `bookings.list`, søk + status/mekaniker-filter,
  radkort → detalj, loading/empty/error. Viser `source='quick'` som lesbar
  etikett (fremtidssikring; ingen Quick-synk — se Quick-funn under).
- `[id]/page.tsx` — DETALJ: kunde/kjøretøy/tjeneste/mekaniker/pris/tid + notat +
  historikk. Statusknapper = KUN lovlige overganger (`bookings.transition`,
  samme livssyklus som «Min dag»). Serveren håndhever maskinen.
- `ny/page.tsx` — NY BOOKING: kunde/kjøretøy/tjeneste/tid → `mechanics.match`
  rangerer mekaniker (score + begrunnelse, «best treff») → `bookings.create`
  (slot-lock-motoren, F3-01). Vegvesen-oppslag (F2-08) som smart default på
  regnr (håndterer manglende VEGVESEN_API_KEY pent). 409 slot-konflikt →
  vennlig melding om å velge annen tid/mekaniker.

Kortstil (dobbel border via CardShell), grønn aksent, mørkt tema. Rollestyring:
Forhandler-seksjonen (dealer_staff/dealer_admin) — RLS på serveren er den ekte
grensen. Verifisert: typecheck (modules/api/web) ✓ · Biome ✓ · `next build` ✓
(37 ruter, inkl. /bookinger, /bookinger/[id], /bookinger/ny). Krever Docker +
seed for å se ekte rader (Verksted A). Ikke pushet.

### Quick-integrasjonen (undersøkt, IKKE bygget)
Quick er forhandlerens eksterne **ERP/DMS** (roadmap F8-01 «Quick ERP-adapter»,
techstack §«Eksterne tjenester»: «Varelager, bookinger, kunder — Endwise synker
og speiler (Quick Lite)»). Tiltenkt TOVEIS i Spor A: Quick som booking-KILDE +
status pushes tilbake. **Bygget i dag = kun navngiving:** `source='quick'`-enum,
`quick`-entitlement/modul, UI-placeholder + nav-lenke. INGEN toolkit, router,
webhook eller `QUICK_*`-env finnes. Roadmap-status: F8-01/F8-02/F8-07/F8-08 alle
**planned** (uke 26–34); F1-07 (onboarding m/Quick-nøkkel) planned. Merk:
GDPR-veikartet nevner IKKE Quick (premisset i oppgaven stemte ikke).
**Konklusjon:** Bookinger bygges mot Endwise' egen DB. `source='quick'` vises som
lesbar etikett, men ingen lesing/skriving mot Quick nå — det er F8-arbeid som
krever Quick API-tilgang som ennå ikke finnes.

---

## 2026-07-18 (b) — Quick-integrasjon: QuickLite-fundament (F8-01/F8-02 → `progress`)

**Godkjent av:** Mikkis
**Endring:** `F8-01` og `F8-02` flyttet fra `planned` til **`progress`** (DELLEVERT, ikke `done`).

**Hvorfor delvis:** Quick3 Web API (v2, BETA) sin swagger (`…/swagger/docs/v2`) er
**TOKEN-GATET** — den returnerer tomt uten en gyldig ApiV2-token. Booking-, delelager- og
salgsendepunktene kan derfor **ikke kartlegges** ennå. Vi bygde ferdig strukturen mot det som
er BEKREFTET, og lot resten stå som tydelige TODO-er. Ingen end-to-end-synk er verifisert —
det krever en ekte ApiV2-token (helst mot `Test_Public`).

**Hva er bygget (delleveranse F8-01/F8-02):**

- **`packages/tools/toolkits/quick`** (nytt, følger `toolkit-vegvesen`-mønsteret): typet Quick-
  klient med token-auth (`Authorization: Token token=<token>`), konfigurerbar per-instans
  baseUrl, `client/info` som tilkoblingstest, `customer/batch` inkrementell paginert henting
  (`changedAfterDate` + `limit/offset` til `offset >= totalCount`), `mapQuickCustomer` og
  `quickProvider` (F0-06). Usikre felt er eksplisitt merket (`.loose()` bevarer ukjent).
- **`packages/db/src/crypto.ts`** (nytt): envelope-crypto (**AES-256-GCM, BYOK**, KEK i
  `ENDWISE_KEK`) for tenant-hemmeligheter — realiserer techstack §«Envelope-crypto» og
  crypto-sømmen i **F1-07**. Enhetstestet (rundtur, tukling, feil nøkkel).
- **`integration_config`-tabell** (ny, RLS-skopet): per-tenant baseUrl + envelope-kryptert
  token + synk-status. `customers` fikk `source` (default `endwise`) + `quick_guid` +
  unik indeks `(tenant_id, quick_guid)` for idempotent upsert.
- **`packages/modules/src/quick`**: `createQuickConfigService` (krypter/dekrypter token, aldri
  klartekst til klient) + `syncQuickCustomers` (batchede korte transaksjoner, nettverk utenfor
  transaksjon, idempotent, `source='quick'`).
- **`apps/api` `quick`-router**: `config` (query), `setConfig`/`testConnection`/`syncNow`
  (alle `adminProcedure` — kun dealer_admin/endwise_admin).
- **`apps/web` `/integrasjoner/quick`**: baseUrl+token, «Test tilkobling», «Synk nå», synk-status.
  Kortstil (dobbel border via `CardShell`), grønn aksent, mørkt tema, rollestyrt (`useOrgRole`).
- **Angrepstest** `packages/db/test/quick-isolation.test.ts`: forhandler A når ikke B sin
  Quick-config/token (RLS). Skippes uten Docker.

**TODO (venter på ApiV2-token):** booking/delelager/salg-synk, **PUSH tilbake til Quick**
(toveis), kalendersynk, DLQ + retry, dedikert synklogg-tabell. Derfor `progress`, ikke `done`.

**Migrasjon:** DB-schema er endret → **må kjøre `pnpm --filter @endwise/db db:generate` +
`db:migrate`**. Håndskrevet referanse-DDL ligger i `packages/db/drizzle/manual/0001_quick_integration.sql`
(drizzle-kit kunne ikke kjøres i byggemiljøet — esbuild-binær for feil OS).

**Ingen techstack-endring:** envelope-crypto, RLS, Drizzle, tRPC/Hono, shadcn/CardShell — alt
innenfor kanon. Nytt env: `ENDWISE_KEK` (base64 32-byte). Ikke pushet.

---

## 2026-07-18 (c) — Quick synk-modell avklart: pull dominerer (overskriver), push manuell

**Godkjent av:** Mikkis
**Endring:** Retningsavklaring på F8-01 synk-modell (ingen fase-statusendring — fortsatt `progress`).

**Modell: Quick er FAKTA (source of truth).**

- **PULL (Quick → Endwise) dominerer og OVERSKRIVER.** Bekreftet i `syncQuickCustomers`:
  konflikt på `(tenant_id, quick_guid)` → Quick-verdiene overskriver våre felt (navn/e-post/
  telefon). Lokale-KUN-felt (`userId`/Min-side-kobling, `createdAt`, `customer_notes`) røres
  ALDRI — de er ikke Quicks domene.
- **Automatisk pull 08:00 og 16:00 (Europe/Oslo), kun i produksjon.** Ny cron-rute
  `/cron/quick-pull` + `vercel.json`-schedule `0 6,7,14,15 * * *` (UTC). **DST-håndtert
  eksplisitt:** Vercel Cron er UTC-only, så vi trigger på alle aktuelle UTC-timer og kjører den
  EKTE pullen KUN når `osloHour()` (IANA `Europe/Oslo`) er 08 eller 16 — nøyaktig to kjøringer/
  døgn sommer og vinter (enhetstestet i `apps/api/test/oslo-time.test.ts`). Lokalt kjører cron
  ikke; pull er manuell.
- **Manuell «Hent nå»** (`quick.pullNow`) beholdt — samme overwrite, delta som standard
  (`full: true` tvinger full re-pull).
- **PUSH (Endwise → Quick) ALDRI automatisk.** Ny `quick.pushNow` er eksplisitt **gated**
  (kaster `NOT_IMPLEMENTED`) og UI-et har et **eget, tydelig adskilt push-kort** («Send til
  Quick · manuell · kommer», deaktivert). Push forblir en bevisst, knapp-utløst handling —
  aldri en bieffekt av pull. Selve impl. utsatt (mangler ApiV2-token).

**Datatap-risiko (flagget, håndtert):** overskriver vi to ganger daglig, kan en lokal endring i
et Quick-eid felt gå tapt ved neste pull hvis den ikke er pushet. **For KUNDER er dette greit**
(mekanikere endrer sjelden kundemaster, Quick skal vinne, og lokale-kun-felt bevares). **For
BOOKINGER (mekanikeren endrer status) er det et konfliktproblem** — dokumentert tydelig i
`sync.ts` og her: booking-pull MÅ håndtere det med **push-før-pull** eller en **«dirty»/lokalt-
endret-markør** som beskytter upushede rader. Bevisst IKKE bygget nå (ingen booking-synk ennå,
og en dead markør-kolonne på `customers` ville vært overbygg) — men det er ikke en stille
datatap-felle: det er en eksplisitt TODO på booking-synken.

**Refaktor:** felles `runQuickCustomerPull()` (apps/api/src/lib/quick-pull.ts) deles av `pullNow`
og cron. Tidssone-helper skilt ut til `apps/api/src/lib/oslo-time.ts` (avhengighetsfri, testbar).
Nye lucide-ikoner i kuratert barrel: `RefreshCw`, `Upload`. Ikke pushet.

---

## 2026-07-18 (d) — Tre-veis flette- og konflikt-rammeverk for Quick-synk

**Godkjent av:** Mikkis
**Endring:** F8-01/F8-02 fortsatt `progress` — datatap-TODO-en fra (c) er nå ERSTATTET av et
faktisk rammeverk (booking-synk kobler seg på det i stedet for å måtte oppfinne det på nytt).

**Modell (git-lignende tre-veis fletting per felt).** Baseline = verdiene vi SIST hentet fra
Quick (lagret som `customers.quick_baseline` jsonb). Per felt, mot baseline:

1. Quick endret, vi ikke → **Quick vinner** (auto).
2. Vi endret, Quick ikke → **behold vår** (auto).
3. Ingen / begge til samme → ingen konflikt.
4. **Begge endret ULIKT → KONFLIKT** — ikke overskriv, legg i kø.

**Feltnivå, ikke radnivå:** Quick kan endre telefon mens vi endrer et annet felt — begge flettes,
ingen konflikt. Kun samme felt endret ulikt gir konflikt.

**Bygget:**

- **`packages/modules/src/quick/merge.ts`** — ren, avhengighetsfri `threeWayMerge` (kjernen).
  Enhetstestet: alle fire tilfellene + feltnivå + baseline-migrasjon + tom/null-normalisering
  (`packages/modules/test/quick-merge.test.ts`, verifisert 7/7 standalone).
- **`sync_conflicts`-tabell** (RLS-scopet, generisk: `entity`/`entity_id`/`field`/base/our/their/
  status/resolution/`push_intent`). Partiell unik indeks på åpne konflikter → idempotent
  gjendetekt uten duplikater. `customers.quick_baseline` (jsonb) som merge-base.
- **`syncQuickCustomers`** skrevet om: leser eksisterende rad, tre-veis fletter per felt,
  auto-fletter ikke-konflikt-felt, skriver konflikter til køen (overskriver IKKE), avanserer
  baseline for forsonte felt (ikke for konflikt-felt → idempotent). Ny rad: Quick vinner +
  baseline etableres. Entitets-agnostisk mekanikk gjenbrukes av booking/delelager/salg senere.
- **`createConflictService`** (modules) + **tRPC `conflicts.list/count/resolve`** (adminProcedure,
  RLS). `resolve`: «behold Quick» (ta Quick-verdi) / «behold vår» (behold + `push_intent='pending'`
  — push fortsatt gated). Begge avanserer baseline til Quick-verdien så samme konflikt ikke
  gjendetekteres. Løsning markeres (hvem/hvordan/når).
- **Dashboard-panel** på Quick-siden: liste over åpne konflikter (felt + Quick vs vår vs baseline),
  «Behold Quick»/«Behold vår»-knapper, antall-badge i header + i pull-resultatet. Kortstil, mørkt
  tema, grønn aksent. Rollestyrt (kun admin ser/løser).
- **Angrepstest** utvidet (`quick-isolation.test.ts`): A ser ikke B sine konflikter, A kan ikke
  løse B sin konflikt (RLS).

**Overwrite bevart der det IKKE er lokal endring:** Quick er fortsatt fakta for urørte felt
(tilfelle 1). Lokale-kun-felt (userId/notater) røres aldri. Ny lucide-ikon: `TriangleAlert`.

**Migrasjon:** DB endret igjen (`customers.quick_baseline` + `sync_conflicts`) → **kjør
`pnpm --filter @endwise/db db:generate` + `db:migrate`**. Referanse-DDL oppdatert i
`packages/db/drizzle/manual/0001_quick_integration.sql`. Ikke pushet. Biome-write IKKE kjørt mot
mounten (korrupterer) — kjør `pnpm format` selv.

---

## 2026-07-18 (e) — CWE-sikkerhetsgjennomgang av Quick-integrasjonen (fikser)

**Godkjent av:** Mikkis
**Endring:** Ingen fase-status endret — herding av F8-01/F8-02. Full CWE-gjennomgang + uavhengig
andregangs-gjennomgang (subagent). Dokumentert i `docs/sikkerhet/quick-cwe-gjennomgang.md`.

**Fikset (utnyttbare):**

- **CWE-918 SSRF (høyest):** brukerkonfigurert `baseUrl` ble kun `z.string().url()`-validert →
  kunne peke på sky-metadata (169.254.169.254), localhost, RFC1918, `[::1]`, `http://`, og fulgte
  redirects. Ny `assertAllowedQuickUrl` (`packages/tools/toolkits/quick/src/url-guard.ts`): kun
  https, allowlist `*.quick.no` (env `QUICK_ALLOWED_HOST_SUFFIXES`), blokkerer IP-literaler/
  localhost/credentials/ikke-standard port. Validert BÅDE ved `setConfig` (før lagring) OG i
  klienten før hver fetch. `redirect: 'error'`. 19 enhetstester (verifisert 19/19 standalone).
- **CWE-400/770 DoS:** ingen timeout/størrelsestak → `AbortSignal.timeout(15s)`, `Content-Length`-
  tak (25 MB), rad-tak (500k) + side-tak (10k).
- **CWE-306 fail-open cron:** `/cron/quick-pull` var offentlig uten `CRON_SECRET` (+ `?force=1`
  forbigikk tidsgaten). Feiler nå lukket (503 uten secret) + konstant-tids Bearer-sjekk.
- **CWE-209/532 lekkasje:** klienten reflekterer ikke lenger rå nettverks-cause (kunne bære intern
  host/IP + gi blind-SSRF-orakel) — generiske meldinger. Token aldri i feilmelding/logg.

**Bekreftet trygt (ikke-aktuelt):** CWE-522/311/312/798 (envelope-crypto, unik IV, auth-tag, KEK
fra env, feiler lukket, token aldri til klient), CWE-863/862 (adminProcedure + RLS, angrepstestet),
CWE-89 (Drizzle parameterisert, ingen rå SQL), CWE-352 (app-nivå SameSite/tRPC POST).

**Restrukturering:** feilklassene flyttet til egen leaf-modul `errors.ts` (QuickError/QuickAuthError/
QuickSsrfError) for å unngå sirkulær import med url-guard. Ny env: `QUICK_ALLOWED_HOST_SUFFIXES`
(valgfri, default `quick.no`). Ikke pushet. Biome-write IKKE kjørt mot mounten — kjør `pnpm format`.

**Restrisiko (dokumentert):** DNS-rebinding mot `*.quick.no` (krever kompromittert Quick-DNS);
RLS avhenger av at runtime-rollen ikke er BYPASSRLS (driftskontroll); samme fail-open-mønster i
`cron/cleanup.ts`/`retention.ts` bør harmoniseres senere.

---

## 2026-07-18 (f) — Fail-open ryddet på ALLE cron-ruter (delt guard)

**Godkjent av:** Mikkis
**Endring:** Oppfølging av restrisikoen fra (e). Ingen fase-status endret — sikkerhetsherding.

**Kartlagt alle eksternt trigg­bare endepunkter** (apps/api, apps/stream, framer-agent):
`/stripe/webhook` (signaturverifisert, feiler lukket ✔), `/cron/quick-pull` (fikset ✔),
**`/cron/cleanup` og `/cron/retention` (VAR fail-open — `if (secret && …)` slapp alt gjennom uten
`CRON_SECRET`)**, `/sse` (session + assertMember ✔), `/health` ×3 (harmløst, bevisst åpent).

**Fiks:** ny delt **`cronAuth`-middleware** (`apps/api/src/lib/cron-auth.ts`) — feiler LUKKET
(503 uten `CRON_SECRET`, 401 ved feil/manglende Bearer, konstant-tids sammenligning). Alle tre
cron-ruter bruker nå `new Hono().use('*', cronAuth).get(…)` — ÉN implementasjon, kan ikke drifte
fra hverandre. `quick-pull` sin lokale variant erstattet av den delte; `?force=1` kjører nå etter
autentiseringen (kan aldri forbigå den). `/cron/retention` sletter data → ekstra viktig.

**Test:** `apps/api/test/cron-auth.test.ts` — ren `evaluateCronAuth` (verifisert 7/7 standalone) +
in-memory Hono `app.request`-tester (503/401/200) for CI. Dokumentert i
`docs/sikkerhet/quick-cwe-gjennomgang.md` (oppfølgingsseksjon). Stripe-webhooken bekreftet
signaturverifisert (`constructEvent`) og feiler lukket — ingen endring. Ikke pushet. Biome-write
IKKE kjørt mot mounten.

---

## 2026-07-18 (g) — Kundewidget (F4) + art. 50 ferdig (F14-04 → done)

**Godkjent av:** Mikkis
**Endring:** F14-04 → **done**. F4-02 → **done**. F4-01/03/07/08/15 → **progress**. Kundens
booking-inngang (offentlig, embeddbar) + AI-chat, bygget ende-til-ende på sikkerhets-ryggraden.

**F14-04 (art. 50) — FERDIG.** «Du snakker med en AI»-opplysningen står nå FØR samtalen i HVER
AI-kunde-flate: support-chatten (`/chat`, fra før), kundewidgeten (`widget-ui`, øverst), OG
**server-håndhevet** — `/widget/chat` returnerer opplysningen som første felt i hvert svar, så en
tuklet/egenskrevet klient kan ikke fjerne den. Kanon-tekst speilet server-side
(`@endwise/modules/widget` `WIDGET_AI_DISCLOSURE`). `[ART50-UI]`-markørene beholdt for design-pass
(F4-15). Treffer art. 50-baren før fristen 2. august.

**F4 kundewidget — sikkerhets-ryggrad (dette er en NY offentlig, uautentisert angrepsflate):**

- **`widget_keys`-tabell** (RLS): publishable key (`pk_live_…`, offentlig) + `allowedOrigins` per
  tenant. Ingen hemmelig nøkkel i Framer (CWE-798/522).
- **`packages/modules/src/widget/` sikkerhetskjerne** (rene, testbare): HS256-widget-token
  (sign/verify, konstant-tid, alg-none-vern, utløp), streng origin-validering (ingen wildcard/
  suffiks-spoof), in-memory rate-limiter, ledighets-beregning (kun ledige tider, ingen PII).
  **Enhetstestet 15/15 standalone.**
- **`/widget/*` Hono-ruter** (offentlig): `init` (publishable key + **Origin-validering** →
  kortlevd token; rate-limitet), `services`/`availability`/`booking`/`chat` bak `widgetAuth`
  (feiler lukket, 401). CORS scopet til `/widget/*`. Rate-limit per endepunkt. All datatilgang
  RLS-scopet til tenant fra tokenet — en anonym kunde kan KUN se tjenester/ledige tider + opprette
  ÉN booking-forespørsel (mekaniker valgt server-side, idempotent via slot-lock-motoren). Ingen
  enumerering av andres kunder/kjøretøy/bookinger.
- **Kundevendt AI-chat:** provider = `resolveModelProvider('customer_freetext')` ⇒ **Mistral (EU),
  ALDRI Fireworks** (`runAgent` dobbeltsjekker via `providerSatisfies`); scope-gate (F14-05) FØR
  AI (sensitive kategorier → eskaler til menneske); pseudonymisering (F14-01) av fritekst;
  art. 50-opplysning først. Degraderer trygt uten Mistral-nøkkel (503/eskalering, aldri Fireworks).
- **widget-ui**: embeddbar `EndwiseWidget` (art.50 + chat + booking-panel) + `mountEndwiseWidget`,
  stylet med `@endwise/widget-tokens`. **Framer-plugin-skall** (`framer-plugin/`): manifest +
  React-skall + config-flate (F4-01 progress).
- **Admin:** `widget.keys.list/issue` (tRPC, adminProcedure) for nøkkel-utstedelse.

**Angreps-/sikkerhetstester:** `packages/db/test/widget-isolation.test.ts` (A ser/endrer ikke B
sine widget-nøkler; kunde bundet til A ser ikke B sine kunder — RLS) + `apps/api/test/widget-auth.test.ts`
(in-memory Hono: 401 uten/feil token, 200 med gyldig) + sikkerhetskjerne 15/15.

**Migrasjon:** ny `widget_keys` → **kjør `pnpm --filter @endwise/db db:generate` + `db:migrate`**.
Ref-DDL: `packages/db/drizzle/manual/0002_widget_keys.sql`. Nye env: `WIDGET_TOKEN_SECRET` (valgfri,
faller tilbake til `BETTER_AUTH_SECRET`). Nye deps (må `pnpm install`): `react`/`react-dom` i
widget-ui, `framer-plugin`/`vite` i framer-plugin. Ikke pushet. Biome-write IKKE kjørt mot mounten.

**Restrisiko/TODO:** rate-limit er per instans (delt teller ved skalering — dokumentert); ekte
åpningstider (nå hardkodet 08–16); SMS-bekreftelse (F6); ekte Framer-pairing (F4-01). RLS krever
at runtime-rollen ikke er BYPASSRLS (samme driftskontroll som før).

---

## 2026-07-18 (h) — Mekaniker-PWA (F7): installerbar PWA + mobilflater

**Godkjent av:** Mikkis
**Endring:** F7-01/02/03/04/07 → **done**; F7-05/06 → **progress**. «Min dag» er nå en ekte,
installerbar PWA med fullstendig mobil-shell og de gjenstående mekanikerflatene.

**PWA-pakking (F7-01/07):**
- **Web App Manifest** (`apps/web/app/manifest.ts`, Next 16-mønster): installerbar (Add to Home
  Screen), `display: standalone`, `start_url: /min-dag`, `theme_color #1ED27D`, mørk bakgrunn,
  SVG-ikoner (`public/icon.svg` + maskable). `viewport.themeColor` + `appleWebApp` i `layout.tsx`.
- **Service worker** (`public/sw.js`): offline-skall — network-first på navigasjon → fall tilbake
  til cachet side, ellers `offline.html`; stale-while-revalidate på statiske assets. **Cacher
  ALDRI `/trpc`/`/api`/`/widget` eller persondata** — bevisst konservativ. Registrert via
  `PwaRegister` (client). `use-online.ts`-hook + offline-banner i shellet.
- **Offline-kø** (`_lib/offline-queue.ts`): statusendringer (Start/Ferdig) legges i kø ved offline
  og flushes automatisk ved «online». Dedup per booking, feilede elementer re-køes. Enhetstestet
  6/6 standalone. I minnet (tømmes ved full reload — dokumentert).

**Mobil-shell (F7-01):** `MobileShell` med **bottom-nav 5 faner** (I dag / Timeplan / Varsler /
Kompetanse / Profil) erstatter admin-sidebaren for mekanikere. `(app)/layout` rendrer den når
`isMechanic` — rollegatingen fra før (mekaniker låst til /min-dag) beholdt; server (RLS +
adminProcedure) er fortsatt den ekte grensen.

**Mobilflater:**
- **Timeplan (F7-03):** 7-dagers dag-strip → valgt dags jobber (`mechanic.myDay` per dato).
- **Varsler (F7-06):** utledet feed (utløpende sertifiseringer + pågående jobber). Progress —
  ekte sanntids-strøm senere.
- **Profil (F7-06):** navn/kapasitet/status + logg ut (`mechanic.myProfile`, `signOut`).
- **Jobbdetalj (F7-04):** store touch-statusknapper (ekte `bookings.transition`), offline-kø-
  indikator, avviksknapp. «Pause» mangler (booking-enumen har ikke hold-status — TODO).
- **Avvik (F7-05):** ny `mechanic.reportDeviation` — mekaniker-scopet (bookingId må ha
  `mechanicId = min`; ellers NOT_FOUND) + RLS. Lagrer avvik på bookingen + publiserer et
  **innholdsløst SSE-event** (`booking.deviation`) til selger (F6-02-regelen). UI: «Meld avvik» i
  jobbdetalj. Progress — selger-side sanntids-konsument gjenstår.

**Rollestyring/isolasjon:** alle mekanikerflater bruker `mechanic.*`-ruteren som utleder mekaniker
fra `mechanics.userId = ctx.userId` (aldri fra input) + `withTenant`/RLS → en mekaniker ser kun
sitt eget, aldri annen forhandler. `reportDeviation` er dobbelt-scopet (RLS + eierskapssjekk på
bookingen). Ingen ny tabell → dekket av eksisterende RLS-angrepstester (tenant-/f2-isolation).

**Ikke rørt (bekreftet):** kundewidgetens chat bruker fortsatt Mistral (EU) for kundefritekst —
`DataRegionViolation`-guarden er urørt. F7 er mekanikerflater, ikke kundefritekst.

**Må testes i nettleser/mobil:** installasjon (Add to Home Screen), service-worker-registrering +
offline-fallback, offline-kø-flush ved gjenvunnet dekning, standalone-visning. Kan ikke kjøres i
sandkassen (krever nettleser). Nye statiske filer i `public/`. Ikke pushet. Biome-write IKKE kjørt
mot mounten — kjør `pnpm format`.

---

## 2026-07-18 (i) — Opprydding før push: framer-fiks, bugs, klont-klart repo

**Godkjent av:** Mikkis
**Endring:** Ingen fase-status endret — stabilisering før første `git push` + klone til ny PC.

**1. Framer-plugin (top-level-await-feil) FIKSET.** `framer-plugin@3.x` bruker top-level await;
Vites default `build.target` (`es2020`) støtter det ikke → «Top-level await is not available…».
Ny `framer-plugin/vite.config.ts` løfter targeten til **`es2022`** på alle tre stedene esbuild/Vite
bruker (`build.target`, `esbuild.target`, `optimizeDeps.esbuildOptions.target`) + `@vitejs/plugin-react`
i devDeps. `vite dev`/`build` feiler ikke lenger på TLA.

**2. Bugs funnet + fikset (statisk gjennomgang — full `pnpm typecheck` kan ikke kjøres i
sandkassen fordi workspace-symlinkene er Windows-symlinker som ikke løses i Linux):**
- **`widget/chat.ts` — feil `GuardContext`:** sendte `{ agent, tenantId, userId }` til
  `scopeGate.check`, men `GuardContext` er `{ tenantId, userId, role }`. Manglet `role`, hadde
  ekstra `agent` → typefeil. Rettet til `{ tenantId, userId: cid, role: 'customer' }`.
- **`widget/index.ts` — zod v4-form:** brukte `z.string().datetime()` (flyttet i zod v4) og
  `z.string().email()`. Rettet til `z.coerce.date()` (som resten av repoet) og top-level `z.email()`.
- **`_shell/mobile-shell.tsx`:** ikon-typen strammet fra ad-hoc `ComponentType<{size?}>` til den
  eksporterte `LucideIcon`.

**3. Klont-klart repo:**
- **`.gitignore`** utvidet: `build/`, `*.log`, og **`.env.*` (unntatt `.env.example`)** +
  `*.tmptest` — så leftover-filer og hemmeligheter aldri havner i git.
- **`.env.example`** komplettert: manglet `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRICE_BASIS/PLUSS/PROFF`
  (leses av webhook + billing). Alle nødvendige vars er nå med, hver kommentert.
- **`README.md`** skrevet om til komplett fresh-PC-oppstart: forutsetninger (Node 24, pnpm/corepack,
  Docker), `git clone` → `pnpm install` → **`cp .env.example .env`** (rettet en BUG: gammelt README
  sa `.env.local`, men db-verktøyene laster `.env`) → `pnpm db:up` → **`pnpm db:generate`** (nødvendig:
  integration_config/sync_conflicts/widget_keys + customers-kolonner er ikke committet som sporet
  migrasjon ennå) → `db:setup` → `db:seed` → `pnpm dev`, med demo-innlogginger (passord `endwise-demo-1`).
- **Leftover-filer** (`.env.tmptest`, `_tmp_3_*`, `_tmp_5_*`, 0 byte) kunne ikke slettes fra
  sandkassen (Operation not permitted), men er nå gitignorert. **Slett dem manuelt** før commit
  (`del .env.tmptest _tmp_*` i repo-rota) hvis du vil ha dem borte fra arbeidstreet.

Ikke pushet, ingen git-config gjort. Biome-write IKKE kjørt mot mounten — kjør `pnpm format` selv.

---

## 2026-07-18 (j) — Portabilitets-herding: `.gitattributes` (LF) + hook-feilsøking

**Godkjent av:** Mikkis
**Endring:** Ingen fase-status endret — kryssplattform-robusthet før push/klone.

**Bakgrunn:** `git push` feilet med `cannot spawn .git/hooks/pre-push: No such file or directory`
— en ødelagt lefthook-hook (klassisk Windows-CRLF-i-shebang), ikke autentisering.

**Fikser:**
- **Ny `.gitattributes`** i repo-rota: `* text=auto eol=lf` + eksplisitt `eol=lf` på script/config/
  kode (`*.sh/*.mjs/*.cjs/*.ts/*.yml/lefthook.yml` m.fl.) og `binary` på bilder/fonter. Tvinger LF i
  arbeidstreet uansett `core.autocrlf`, så ingen sporet fil (eller hook lefthook leser) får CRLF som
  bryter shebang. Verifisert med `git check-attr` (text=set, eol=lf slår inn).
- **`lefthook.yml` bekreftet OS-agnostisk** (pre-commit: Biome + typecheck · pre-push: test) — alt
  kjøres via `pnpm`/`turbo`, ingen Unix-only sti. Ikke endret; hooks ikke fjernet.
- **README «Feilsøking»-avsnitt:** ved hook-feil → `pnpm exec lefthook install` (regenerer hookene)
  eller `git push --no-verify` (hopp over én gang). Merker at `.git/hooks/*` er genererte, ikke sporet.

De ekte, genererte `.git/hooks/*`-filene ligger utenfor repoet og kan ikke fikses herfra —
regenereres av `lefthook install` (kjøres av `prepare`-scriptet ved `pnpm install`). Ikke pushet.

---

## 2026-08-03 — F1-13 samlet i ÉTT utvidbart kort. Scaleway-koblingen PARKERES (bygges ikke nå)

**Godkjent av:** Mikkis (eksplisitt: «Scaleway Key Manager-koblingen skal IKKE bygges nå»)
**Ingen techstack-endring.** Scaleway Key Manager står fortsatt i techstack §2/§5/§7 som valgt
KMS-leverandør — vi utsetter *koblingen*, ikke *valget*.

| ID | Punkt | Var | Er |
|---|---|---|---|
| F1-13 | Scaleway Key Manager-kobling | fantes ikke i denne arbeidstre-kopien | **`blocked`** (parkert) med full 8-stegs plan i kortet |

### Hvorfor `blocked` og ikke `planned`

Brukeren sa «planned/blokkert». Valgt **`blocked`**, fordi hensikten er at punktet *ikke skal
kunne forsvinne i mengden*: `blocked` har sin egen KPI-teller og sitt eget statusfilter øverst i
roadmap-fila, mens `planned` er den største bunken og ville gjort punktet usynlig igjen — stikk i
strid med bestillingen. Det er ikke blokkert av en ekstern part (Scaleway-kontoen er opprettet);
det er **bevisst parkert**, og kortteksten sier det med rene ord.

### Ny mekanikk i roadmap-fila: utvidbare kort (`detail`)

Et roadmap-punkt kan nå bære `detail: { lead, steps[], src[] }`. Rendres som en klikkbar
«N steg gjenstår»-knapp i punktets tittel som folder ut hele implementeringsplanen — nummererte
steg med begrunnelse, pluss hvilke dokumenter planen er hentet fra. Åpen/lukket-tilstand holdes i
`openDetails` ved siden av `openPhases`.

**Hvorfor:** planen lå spredt over `docs/roadmap-endringer.md` (02.08), to rapporter og
techstacken. En plan som bare finnes i en rapport fra i forgårs, er en plan som er glemt.
CLAUDE.md §1 sier roadmap er én kilde til sannhet — da må roadmap også ha plass til *hva som
faktisk gjenstår*, ikke bare en statusprikk. F1-13 er foreløpig eneste punkt som bruker den.

### De åtte stegene (uendret innhold, ny plassering)

Scaleway-prosjekt + IAM · SCW-nøkler som Vercel-hemmeligheter · `packages/db/src/kms.ts` med
`@scaleway/sdk` · refaktor av `encryptSecret`/`decryptSecret` til å wrappe DEK mot Scaleway-TEK ·
`hmacBlindIndex()` · **påkrevd** rotasjons-cron for `SCW_SECRET_KEY` · ekte unwrap-teller inn i
kostnadskalkulatoren · verifisering av Scaleways forespørselsprising.

Steg 6 er merket påkrevd av en grunn: Scaleway støtter **ikke** Vercel OIDC-føderasjon, så vi
sitter igjen med én langlevd secret key. Rotasjon er da ikke ekstrautstyr, det er prisen for
leverandørbyttet.

### ⚠️ Funn: Scaleway-arbeidet fra 01.–02.08 ligger IKKE i hovedarbeidstreet

`docs/rapporter/2026-08-02-scaleway-bytte.md`, `2026-08-01-KMS-og-eksterne-kostnader.md`,
F5-12-punktet, `apps/web/app/(app)/admin/_components/external-costs.tsx` og
techstack-oppdateringene finnes kun som **ucommittede endringer i git-worktreet**
`.claude/worktrees/determined-mestorf-53951c` (samme base-commit `7cdbed6` som `main`).
Hovedtreet har ingenting av det. Kortet over er derfor skrevet fra worktree-kildene, men lagt
inn i hovedtreets roadmap. **F5-12 er bevisst IKKE lagt inn her** — koden den beskriver som
`done` finnes ikke i hovedtreet, og et roadmap-punkt som sier «ferdig» om kode som ikke er der,
er verre enn ingen rad. Se sesjonsrapporten for hvordan arbeidet kan hentes over.

---

## 2026-08-03 (b) — EIERENS DESIGN-PRINSIPPER: Inter, lyst tema som standard, mål-tokens

**Godkjent av:** Mikkis (ga prinsippene direkte, med beskjed om at de har forrang over
`docs/UI-PAKKER.md` der de kolliderer)
**Type:** designsystem-endring. **Ingen techstack-endring** — `next/font/google`, Tailwind 4,
shadcn, beUI, dither-kit og matrix-loaders står uendret.

### Hva som er snudd

| | Var (15.–16.07.2026) | Er |
|---|---|---|
| Standardtema | **mørkt** (`data-theme="dark"`) | **lyst** (`data-theme="light"`) |
| Font | Google Sans Flex | **Inter** |
| Bakgrunn / sidebar | `#1a1a1a` / `#1a1a1a` | `#ffffff` / `#fafafa` (valgt: `#ededed`) |
| Mørk palett | `#1a1a1a` / `#141414` / `#262626` | `#171717` / `#1a1a1a` / `#292929` |
| Tekst | `#ffffff` / `#a1a1a1` / `#7e7e7e` | `#333333` / `#777777` |
| Knapp | shadcn `h-9` + `rounded-md` · beUI 40px pill | **32px høyde, 10px radius** overalt |
| Typeskala | 6 trinn (24/20/14/14/12/11) | **3 trinn**: `text-title` 16/20/500 · `text-label` 13/16/500 · `text-body` 14/20/400 |
| Badge | rød transparent «New» | **20px / 6px / `#CAFACE` / `#15B042`** |

Nye mål-tokens: `--ew-control-h` 32 · `--ew-radius-control` 10 · `--ew-row-h` 40 ·
`--ew-row-h-store` 44 · `--ew-badge-h` 20 · `--ew-badge-radius` 6 · `--ew-switch-w/h/thumb`
24/14/10 · `--ew-switch-track-on` `#0077E6`. Eksponert som `h-control`, `rounded-control`,
`h-row`, `h-row-store`, `h-badge`, `rounded-badge`, `bg-switch-on`.

Nye flate-tokens: `--ew-sidebar`, `--ew-sidebar-active`, `--ew-inset`, `--ew-accent-strong`,
`--ew-accent-soft`, `--ew-*-soft` (warn/danger/success), `--ew-bevel-*`.

### To beslutninger verdt å merke seg

**1. Aksenten kan ikke være tekst i lyst tema.** `#1ED27D` mot hvitt gir ~1.8:1 kontrast. Derfor
er aksenten delt i to: `--ew-accent` (fyll, logogrønn) og `--ew-accent-strong` = `#15B042` —
eierens egen badge-tekstfarge, ikke en jeg fant på. I mørkt tema er de identiske.

**2. Spec-en er lagt i KOMPONENTENE, ikke på kallstedene.** `button.tsx` (shadcn),
`motion/button/base.tsx` (beUI) og `badge.tsx` (shadcn) er endret fra oppstrøms så 32px/10px/13px
er default. Alternativet — å overstyre på hvert kallsted — er en spec som brytes ved den femte
bruken. Avvikene er dokumentert i UI-PAKKER §5 og i en kommentar i hver fil; `shadcn add` virker
fortsatt for nye komponenter.

### Nytt: `Switch` (shadcn-oppskrift på `radix-ui`)

24×14px track, 10px thumb, track-på `#0077E6`. Ingen flate trenger den ennå — den er bygget fordi
spec-en definerer den, så verdien ikke blir liggende ubrukt i `tokens.css`.

### Hva jeg måtte tolke (flagget, ikke gjettet i det stille)

1. **«Titler 16/20px Medium»** er lest som *størrelse/linjehøyde*, ikke som to titteltrinn.
2. **Bare to tekstfarger er gitt.** `--ew-fg-faint` er **aliasert** til `#777777` framfor at jeg
   fant på et tredje nivå.
3. **Ingen meta-størrelse under 13px er gitt.** Tidspunkt/hjelpetekst bruker `text-[12px]`.
4. **Hårlinjer, hover-flate, kortflate og hele den mørke tekstrampen** er utledet — merket
   «UTLEDET» i `tokens.css`.

### Utført opprydding

`bg-[#0e0e0e]` (hardkodet mørk innerflate, 23 steder i `apps/web`) → `bg-inset`. `BEVEL` leser nå
`--ew-bevel-*` i stedet for `#262626`/`#2f2f2f`. Uten disse to ville lyst tema vært umulig.

**Verifisert i nettleser mot bygget app (`next start`, `/signin`):** `data-theme="light"` ·
bakgrunn `rgb(255,255,255)` · tekst `rgb(51,51,51)` · Inter aktiv (13 selvhostede woff2) ·
brødtekst 14/20 · H1 16/20/500 · label 13/16/500 i `rgb(119,119,119)` · input og knapp 32px høyde
og 10px radius · badge 20px/6px `rgb(202,250,206)`/`rgb(21,176,66)` · sidebar `rgb(250,250,250)` ·
valgt `rgb(237,237,237)` · rader 40/44px · switch-track 24×14 `rgb(0,119,230)` med 10px thumb ·
begge temaer i bygget CSS. typecheck (web/ui/api) ✓ · Biome ✓ · `next build` ✓ (42 ruter).

**IKKE verifisert:** de innloggede flatene er ikke rendret mot ekte data — det krever
`pnpm dev` + Docker-Postgres. Verdiene over er lest fra samme utility-klasser flatene bruker.
Ikke pushet.

---

## 2026-08-03 (c) — dither-kit FJERNET fra UI-et. Boksene beholdt

**Godkjent av:** Mikkis («Fjern dither-kit fra UIen som er der nå, alle disse barene som er rundt
om, men behold boksene»)
**Type:** UI-endring. ⚠️ **IKKE en techstack-endring** — se «Grensen jeg ikke krysset» under.

### Hva som ble fjernet, og hva som står i stedet

| Var | Er nå |
|---|---|
| `AreaChart` — booking-flyt 30 d (`/dashboard`, `/admin`) | **`BookingsTable`** — totaler per serie + tabell dag for dag |
| `AreaChart` — MRR 12 mnd (`/admin`) | **`RevenueTable`** — MRR nå + vekst + endring per måned |
| `Sparkline` som KPI-kortbakgrunn | Ingenting. Kortet står, tallet bærer |
| `Sparkline` som rad-trend i forhandlerlista | Ingenting. Tallene sto allerede ved siden av |
| `DitherGradient` i `SupportCard`-headeren | Rolig aksentflate (`bg-accent-soft`) med ikonet |
| `DitherAvatar` i meldingstråden | `CircleUser`-ikon, samme som sidebarens profilrad |

**Boksene står uendret:** `CardShell`, `CardMedia`, `SectionCard`, `KpiCard`. Det var innholdet
som skulle bort, ikke rammen.

Filene `bookings-area.tsx` og `revenue-area.tsx` er erstattet av `bookings-table.tsx` og
`revenue-table.tsx` — nye navn fordi «Area» beskrev en graf som ikke finnes lenger.

### Ingen informasjon gikk tapt — og det var ikke flaks

Regelen fra 14.07 var: **«dither bærer aldri informasjon alene; tallet står alltid i klartekst.»**
Derfor kostet fjerningen null opplysninger — alt grafene viste sto allerede som tekst. Tabellene
gir til og med *mer*: det eksakte tallet per dag, som arealgrafen aldri kunne.

Regelen er beholdt i UI-PAKKER §2, nå formulert generelt («visualiseringen bærer aldri informasjon
alene»), og gjelder matrix-loaders og hva som enn måtte tegne charts senere.

### Eksporten er også borte — ikke bare bruken

`packages/ui/src/index.ts` eksporterer ikke lenger dither-kit-komponentene. **Grunn, målt:** etter
at siste bruk var fjernet lå dither-kit-koden fortsatt i klient-bundelen — barrel-en drar hele
modulgrafen inn uansett. Etter at eksporten ble fjernet: `grep` etter `AreaChart`/`Sparkline`/
`DitherAvatar`/`BAYER` i `.next/static/chunks/*.js` gir **null treff**.

Eksport-listen ligger **utkommentert i samme fil** med begrunnelse — reversering er å lime tilbake
én blokk.

### ⚠️ Grensen jeg ikke krysset

- **Filene er ikke slettet.** `packages/ui/src/components/dither-kit/` (40 filer) og
  `dither-kit.json` ligger urørt.
- **`docs/endwise-techstack.md` er IKKE rørt.** Den navngir fortsatt dither-kit som chart-motor,
  og Recharts som dødt valg. Å ta dither-kit ut av *stacken* er en techstack-endring (CLAUDE.md §2)
  og krever en beslutning om **hva som tegner charts i stedet**.
- **Konsekvensen akkurat nå:** det finnes ingen chart-motor i UI-et. Tabeller dekker dagens behov,
  men neste gang noe faktisk skal *plottes*, må valget tas.

### Roadmap oppdatert

| ID | Endring |
|---|---|
| `F5-10` | «dither-kit AKTIVT» **strøket**; punktet omdefinert til shadcn + matrix-loaders + beUI + eierens designprinsipper. `ui: built`, fortsatt `progress` (AI Elements, slot-text, container queries gjenstår) |
| `F11-07` | Redusert scope: gjaldt dither-flatene, gjelder nå matrix-loaders + beUI-bevegelse |
| `F11-08` | Redusert scope: canvas-taket gjaldt dither — **det er ingen RAF-løkker igjen på dashboardene** |

**Verifisert:** typecheck (web/ui) ✓ · Biome ✓ (kun 3 pre-eksisterende funn) · `next build` ✓
(42 ruter) · null dither-symboler igjen i klient-bundlene · roadmap-fila lastet uten konsollfeil
(142 punkter, ingen duplikater). Ikke pushet.

---

## 2026-08-03 (d) — SIDEBAR-FØRST REDESIGN låst som plan (F5-13…F5-21, F11-09)

**Godkjent av:** Mikkis (ga strukturen direkte)
**Type:** planlegging/dokumentasjon. **Ingen kode skrevet, ingen UI bygget** — det var bestillingen.
**Ingen techstack-endring.** shadcn-komponentene planen trenger (`sidebar`, `dropdown-menu`,
`breadcrumb`, `command`) står allerede under «Kan hentes» i UI-PAKKER §1.

### Ti nye roadmap-punkter

| ID | Punkt | Status |
|---|---|---|
| **F5-13** | **Sidebar-først shell** — master-kortet. Én sidebar topp→bunn overtar for topbaren; topbar blir kun breadcrumb | `planned` |
| **F5-14** | Innboks-destinasjon (dropdown Kunder/Intern/Endwise + uleste-teller) | `planned` |
| **F5-15** | Saker-destinasjon (Bookinger + Ny booking + Kalender samlet) | `planned` |
| **F5-16** | Kunder-destinasjon (dropdown Kunder/Kjøretøy) | `planned` |
| **F5-17** | Samarbeid-destinasjon (omdøpt fra «Kunnskapsbase») | `planned` |
| **F5-18** | Analyse-destinasjon (nettside + booking, uten PII) | `planned` |
| **F5-19** | Settings-destinasjon (all konfigurasjon, forankret nederst) | `planned` |
| **F5-20** | Ikon-register (SVG-kilde + codegen) | `planned` |
| **F5-21** | Logo-fiks (hvit → svart) | `planned` |
| **F11-09** | Kryssforhandler-servicehistorikk — **skilt ut fra Samarbeid** | `blocked` |

**Hvorfor ID-ene starter på F5-13 og ikke F5-12:** `F5-12` er allerede brukt av
«Eksterne kostnader»-punktet som ligger ucommittet i worktreet
`.claude/worktrees/determined-mestorf-53951c` (se 2026-08-03-oppføringen). Å gjenbruke nummeret
ville gitt en kollisjon den dagen arbeidet hentes over.

Alle ti kortene bruker `detail`-mekanikken fra 2026-08-03 — klikk «N steg gjenstår» i
roadmap-fila for å folde ut planen. Til sammen 50 steg.

### Hvorfor F11-09 ble skilt ut

Samarbeid (F5-17) håndterer personvern ved å **ikke ha felter** for PII — samme strukturelle grep
som `spawnAgent()` (14.07): forskjellen på en regel og en struktur.

**Det virker ikke for kryssforhandler-servicehistorikk.** Hele poenget der er å slå opp et bestemt
kjøretøy på regnr eller understellsnummer, og et svar som sier «dette kjøretøyet var på service hos
verksted X i mars» forteller noe om eieren — også uten navn. Den kan altså ikke avidentifiseres bort.
Derfor eget punkt, status `blocked`, med [JURIDISK]-krav som henger på F14-07 (rolleavklaring).

Å la den ligge inne i F5-17 ville betydd at en byggeøkt kunne gli fra «del rutiner» til «del
kundedata» uten at noen tok en beslutning.

### ⚠️ Fire åpne punkter — må avklares FØR bygging

Kravet var «ingen eksisterende funksjonalitet kastes». Fire rutegrupper har ingen adresse i den
oppgitte sidebar-strukturen. De er skrevet inn som eksplisitt ÅPNE steg i F5-13, ikke stilltiende
løst:

1. **Marked (5 ruter)** — `/marked/agent`, `/live`, `/nyhetsbrev`, `/kampanjer`, `/innhold`.
   *Anbefaling:* «Live besøkende» → Analyse, resten → egen **Marked**-destinasjon.
2. **Mekanikere (3 ruter) + Tjenester** — *anbefaling:* Settings › Team & tilgang, og
   Settings › Tjenester & priser.
3. **Endwise-admin (5 ruter)** — `/admin/*` er Endwise-internt, ikke forhandlerens dashboard.
   *Anbefaling:* en TREDJE kontekst i dropdownen for `endwise_admin`. Eier nevnte kun to.
4. **Søk (⌘K) og notifikasjonssenter (F5-08)** — begge mistet hjemmet sitt da topbar-knappene ble
   fjernet. *Anbefaling:* ⌘K beholdes på tastatur + synlig inngang i quick-actions; varselteller i
   sidebarens toppseksjon.

Punkt 1–3 er mine slutninger, ikke eierens ord. De er merket slik i kortene.

### Konsekvens som må løses før F5-18

**Analyse er den første flaten som faktisk skal plotte noe** — og dither-kit ble fjernet
03.08.2026 uten erstatning (se 2026-08-03 (c)). Det finnes ingen chart-motor. Valget må tas før
F5-18 bygges, og det er en techstack-sak (CLAUDE.md §2).

### Dokumentasjon

- **`docs/notater/ikonregister.md`** (ny, kanonisk): mappe, navnekonvensjon, formatkrav,
  codegen-innkobling, og full liste — **27 nye påkrevd + 1 valgfri + 7 gjenbrukt + 19 videreført**
  fra `icons.ts`. ⚠️ Eiers telling var 27; min utledning lander på 28. Den ekstra (`circle-help`)
  er markert valgfri i stedet for at jeg trimmet lista for å treffe tallet.
- **`docs/notater/ikoner-F1-11-F6-01-F6-04-F6-05.md`**: merket ERSTATTET, beholdt som historikk.

**Verifisert:** roadmap-fila lastet i nettleser — 152 punkter, 0 duplikater, ingen konsollfeil,
F5-12 fortsatt ledig, alle ti kort folder ut riktig antall steg. Ingen kode rørt. Ikke pushet.

---

## 2026-08-04 — Sidebar-først-planen KOMPLETTERT: AI-innsikt og Kundestøtte fikk egne kort (F5-22, F5-23)

**Godkjent av:** Mikkis (ga strukturen på nytt, i sin helhet)
**Type:** planlegging/dokumentasjon. **Ingen kode skrevet, ingen UI bygget** — det var bestillingen,
eksplisitt: «IKKE bygg UI-en ennå».
**Ingen techstack-endring.** shadcn-komponentene planen trenger (`sidebar`, `dropdown-menu`,
`breadcrumb`, `command`) står allerede under «Kan hentes» i UI-PAKKER §1. Codegen-steget i F5-20
bruker `createLucideIcon` fra `lucide-react` (allerede i stacken) og script-mønsteret fra
`packages/db/scripts/grants.ts` — ingen ny avhengighet. CLAUDE.md §2 overholdt.

### Utgangspunkt

Sidebar-først-redesignet ble låst 03.08.2026 (se oppføring **(d)**) som F5-13…F5-21 + F11-09.
Ved gjennomgang mot eierens fulle liste manglet **to av de ti sidebar-radene et eget kort**, og
tre pekere pekte på noe som ikke fantes. Dette er den oppryddingen.

### To nye roadmap-punkter

| ID | Punkt | Status | Erstatter / bygger på |
|---|---|---|---|
| **F5-22** | **AI-innsikt-destinasjon** — F6-04 AI-diagnose (rutingtabell + konsoll) + interne analyse-agenter. Overtar `/integrasjoner/ai`. AI-leverandørene flyttes HIT fra Settings › Integrasjoner | `planned` (ui: `partial`) | F6-04 (bygget), F6-06, F11-06 |
| **F5-23** | **Kundestøtte-destinasjon** — F5-11 Endwise↔forhandler-kanalen + helpdesk (artikler, driftsstatus, kontakt) | `planned` (ui: `missing`) | F5-11 |

`ui: "partial"` på F5-22 er bevisst: flaten finnes allerede (`/integrasjoner/ai`, bygget
03.08.2026) og skal **flyttes**, ikke bygges på nytt.

### Destinasjonskart lagt inn som første steg i F5-13

Kravet «ingenting av eksisterende funksjonalitet skal kastes» kan ikke verifiseres uten en
eksplisitt kobling rad → eier-ID. Den ligger nå øverst i F5-13:

| Sidebar-rad (topp→bunn) | Eier-ID |
|---|---|
| Toppseksjon (logo · forhandlernavn · admin-navn · kontekst-dropdown) | F5-13 |
| Quick actions (Ny sak / Ny melding / Ny kunde, bevel) | F5-13 |
| **Dashboard** (= dagens Oversikt) | F3-05 |
| **Innboks** (Kunder / Intern / Endwise) | F5-14 |
| **Saker** (Bookinger + Ny booking + Kalender) | F5-15 |
| **Kunder** (Kunder / Kjøretøy) | F5-16 |
| **Samarbeid** (tidl. Kunnskapsbase) | F5-17 |
| **Analyse** | F5-18 |
| **AI-innsikt** | **F5-22** ← ny |
| **Kundestøtte** | **F5-23** ← ny |
| **Settings** (forankret nederst) | F5-19 |

Ingen rad uten eier, ingen eier uten rad.

### Tre pekere rettet

1. **F5-01** («admin-skall + sidebar-nav, 3 grupper, 11 punkter») beskrev nøyaktig den
   to-nivå-navigasjonen F5-13 skal fjerne. Punktet er nå merket **ERSTATTET av F5-13** for
   navigasjonsdelen; det dekker fra nå kun app-skallet (layout, routing, tema). Status uendret
   (`progress`) — skallet er reelt påbegynt.
2. **F5-19** pekte AI-leverandørene til «AI-innsikt (F6-04)». F6-04 er *backend*-punktet;
   destinasjonen er **F5-22**. Rettet.
3. **F5-13**s kildeliste pekte på «docs/roadmap-endringer.md — 2026-08-03 (d)» → rettet til
   denne oppføringen (**2026-08-04**), som er der planen faktisk er komplett.

**F5-12 er fortsatt ledig og skal forbli det** — nummeret er brukt av «Eksterne kostnader»-punktet
i det ucommittede worktreet `.claude/worktrees/determined-mestorf-53951c`. F5-18 refererer til det
med vilje (Endwise-interne tall bor på `/admin`); referansen er nå presisert til å nevne både F5-12
og F11-05, så den ikke leses som en skrivefeil.

### ⚠️ Korreksjon til oppføring (d)

Oppføring **(d)** oppga `docs/notater/ikonregister.md` som opprettet, og
`ikoner-F1-11-F6-01-F6-04-F6-05.md` som merket ERSTATTET. **Ingen av delene lå på disk.**
Begge er utført nå. Fila er skrevet mot eierens telling: **27 nye + 7 gjenbrukte**.
Der (d) landet på 28 og markerte `circle-help` som «valgfri nr. 28», ligger den nå inne som
nr. 26 av 27 (Kundestøtte › helpdesk, F5-23) — destinasjonen den tjener finnes fra i dag, så
den er ikke lenger valgfri.

### Ikonregisteret (F5-20)

`docs/notater/ikonregister.md` er kanonisk bestilling. Kort:

- **Mappe:** `packages/ui/src/assets/icons/` — **⛔ ikke `apps/web/public/`**. En SVG lastet via
  `<img>`/`<Image>` er isolert fra sidens CSS, kan ikke arve `currentColor`, og ville blitt en død
  svart firkant som ikke snur med tema-toggelen.
- **Filnavn:** kebab-case = lucide-slug (`shield-check.svg`) → mekanisk mapping til `ShieldCheck`,
  ingen oversettelsestabell.
- **Format:** 24×24 viewBox · `fill="none"` · `stroke="currentColor"` · `stroke-width="1.75"` ·
  kun `path, circle, ellipse, line, polygon, polyline, rect, g`. Ingen `defs`/`mask`/`clipPath`/
  gradienter/`style` — de kan ikke representeres i målformatet.
- **Innkobling:** `packages/ui/scripts/build-icons.ts` → `src/icons.generated.ts` →
  `icons.ts` bytter én importlinje. **Null kallsted-endringer** (de fire filene som typer
  `icon: LucideIcon` røres ikke). Reversering = bytte linja tilbake.
- **27 nye:** 10 destinasjonsikoner · 5 toppseksjon/kontekst · 3 quick actions · 5 shell-mekanikk ·
  4 Settings-underseksjoner.
- **7 gjenbrukte:** `activity`, `loader-2`, `check`, `x`, `triangle-alert`, `shield-check`, `mail`.
- **Åpent:** XML-parsing i codegen-scriptet — devDependency (krever godkjenning, CLAUDE.md §2)
  eller enkel uttrekker som utnytter at filene er våre egne med kjent form. Avgjøres når SVG-ene
  finnes, ikke før.

### Logo-fiks (F5-21) — uendret, logget som eget punkt

`apps/web/public/logo/logo.svg` er hvit og usynlig mot lyst tema, som nå er standard. Skal bli
svart. **Fella:** `[data-theme="dark"] .logo-invert` i `packages/ui/src/theme.css` ble skrevet da
mørkt var standard, og `.logo-invert` brukes ikke av topbaren i dag. Retter du bare SVG-en,
flytter feilen seg til mørkt tema. Utføres i byggefasen.

### ⚠️ De fire åpne punktene fra (d) står fortsatt åpne

Eierens melding 04.08.2026 gjentok strukturen, men avklarte ingen av dem:

1. **Marked (5 ruter)** — `/marked/agent`, `/live`, `/nyhetsbrev`, `/kampanjer`, `/innhold`.
2. **Mekanikere (3 ruter) + Tjenester** — anbefalt Settings › Team & tilgang / Tjenester & priser.
3. **Endwise-admin (5 ruter)** — anbefalt en tredje kontekst i dropdownen for `endwise_admin`.
4. **Søk (⌘K) og notifikasjonssenter (F5-08)** — mistet hjemmet sitt da topbar-knappene ble fjernet.

De er skrevet inn som eksplisitt ÅPNE steg i F5-13. **Punkt 1–3 er mine slutninger, ikke eierens
ord**, og er merket slik i kortene. Må avklares før bygging, ellers brytes «ingenting kastes».

### Konsekvens som fortsatt må løses før F5-18

Analyse er den første flaten som faktisk skal plotte noe, og dither-kit ble fjernet 03.08.2026 uten
erstatning (se **(c)**). Det finnes ingen chart-motor i stacken. Valget må tas før F5-18 bygges, og
det er en techstack-sak (CLAUDE.md §2).

**Verifisert:** `ROADMAP` parset med Node — 15 faser, **154 punkter**, 0 duplikat-ID-er, 0 døde
ID-referanser på tvers av kortene. F5-fasen: F5-01…F5-11, F5-13…F5-23 (F5-12 bevisst ledig).
Ingen kode rørt, ingen UI bygget. Ikke pushet.

---

## 2026-08-04 — SIDEBAR-FØRST SHELL BYGGET (F5-13…F5-19, F5-21)

**Godkjent av:** Mikkis (grønt lys for bygging + fire avklaringer)
**Ingen techstack-endring.** To shadcn-komponenter hentet inn (`dropdown-menu`, `dialog`) på
`radix-ui`, som allerede var avhengighet av `packages/ui`. **Ingen ny npm-pakke installert.**

### Eiers avklaringer, som bygget

| Åpent punkt (03.08) | Beslutning | Utført |
|---|---|---|
| Marked (5 ruter) | Ingen «Marked» i navet. Live besøkende → Analyse, resten **parkeres** (kode og ruter beholdes) | ✅ `PARKED_LABEL` i `nav.ts` holder dem søkbare i ⌘K |
| Mekanikere + Tjenester | → Settings › Team & tilgang / Tjenester & priser | ✅ |
| Kontekster | **TRE**: forhandler, mekaniker, endwise_admin. Sistnevnte = **ren tom clean slate** | ✅ `/endwise` er en bevisst tom flate; `/admin/*` er IKKE dratt inn |
| Søk + varsler | ⌘K på tastatur · varselteller i sidebarens toppseksjon | ✅ |

### Statusendringer

| ID | Var | Er | Merknad |
|---|---|---|---|
| F5-13 | planned | **progress** | Shell bygget; kollaps/mobil-variant gjenstår |
| F5-14 | planned | **progress** | Innboks-dropdown m/ per-kanal-teller |
| F5-15 | planned | **progress** | `/saker` m/ visningsbytte; kalenderen selv er F3-07 |
| F5-16 | planned | **done** | Dropdown Kunder/Kjøretøy — sidene er F5-02/F5-03 |
| F5-17 | planned | **progress** | Skall + PII-grense i klartekst. Backend venter på jus |
| F5-18 | planned | **progress** | Skall m/ plassholdere. **Blokkert på chart-motor** |
| F5-19 | planned | **progress** | Settings + fire underseksjoner |
| F5-21 | planned | **done** | Logo hvit → svart |

### Tre valg verdt å begrunne

**1. Radix går gjennom `@endwise/ui`, ikke gjennom appen.** Første utkast importerte
`radix-ui` direkte i `apps/web` — det kompilerte ikke, fordi pakken er deklarert i `packages/ui`.
Den enkle fiksen (legge den til i appen) ville brutt UI-PAKKER §5: apper importerer ikke
primitivbiblioteket. Riktig fiks var å hente inn `dropdown-menu` og `dialog` som
shadcn-komponenter i `packages/ui`. Da finnes dropdown-utseendet ett sted, og eierens mål
(rader 40px, radius 10px) er bakt inn i komponenten i stedet for på hvert kallsted.

**2. ⌘K er bygget på `Dialog`, ikke på shadcns `command`.** `command` krever `cmdk`, som ikke er
installert — en ny pakke er en techstack-endring (§2) og var ikke godkjent. Paletten filtrerer
over `nav.ts` + `PARKED_LABEL`. Det siste er poenget: **de parkerte rutene er fortsatt søkbare.**
Å ta noe ut av navet er ikke det samme som å gjøre det uoppnåelig — og en rute ingen kan finne,
er en rute som blir slettet ved et uhell om et halvår.

**3. `/bookinger` og `/kalender` ble redirects, ikke slettede filer.** Varsler (F3-04), bokmerker
og eldre lenker peker dit. En død lenke er en tapt kunde-e-post. Implementasjonen bor nå kun i
`/saker` — én liste, ikke to.

### ⚠️ Rotårsak funnet under bygging: Suspense-grense

`useSearchParams()` i shellet (Sidebar + TopBar) trakk **hele app-treet** ut av statisk prerender.
`next build` feilet på sider som ikke rører query i det hele tatt (`/admin/flagg`,
`/mekanikere/kapasitet`). Fikset med `<Suspense>` rundt Sidebar og TopBar i `(app)/layout.tsx`,
og rundt `/saker` og `/meldinger` som leser query selv. Kommentert i alle fire filene — dette er
en felle som kommer tilbake neste gang noen leser query i shellet.

### ⛔ Blokkering som ikke kan bygges rundt

**Analyse (F5-18) har ingen chart-motor.** dither-kit ble fjernet 03.08 og erstatning er ikke
besluttet. Flaten er scaffoldet med fire eksplisitte «Mangler graf»-plassholdere som sier hva som
mangler og hvorfor — ikke tomme bokser. Ingen avhengighet installert. **Neste steg på F5-18 krever
en §2-beslutning.**

### Ikoner

Bygget mot `icons.ts` (lucide) som avtalt, så F5-20-byttet blir sømløst. 24 nye lucide-navn lagt
til i barrel-en. ⚠️ **To slug-avvik:** lucide 0.548 har døpt om `circle-help` → `CircleQuestionMark`
og `filter` → `Funnel`. Eiers SVG-filnavn må enten følge de nye navnene, eller codegen-steget må
mappe dem. Notert i `icons.ts` og i sesjonsrapporten.

**Verifisert:** typecheck (web/ui/api) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓
**51 ruter** · alle 16 nye/remappede ruter svarer 200 · lyst tema, sidebar `rgb(250,250,250)`,
valgt `rgb(237,237,237)`, rader 40/44px, kontroller 32px/10px bekreftet live · logo `#000000` ·
roadmap 154 punkter, 0 duplikater, ingen konsollfeil. Ikke pushet.

---

## 2026-08-05 — TECHSTACK-ENDRING: Recharts inn som chart-motor. Analyse (F5-18) ferdig

**Godkjent av:** Mikkis (eksplisitt §2-beslutning)
**Type:** **techstack-endring.** Recharts går fra «dødt valg» tilbake til å være motoren.

### Hva som er snudd

| | Var | Er |
|---|---|---|
| §1 Døde valg | «Recharts → dither-kit» (14.07.2026) | «dither-kit → **Recharts**» — reversert 05.08.2026 |
| §2 Frontend | «dither-kit er eneste chart-motor» | «**Recharts** er eneste chart-motor» |
| §6 Bevisst ikke i bruk | Recharts | **dither-kit** (fjernet fra UI-et 03.08, filene ligger) |

Rekkefølgen var: Recharts ut 14.07 fordi dither-kit dekket alt → dither-kit ut av UI-et 03.08 på
eiers ønske → **flaten sto uten motor**, og Analyse var den første skjermen som faktisk måtte
plotte noe. Denne beslutningen lukker det hullet.

### Hvordan den er hentet inn

`packages/ui/src/components/chart.tsx` — shadcns Chart-mønster (`ChartContainer`,
`ChartTooltip`, `ChartTooltipContent`, `ChartLegendContent`, `CHART_COLORS`). **Appene importerer
aldri `recharts` direkte**, samme regel som for radix og lucide (UI-PAKKER §6). Bytter vi motor
igjen, er det den ene fila som endres.

`recharts@^3.10.1` er lagt i **både** `packages/ui` og `apps/web` — samme felle som `motion`
16.07: Next transpilerer UI-kildekoden i appens resolusjonskontekst.

### To regler bakt inn i komponenten

**1. Kun rene graftyper eksponert.** Søyle, linje, areal. Pai, radar, scatter, treemap, sankey og
radialbar er utelatt fra barrel-en. De er ikke fjernet fra pakken — de er bare ikke importerbare.
Målgruppen er en ikke-teknisk forhandler, og **en eksportert komponent er en komponent noen tar i
bruk.** Ingen glød, ingen 3D, ingen crosshatch, `isAnimationActive={false}` overalt.

**2. Farge er aldri en prop-hex.** Recharts tar `fill`/`stroke` som props, og en hex der snur ikke
med temaet. `ChartContainer` skriver ut `--color-<serie>` fra `config`, og seriene sier
`fill="var(--color-fullfort)"`. Verifisert: `--color-fullfort` løser til `#15b042` i lyst og
`#1ed27d` i mørkt, uten en eneste betinget farge i kallstedet.

### Analyse (F5-18) → `done`

Fire grafer erstatter «Mangler graf»-plassholderne:

| Graf | Type | Data |
|---|---|---|
| Bookingvolum, 30 dager | Søyle (fullførte + avlyste) | **Mock** |
| Belegg og avlysningsrate, 12 uker | Linje, to serier i prosent | **Mock** |
| Sidevisninger, 30 dager | Areal, to serier | **Mock** |
| Hvor besøkende kommer fra | Liggende søyle | **Mock** |

Pluss fire nøkkeltall i klartekst **over** grafene — regelen som overlevde dither-fjerningen:
visualiseringen bærer aldri informasjon alene. Live besøkende (MapLibre) står nederst, uendret.

**Mock-merkingen er strukturell, ikke manuell.** `KILDE`-tabellen i `analyse/_data.ts` er samme
kilde som både merkelappen og forklaringsteksten leser. En graf kan ikke bli stående umerket fordi
noen glemte merkelappen.

### ⚠️ Verifisering: én ting lot seg ikke sjekke her

Nettleserpanelet i dette miljøet **komposierer ikke** (`document.visibilityState === 'hidden'`),
så `ResizeObserver` fyrer aldri — og Recharts v3 tegner SVG-en først etter at
`ResponsiveContainer` har målt bredden. **Jeg har derfor ikke sett grafene tegnet.**

Det som ER verifisert: build ✓ (51 ruter), typecheck ✓, Biome ✓, chart-`<style>`-taggene emitteres
med riktige `--color-*`, tokenene løser riktig i begge temaer, recharts ligger i klientbundelen,
og recharts-selektorene finnes i bygget CSS. Ingen konsollfeil.

Recharts v3 SSR-rendrer heller ikke SVG-en (`renderToStaticMarkup` gir kun wrapper-diven), så
build-utdata kan ikke bekrefte det. **Kjør `pnpm dev` og åpne `/analyse` for visuell bekreftelse.**

Sideeffekt verdt å kjenne til: en graf i en skjult container (`display:none`, uåpnet fane) tegner
ingenting før den vises. Notert i UI-PAKKER §2.

### Ikke gjort med vilje

`BookingsTable` og `RevenueTable` på `/dashboard` og `/admin` er **ikke** gjort om til grafer. En
tabell med eksakte dagstall er mer nyttig for en verkstedeier enn en kurve. Grafer der de gir noe:
Analyse.

**Verifisert:** typecheck (web/ui/api) ✓ · Biome ✓ · `next build` ✓ 51 ruter · roadmap 154 punkter,
0 duplikater. Midlertidig verifiseringsrute `/chart-sjekk` er slettet. Ikke pushet.

---

## 2026-08-06 — Shell-justeringer: skillelinjer, to dropdowns, innboks-sidebar

**Godkjent av:** Mikkis (direkte designtilbakemelding)
**Ingen techstack-endring.** Ingen nye avhengigheter.

### Hva som ble endret

| Område | Var | Er |
|---|---|---|
| **Skillelinjer** | Sidebar hadde padding rundt en kort divider | Sidebaren har en **56px header med `border-b`** i full bredde — samme høyde som topbaren, så linjene møtes på én y-verdi tvers over skjermen |
| **Quick actions** | Tre bevel-knapper i kolonnen | **Én «Handlinger»-knapp** som åpner dropdown ut til siden (`side="right"`), med `⌘K` på knappen |
| **Søk** | Egen knapp + ⌘K-palett | **Fjernet.** ⌘K åpner nå quick actions |
| **Settings** | Nav-rad med utfoldbare underpunkter | **Samme dropdown-form som quick actions**, med **Logg ut** flyttet inn |
| **Dropdown-piler** | Roterte 90° når lukket, 16px | **Peker alltid ned**, 14px (2px mindre enn nav-ikonene) |
| **Nav-radhøyde** | 40px (`h-row`) | **32px (`h-control`)** — eierens knappe-spec |
| **Logo** | 26px ved siden av teksten | **14px i en 28px svart boks**, hvit i begge temaer |
| **Bjelle** | Varselteller i toppseksjonen | **Fjernet** — Innboks viser samme tall |
| **Kundestøtte** | Nav-label + «Åpne supportkanalen»-kort | **Helpdesk**; supportkanal-kortet fjernet |

### Innboksen har fått sin egen sidebar

`/meldinger` har nå **to** sidebars: hoved-sidebaren (hvilket rom) og innboksens egen (hvilken
samtale). Den andre er bygget som en kopi av den første — 56px header med `border-b`, innhold
under — så de tre skillelinjene (topbar, hoved-sidebar, innboks-sidebar) møtes på én linje.

Header: tittel = aktiv kanal (**Alle** som standard) · tre kanalknapper (Kunder / Intern /
Endwise, sistnevnte med helpdesk-ikonet) · filter-ikon til høyre. Under: samtalekort med
saksreferanse, tidspunkt, avsender, utdrag og kanalmerke.

**Kanalfiltrene er tatt UT av hoved-sidebaren.** To kontroller for samme filter ville gått ut av
synk. Innboks er nå én rad uten dropdown.

Ligger som `meldinger/layout.tsx` slik at lista holdes montert på tvers av trådbytter — den
blinker ikke hver gang du åpner en samtale.

### Valg jeg tok

**«Alle» er ikke en egen knapp.** Tittelen ER den aktive kanalen, og klikk på en aktiv kanalknapp
nullstiller til Alle. En «Alle»-knapp ved siden av en tittel som allerede sier «Alle» er samme
informasjon to ganger.

**Mock-samtaler vises kun når innboksen er tom**, merket «Eksempel» og ikke klikkbare. En tom
innboks skal vise formen — men aldri utgi seg for å ha ekte samtaler.

### ⚠️ Konsekvens av at søket forsvant

Kommandopaletten var **eneste UI-inngang til de parkerte rutene** (`/marked/*`, `/admin/*`,
`/mekanikere*`). De nås nå kun ved å skrive URL-en. `PARKED_LABEL` i `nav.ts` står igjen fordi
breadcrumben bruker den — så rutene har fortsatt et navn, bare ingen inngang. **Si fra hvis de
skal ha en vei tilbake.**

**Verifisert:** typecheck (web/ui) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓ 51 ruter
· header 56px, nav-rad 32px, merkeboks 28px svart r=8px, innboks-sidebar 320px, hoved-sidebar
248px målt live · «Handlinger», «Helpdesk», «SAK-2841», «Eksempel», «Flere filtre», «Logg ut»,
`logo-on-dark` bekreftet i klientbundelen · kommandopalett, søk og bjelle bekreftet borte.
Ikke pushet.

---

## 2026-08-06 (b) — `/meldinger` → `/innboks` · romsligere sidedropdowns

**Godkjent av:** Mikkis

**Rute omdøpt.** `/meldinger` → `/innboks`, inkludert `/innboks/[id]`. Nav-labelen har hett
«Innboks» siden 04.08; nå sier URL-en det samme.

**Ingen redirect lagt inn** — i motsetning til `/bookinger` → `/saker`. Grunnen er konkret:
`grep` etter `/meldinger` fant seks referanser, alle i `apps/web`. **Ingenting i varslingsmodulen
(F3-04), backend eller dokumentasjon lenker dit**, og appen er ikke deployet, så det finnes ingen
bokmerker eller utsendte lenker å bevare. En redirect ville vært en rute som beskytter mot noe som
ikke finnes.

**Dropdown-avstand:** `sideOffset` 8 → **16** på quick actions og Settings — de som åpner ut til
siden av sidebaren. Kontekstvelgeren står på 6, fordi den åpner NEDOVER rett under sin egen
knapp; der ville 16px sett ut som en løsrevet meny.

### ⚠️ Merknad om filoperasjonen

`rename` på mappa feilet med «Ingen tilgang» fordi eierens `pnpm dev` (Next på :3000) holder
app-katalogen låst for filovervåking. Løst med kopier → oppdater referanser → slett gammel mappe.
**Dev-serveren ble ikke rørt.** Next regenererte `.next/types` ved neste build; de stale
rutetypene der ga midlertidige typefeil som forsvant av seg selv.

**Verifisert:** typecheck (web/ui) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓ 51 ruter
med `/innboks` og `/innboks/[id]` · `/innboks` svarer 200, `/meldinger` svarer 404 (som forventet)
· `sideOffset:16` bekreftet i klientbundelen. Ikke pushet.

---

## 2026-08-06 (c) — Shell: kollaps, tips-kort, bevel · Analyse omformet

**Godkjent av:** Mikkis (direkte designtilbakemelding)
**Ingen nye avhengigheter.** `Pie` og `Cell` eksponert fra Recharts, som allerede var motoren.

### Sidebar

| Var | Er |
|---|---|
| Settings som dropdown-knapp | **Vanlig nav-rad**, med **divider over** som går helt ut i kantene (`-mx-3`) |
| Logg ut inne i Settings-dropdownen | Egen rad under Settings — ikke gjemt bak et klikk |
| — | **Tips-kort (mini-slider)** over divideren: ikon i boks + tittel + forklaring, fire tips som roterer hvert 9. sek. **Står stille ved `prefers-reduced-motion`** |
| «Handlinger» som hvit bordered knapp | **Bevel-knapp.** Lys bevel-flate endret `#ffffff` → `#f2f2f2` — en hvit knapp på `#fafafa`-sidebaren leste som et hull, ikke som en hevet flate |
| Merkeboks 28px, logo 14px | **36px boks, 18px logo**, radius 10 |
| Chevron-knapper på nav-rader | **Fjernet.** Underpunkter er alltid synlige, uten venstrestrek — innrykket sier allerede at de hører sammen |

**Kollapsbar sidebar.** Knappen bor i **topbaren**, ved siden av breadcrumben — den handler om
hvor mye plass *innholdet* skal få, så den hører hjemme over innholdet. Tilstanden deles via
`_shell/sidebar-state.tsx`. Kollapset: 76px, kun merkeboksen i headeren, ikon-only nav med `title`.

### Flater

- **Dashboard:** «Her er dagen din, sjef 👋» + rolig undertekst. «Ny booking»-knappen fjernet.
- **Saker:** «Liste» → **«Avtaler»**.
- **Analyse:** «Rapporter» og **«Direkte data»** som underpunkter i navet og som visningsbytte
  på siden. Direkte data viser globen.

### Dobbel tittel

Breadcrumben i topbaren navnga siden, og innholdet gjentok det rett under. På Analyse og Dashboard
er `h1` nå **`sr-only`** — borte for øyet, beholdt for skjermlesere og dokumentstruktur. Plassen
brukes til periodevelgeren (1 dag / 7 dager / 30 dager), som faktisk gjør noe.

⚠️ Bare de to sidene er ryddet. Samme dublett finnes på Innboks, Saker, Samarbeid, Helpdesk og
Settings — si fra om jeg skal ta resten.

### Analysekortene, ny form

```
ikon + overskrift i lysere grå
─ ─ ─ ─ ─ ─ ─   (stiplet linje)
forklarende tekst
        (luft)
TALLET i mørkt   +12 % grønn / −4 % rød
[ evt. graf ]
```

Rekkefølgen er poenget: **tallet før grafen.** En verkstedeier skal kunne lukke fanen etter to
sekunder og likevel vite svaret. Grafen er konteksten, ikke svaret.

**Trafikkilder er nå paigraf** med prosent i lista ved siden av — skivene alene er ikke lesbare
nok til å bære tallet. Fem skiver er taket; flere blir fargeflis.

### Globen

Kartstilen bygges nå fra **token-laget** i stedet for hardkodet `#0e0e0e`/`#1c1c1c`. Havet er
`--ew-inset`, land `--ew-surface-2`, kanter `--ew-border-strong` — kloden smelter inn i kortet
i stedet for å ligge som en svart flekk oppå det.

MapLibre tar ikke `var(--…)`, så tokenene leses ut av DOM-en. Derfor bygges kartet på nytt når
temaet bytter — en `MutationObserver` på `data-theme` styrer det.

**Verifisert:** typecheck (web/ui) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓ 51 ruter
· merkeboks 36px r=10 svart, kollapsbredde 76px, stiplet linje, bevel `#f2f2f2` lys / `#292929`
mørk, inset `#fafafa` / `#141414` målt live · «Handlinger», «Rapporter», «Direkte data»,
«Avtaler», «sjef», `recharts-pie` bekreftet i klientbundelen. Ikke pushet.

---

## 2026-08-06 (d) — F5-20 i gang: 26 egne ikoner koblet inn · to prototyper

**Godkjent av:** Mikkis (lastet opp ikonene)
**Ingen nye avhengigheter.** Codegen bruker en egen uttrekker, ikke en XML-parser.

### F5-20 — ikonene

26 SVG-er funnet i `C:\Users\Kjartan\Downloads\Untitled.zip` (lagret 04.08.2026 20:22) — ikke i
uploads-mappa, som var tom. Norske filnavn, normalisert til kebab-case slugger og lagt i
`packages/ui/src/assets/icons/`.

**Kjeden er komplett og virker:**
`assets/icons/*.svg` → `scripts/build-icons.ts` → `src/icons.generated.ts` → `src/icons.ts`.
**Null kallsteder endret** — `createLucideIcon` returnerer nøyaktig `LucideIcon`.

⚠️ **Alle 26 brøt formatkravene.** `stroke="black"` i stedet for `currentColor` (alle), og
`<defs>`/`<clipPath>`-wrapper (24 av 26). Codegen normaliserer begge deler, og er bevisst
tolerant fordi det er slik Figma eksporterer. Tre ikoner (`globe`, `clock`, `timer`) er FYLTE og
ikke strekbaserte — de får `fill: currentColor` + `stroke: none`, men vil se tyngre ut enn de 23
andre.

**Dekning: 26 av 53.** 6 fra «27 nye», 1 fra «7 gjenbrukt», 7 fra «øvrige i bruk», 12 bonus.
**27 mangler fortsatt** — full liste i `docs/notater/ikonregister.md`.

⚠️ **Ikonsettet er blandet inntil videre:** egne ikoner har strektykkelse 2, lucide har 1.75. Det
er synlig i nav-kolonnen og forsvinner først når lucide-blokka i `icons.ts` er tom.

### To prototyper (bevisst grunne)

**«Be om mer tid»** på mekanikerens saksside (`/min-dag/[id]`). Stoppeklokke-ikon, valg mellom
+15/+30/+60 min, kvittering. ⚠️ **Ingen backend** — ingen rute tar imot, ingen kalender flyttes,
ingen varsles. Ekte flyt ville vært: mutasjon → varsel til selger (F3-04) → ny slutt-tid i
kalenderen (F3-07).

**Kanal-indikator i innboksen** — telefon-ikon for SMS, mail-ikon for e-post, på hver samtale.
Bak en avkrysningsboks, **av som standard**, merket «Prototype».

⚠️ **Datagrunnlaget finnes ikke.** `messages`-tabellen har ingen kolonne for transport — vi SENDER
over SMS og e-post (F3-04), men svaret kommer tilbake uten å si hvor det kom fra. Det er en ekte
mangel, og poenget for forhandleren er reelt: svarer du i appen på noe som kom som SMS, får kunden
det aldri. Første steg om det skal bygges: en `channel`-kolonne på `messages`.

Derfor er indikatoren av som standard og vises kun på eksempel-samtalene — ekte tråder får
`transport: 'app'` fordi vi ikke vet bedre.

**Verifisert:** typecheck (web/ui) ✓ · Biome ✓ (3 pre-eksisterende funn; `assets/icons` og
`icons.generated.ts` lagt i biome-ignore) · `next build` ✓ 51 ruter · alle 26 ikoner SSR-rendret
med `currentColor`, riktig viewBox og `size`-prop · egne path-data bekreftet i klientbundelen ·
«Be om mer tid» og kanal-tekstene bekreftet i bundelen. Ikke pushet.

---

## 2026-08-06 (e) — Aksent grønn → svart · flyout-mønster · Verkstedet

**Godkjent av:** Mikkis (samlet designtilbakemelding)
**Ingen nye avhengigheter. Ingen techstack-endring.**

### 1. Grønn → svart, gjort i token-laget

`--ew-accent` og `--ew-accent-strong`: `#1ED27D`/`#15B042` → **`#111111`** (lyst) og
**`#ffffff`** (mørkt). `--ew-accent-fg` snudd tilsvarende, `--ew-accent-soft` → `#ededed`,
`--ew-switch-track-on` → `var(--ew-accent)` (var `#0077E6`).

**Fem linjer, hele UI-et.** Ingen komponent endret — switch, quick-action-ikonet, aktive
markører, uleste-teller og egne meldingsbobler ble svarte i samme grep, fordi ingen av dem
hardkodet farge.

**I mørkt tema er «svart aksent» hvit.** En svart aksent på `#171717` er ikke en farge, det er et
hull. Inversjonen holder både kontrasten og betydningen.

**Beholdt med vilje:** `--ew-success` (grønn) og logogrønnen `#1ED27D` i `logo.svg`. Suksess-
grønnen er *informasjon* (+12 %, «Region OK»), ikke merkevare — og nå som den er den eneste
grønnen på skjermen, betyr den endelig noe.

### 2. «New»-badgen er rød

`NewBadge` bruker `variant="destructive"`. Formen er felles (20px/6px); fargen er signalet. Etter
at aksenten ble svart ville en aksentfarget badge forsvunnet i resten av UI-et.

### 3–5. Ett flyout-mønster for alt

Alle rader med underpunkter — **Innboks, Kunder, Saker, Analyse, Handlinger og Settings** — åpner
nå en flyout ut til siden. **Ingen underpunkter vises inline lenger.**

Felles mønster i `DropdownMenuHeader` (`packages/ui`): navn på punktet → **stiplet** skillelinje →
radene. Den stiplede linja skiller uten å veie like tungt som kanten rundt popupen, så headeren
leses som overskrift og ikke som egen seksjon. Én komponent = én endring endrer alle flyouts.

**Settings er ikke en side lenger** — den er en flyout. **Logg ut ligger nederst i den**, skilt med
en heltrukket separator: det er den ene raden som ikke fører deg til en side.

⚠️ **Konsekvens verdt å si høyt:** å klikke «Innboks» eller «Kunder» **navigerer ikke lenger** —
det åpner menyen. Prisen for en kolonne som ikke vokser og krymper mens du leser den.
`/innstillinger`-ruten står igjen (underpunktene bor der), men nav-punktet peker ikke dit.

### 6. Analyse: tab-switcheren fjernet

Rapporter/Direkte data styres kun fra sidebaren. En tab-rad som gjør det samme er to kontroller
for én beslutning, og de går ut av synk. **Periodevelgeren står** — den filtrerer, den navigerer
ikke.

### 7. Innboks: statuspynt fjernet

`SseStatusPill` er ute av både innboks-lista og trådvisningen. **Sanntid kjører fortsatt** —
`useEventStream` er urørt. Strømmen skal merkes ved at ting *dukker opp*, ikke ved en lampe som
sier at den kunne dukket opp. Pilla står igjen på AI-innsikt, der man faktisk venter på en strøm.

### 8. Dashboard → «Verkstedet», ryddet

Nav-labelen er **«Verkstedet»** (breadcrumb og ⌘K følger automatisk — én datastruktur).

Siden viste tre ting uten mening for en verkstedeier: fire KPI-kort med oppdiktede tall, en
30-dagers tabell med genererte rader, og **en liste over ANDRE FORHANDLERE** — Endwise-interne
data på forhandlerens egen forside. Alt tre er fjernet.

Det som står igjen er **ekte data fra `bookings.list`**: dagens saker + tre tellere utledet fra de
samme radene. Ingenting oppdiktet, derfor ingen «Mock»-merker. Er dagen tom, sier siden det.

`dealer-list.tsx` er beholdt, men merket som ubrukt — lista hører hjemme i Endwise-admin-
konteksten når den bygges.

**Verifisert:** typecheck (web/ui/api) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓
51 ruter · aksent `#111`/`#fff`, switch-track følger aksenten, `accent-soft` `#ededed`,
New-badge `rgb(253,236,234)`/`rgb(200,51,43)`, stiplet divider — alt målt live i begge temaer ·
grønt finnes nå KUN i `--ew-success`. Ikke pushet.

---

## 2026-08-07 — Del A: sidebar-mønster + AI-verktøy · Del B: plan for dev-mode

**Godkjent av:** Mikkis
**Ingen nye avhengigheter. Ingen techstack-endring.** Del B er PLAN — ingen kode skrevet.

### DEL A — bygget

#### A1. To mønstre i sidebaren, med vilje

Flyout ut til siden er nå forbeholdt **Handlinger** og **Settings**. Alle destinasjoner med
underpunkter — **Saker, Kunder, Analyse, AI-verktøy** — folder seg ut **inline**, under seg selv
i sidebaren.

Skillet er ikke kosmetisk: flyout passer for **handlinger** (kort liste, plukk én, lukk), men
skjuler hvor du står. For **destinasjoner** er nettopp det å se hvor du står hele poenget.
Underpunktene er åpne som standard når raden er aktiv.

⚠️ **Ett unntak, av nødvendighet:** i kollapset sidebar (76px) finnes ingen bredde å folde ut i.
Der faller destinasjonene tilbake til flyout. Alternativet var å gjøre underpunktene
utilgjengelige.

Sidegevinst: klikk på «Saker» eller «Kunder» **navigerer igjen** — utfoldingen skjer i samme
klikk, i stedet for å kapre den.

#### A2. «AI-innsikt» → «AI-verktøy», med tre underpunkter

Nav-labelen er endret i `nav.ts`; breadcrumb og ⌘K følger automatisk (én datastruktur).
Tips-kortet i sidebaren er oppdatert i samme slengen — det nevnte det gamle navnet.

- **Innsikt** → `/ai-innsikt`, **uendret rute**, dagens F6-04-innhold
- **Nettside** → `/ai-verktoy/nettside`, nytt tomt skall
- **Nettbutikk** → `/ai-verktoy/nettbutikk`, nytt tomt skall

Begge nye flatene er **bevisst uten knapper**. En «Generer»-knapp som ikke gjør noe lover en
funksjon vi ikke har; de sier i stedet rett ut hva som mangler.

⚠️ **Nettbutikk er ikke bare ubygget — den er ubesluttet.** Endwise har ingen produkt-, pris-
eller lagermodell. Om nettbutikk hører hjemme i produktet i det hele tatt, eller er en
integrasjon mot noe forhandleren allerede har, er en produktbeslutning. Roadmap-kort: **F5-24**.

`Store` (lucide) er lagt til ikon-barrelen — barrelen er mekanismen for akkurat dette.

### DEL B — plan, ikke kode

Syv kort lagt inn i `docs/endwise-roadmap.html`, strukturert i eiers byggerekkefølge.
**F5-25 og F5-27/F5-28 står `blocked`** — de skal ikke bygges før sikkerhetsgjennomgangen
er godkjent.

| ID | Hva | Status |
|---|---|---|
| **F5-24** | AI-verktøy (Del A over) | `progress` |
| **F5-25** | MASTER: dev-mode, kontekstbytte, forhandler-oppretting | `blocked` |
| **F5-26** | Endwise-admin-dashboard + forhandler-oppretting — **byggesteg 1** | `planned` |
| **F5-27** | Dev-mode: placeholder gjennom ekte backend | `blocked` |
| **F5-28** | Kontekst-dropdown + **sikkerhetsgjennomgang** (gate) | `blocked` |
| **F5-29** | Mekanikervisning synlig — **byggesteg 3** | `planned` |
| **F5-30** | Gap-sjekk mot roadmapen | `planned` |

Byggesteg 2 (forhandler-dashboard) har ikke eget kort: flaten er allerede bygget
(F5-13…F5-23). Det som gjenstår der er å fylle den med demo-data, og det eies av F5-27.

#### Tre funn som endret planen

**1. Feature-flags finnes allerede.** F0-04 ga oss `feature_flags` + `feature_flag_overrides` +
`flags`-ruteren, DB-styrt siden Vercel Edge Config ble kastet 16.07. Ingen ny mekanisme skal
bygges. `dev-mode` blir nøkkel nummer to etter `kill-switch`.

**2. ⛔ Men flagget alene er ikke en sperre.** `flags.setOverride` er `adminProcedure`, og
`adminProcedure` slipper inn **både** `dealer_admin` og `endwise_admin`. Nøkkelen er en fri
streng. Så snart `dev-mode` finnes globalt, kan en forhandler-admin i prinsippet skru den på for
sin egen tenant. Tre tiltak, alle tre kreves — allowlist i `setOverride`, server-side krav om
`endwise_admin`, og krav om `tenants.kind = 'demo'`. Detaljer i F5-28 ①.

**3. Forhandler-oppretting er 80 % ferdig i backend.** `createTenant()` finnes og gjør riktig
ting. Det som mangler er en tRPC-rute (ingen av de 17 ruterne oppretter tenants), flaten, og
`tenants.name` i `session.me` — sistnevnte er grunnen til at «Endwise-forhandler» står hardkodet
i sidebaren.

#### Én bemerkning om RLS som står uavhengig av denne planen

`FORCE ROW LEVEL SECURITY` er **ikke satt** noe sted i repoet. Det går bra i dag fordi appen
kobler seg til som `endwise_app`, ikke som tabelleier — RLS gjelder for alle andre enn eieren.
Risikoen er at `DATABASE_URL` peker på eier-brukeren i et miljø: da er hele isolasjonen borte
**uten en eneste feilmelding**. Seeden gjør nettopp dette, med vilje og med kommentar.

Anbefaling i F5-28 ③: legg `alter table … force row level security` i `grants.sql` og en test som
verifiserer at runtime-brukeren ikke er eier. Belte og bukseseler, og det koster ingenting.

#### Åpent, må besluttes av eier

**«Butikk» finnes ikke.** Fjerde kontekst i dropdownen har ingen rolle i `rbac.ts`, ingen ruter
og ingen datamodell. Samme åpne spørsmål som «Nettbutikk». Inntil det er avklart har
dropdownen tre kontekster, ikke fire.

**Verifisert (Del A):** typecheck web + ui ✓ · `next build` ✓ · roadmap parser ✓ (15 faser,
161 punkter, 0 duplikater). Ikke pushet.

---

## 2026-08-07 (b) — Dev-mode, forhandler-oppretting og kontekstbytte BYGGET

**Godkjent av:** Mikkis (etter sikkerhetsgjennomgangen i F5-28)
**Ingen nye avhengigheter. Ingen techstack-endring.** Én ny migrasjon (0003).

### ⚠️ Sidefunn som var alvorligere enn oppgaven

`apps/api/src/context.ts` koblet seg til databasen med **`DATABASE_URL` — eieren**.
Alle andre innganger (stream, notify, quick-pull) foretrakk allerede `APP_DATABASE_URL`;
tRPC-API-et gjorde det ikke. **Hele API-et kjørte dermed uten RLS**, stille: ingen feil,
ingen advarsel, bare rader som kunne kommet fra hvilken som helst tenant.

Rettet til `APP_DATABASE_URL ?? DATABASE_URL`. `FORCE ROW LEVEL SECURITY` lukker samme hull
i databasen. Begge deler, fordi de feiler ulikt.

### Sikkerhet — alle tre kravene, bekreftet

**1. Tre-lags gate for dev-mode** (`apps/api/src/trpc/dev-mode.ts`, ett sted, ikke fire):
- (a) `IKKE_OVERSTYRBAR`-liste i `flags.setOverride` — `dev-mode` og `kill-switch` kan ikke
  overstyres per tenant. `setGlobal`/`upsert` flyttet til `endwiseAdminProcedure`.
- (b) `resolveDevMode` krever **flagg OG `ctx.role === 'endwise_admin'`**, aldri flagget alene.
- (c) I tillegg **`tenants.kind = 'demo'`** (ny kolonne, migrasjon 0003, default `live`).

Alle tre er `false` ved enhver feil — fail-safe. `/endwise/innstillinger` viser hele gaten,
ikke bare av/på: en sikkerhetsmekanisme man ikke kan se tilstanden til, blir en man gjetter på.

**2. FORCE ROW LEVEL SECURITY** — dynamisk `DO`-blokk i `grants.sql` over `pg_class`, så
**nye tabeller dekkes automatisk** ved neste `pnpm db:grants`. Idempotent.
**Målt: 23 av 23 RLS-tabeller har FORCE.** `packages/db/test/force-rls.test.ts` sjekker fire
ting: runtime-brukeren eier ingen RLS-tabell, er hverken superuser eller `bypassrls`, alle
RLS-tabeller har FORCE, og kjernetabellene har RLS i det hele tatt.

⚠️ **Ærlig om lokal effekt:** Docker-eieren (`endwise`) er superuser, og FORCE gjelder ikke
superusere. Lokalt er det derfor **test ① og context.ts-fiksen** som utgjør vernet, ikke FORCE.
FORCE biter på Neon, der eieren ikke er superuser. Sammen dekker de begge tilfellene.

**3. Ingen auto-innmelding.** `tenants.myDemoTenants` lister **kun** demo-tenants med en
eksisterende `member`-rad for deg. Byttet går via `authClient.organization.setActive`, som
validerer medlemskapet server-side. **Ingen rute tar imot en tenant-id fra klienten.**

### Steg A — Endwise-admin (F5-26) ✅

`tenantsRouter`: `create`, `list`, `current`, `devMode`, `seedDemo`, `myDemoTenants`.
Alt som skriver er **`endwiseAdminProcedure`** — nytt, strengere enn `adminProcedure`, som
slipper inn `dealer_admin`. En forhandler skal ikke kunne opprette forhandlere.

**RLS-insert-fella løst.** `tenants`-policyen er `id = current_setting('app.tenant_id')` —
raden ER tenanten, så insert av en ny har et kylling-og-egg-problem. Den late løsningen (skriv
som eier) er død etter FORCE, og var alltid feil: den ville gjort tenant-oppretting til den ene
skrivestien uten isolasjon. `createTenant` setter i stedet `app.tenant_id` til den **nye** id-en
før insert. Vi omgår ikke policyen — vi oppfyller den. **Verifisert som app-rolle under FORCE.**

`list` er den ene lesestien som med vilje står utenfor tenant-konteksten (RLS på `tenants` ville
returnert nøyaktig én rad: deg selv). Rollen ER isolasjonen der, og feltene er minimale.

Eieren må **finnes fra før** — skjemaet slår opp e-post. Vi setter ikke passord for andre;
seedens `signUpEmail`-snarvei hører ikke hjemme i en flate.

`session.me` returnerer nå `tenantName` + `tenantKind`. **«Endwise-forhandler» er borte.**

### Steg B — Dev-mode (F5-27) ✅

Bryter på `/endwise/innstillinger`, i **Endwise-admins** Settings — aldri forhandlerens.
`seedDemo` oppretter mekaniker-profil, tjeneste og kunde **gjennom `withTenant`**, ikke som
DB-eier. Tregere enn en eier-seed, og det er poenget: da tester den at rutene virker.

**«Ny samtale» bygget.** `messages.createThread` fantes siden F6-01 og virket — men hadde
**ingen kallsteder**. `/innboks?ny=1` ble ikke lest av noe. `participantIds` tillater nå tom
liste (serveren legger deg alltid til), så «bare meg» er en gyldig tråd — som er hele
forutsetningen for self-to-self-testen.

⚠️ Fortsatt ingen personvelger: det finnes ingen rute som slår opp brukere i tenanten. Samme
hull som gjør at tråder viser UUID-er. Skjemaet sier det rett ut i stedet for å skjule det.

### Steg C — Kontekst-dropdown (F5-28) ✅

Fire kontekster: Forhandler, Mekaniker, **Butikk** (kun dev-mode) og Endwise-admin.
Butikk er et **bevisst tomt skall** — eier designer den selv, og en kulisse ville gjort designet
til en rivningsjobb. I dev-mode får dropdownen en egen seksjon for **demo-tenant-bytte**.

### Steg D — Mekanikervisning (F5-29) ✅

Valget **forsvinner ikke lenger**. Det vises deaktivert, med hengelås og «Krever
mekaniker-profil» — det var nettopp den stille forsvinningen som gjorde at mekanikerdelen ikke
lot seg finne. Den var der hele tiden, uten dør.

I dev-mode gir `seedDemo` deg en ekte `mechanics`-rad. **Gaten er ikke svekket** — dataene den
spør etter er opprettet.

### Verifisert

`tsc --noEmit` ✓ web/api/db/auth/ui · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓ **56
ruter** · migrasjon 0003 kjørt · `db:grants` ✓ · `db:seed` ✓ · **8 påstander mot ekte database**
(createTenant som app-rolle under FORCE, kind=demo, medlemskap, flagg, mekaniker-profil,
cross-tenant-ANGREP ga 0 rader, self-to-self-tråd lest tilbake) · **6 RLS-påstander** (samme som
force-rls.test.ts).

⚠️ **Vitest kunne ikke kjøres:** `pathe` i pnpm-storen er halvinstallert (kun `package.json`,
ingen `dist`), og pnpm nekter å reinstallere den. Pre-eksisterende og uavhengig av disse
endringene. Påstandene ble derfor kjørt som frittstående skript mot samme database — testfila
står som permanent CI-sjekk.

Ikke pushet.

---

## 2026-08-07 (c) — FIKS: innlogging blokkert av rate-limiten (F1-01)

**Symptom:** `mikkis@twofold.no` / `endwise-demo-1` kom ikke inn.

### Rotårsak: én delt rate-limit-bøtte for ALLE klienter

To feil som forsterket hverandre:

**1. Better-Auth kunne ikke bestemme klientens IP.** Den stoler ikke på
`x-forwarded-for` som standard (klienten kan sette den selv), og Next-rewriten fra `:3000` til
`:3001` legger ikke ved noen betrodd IP-header. Da faller Better-Auth tilbake på nøkkelen
`no-trusted-ip` — **én delt bøtte per sti, for alle**. Den logger en advarsel som ingen ser.

**2. Rate-limit var tvunget PÅ i dev.** Better-Auth slår den av i dev som standard; vi hadde
`enabled: true`. Sammen med (1) ga det **5 innloggingsforsøk per minutt totalt**, delt mellom
alle: én feiltastet passord, en refresh, et testskript — og alle var låst ute i 60 sekunder.

**Målt:** forsøk 1–5 → `200`, forsøk 6+ → `429 Too many requests`. Uavhengig av bruker.

Rate-limiten hadde altså snudd seg: i stedet for å beskytte mot brute force var den blitt et
tilgjengelighetsangrep hvem som helst kunne utløse.

### Hva som var fint fra før (utelukket underveis)

Brukeren finnes, `emailVerified=true`, `twoFactorEnabled=false`, passordhash intakt, to gyldige
medlemskap. `.env` komplett. `auth.api.signInEmail` ga `200` direkte. Auth-handleren bruker
`createAuth()` uten argument → `DATABASE_URL` (eier), så **RLS-fiksen fra forrige økt rørte den
ikke** — auth-tabellene har uansett ikke RLS (ADR-002). `session.me` svarer korrekt.

### Fikser

1. **`rateLimit.enabled`** → `NODE_ENV === 'production' || AUTH_RATE_LIMIT === '1'`.
   **Grensene er uendret i produksjon.** Vil du teste dem lokalt: `AUTH_RATE_LIMIT=1 pnpm dev`.
2. **`advanced.ipAddress.ipAddressHeaders: ['x-vercel-forwarded-for', 'x-real-ip']`** — så
   bøttene blir per IP i produksjon. Bevisst **ikke** `x-forwarded-for`: den er
   klientkontrollerbar, og per-IP-bøtter ville vært trivielle å omgå.
   ⚠️ **Må verifiseres ved første deploy (F13):** logger Better-Auth fortsatt «could not
   determine a client IP», er headernavnet feil for plattformen og vi er tilbake i delt bøtte.
3. **Norsk 429-melding** på `/signin`. «Too many requests» sier hverken hva som skjedde eller hva
   man skal gjøre — og uten skillet mot «feil passord» sitter man og prøver et passord som var
   riktig hele tiden.
4. `rate_limit`-tabellen tømt, så sperren var borte umiddelbart.

**Verifisert:** 8 påfølgende innlogginger → alle `200` · full UI-flyt gjennom det ekte skjemaet:
`/signin` → `/dashboard`, `activeOrganizationId` satt, sidebaren viser «Verksted A» ·
`tsc --noEmit` ✓ auth/web/api. Ikke pushet.

---

## 2026-08-07 (d) — FIKS: «feil passord» i UI-et var usynlig blanktegn

Oppfølging av (c). Rate-limiten var ÉN av to feil; denne er den brukeren faktisk så.

### Rotårsak: mellomrom/linjeskift i passordfeltet

Innloggingssiden sendte `password` **urørt** til Better-Auth. Et passord som limes inn fra en
melding, et terminalvindu eller et dokument får nesten alltid med seg et mellomrom eller et
linjeskift på slutten — og **feltet viser prikker, så det er usynlig**.

Better-Auth svarer da `401 Invalid email or password` — nøyaktig samme melding som ved genuint
feil passord. Brukeren sitter og skriver et passord som var riktig hele tiden.

**Målt mot API-et, samme bruker:**

| Inndata | Svar |
|---|---|
| `endwise-demo-1` | `200` ✅ |
| `endwise-demo-1` + mellomrom bak | `401 Invalid email or password` |
| `endwise-demo-1` + linjeskift bak | `401 Invalid email or password` |
| mellomrom foran passordet | `401 Invalid email or password` |
| mellomrom i e-posten | `400 Invalid email` |
| e-post med STORE bokstaver | `200` (Better-Auth normaliserer selv) |

**Passordhashen er urørt siden 1. august** — passordet har altså vært riktig hele tiden.
Hverken seeden, demo-oppryddingen eller RLS-arbeidet rørte den.

### Bifunn: `127.0.0.1` ble avvist

`BETTER_AUTH_URL` er `http://localhost:3000`. Åpner du appen på `http://127.0.0.1:3000` — samme
maskin — avvises **hvert** auth-kall med `403 Invalid origin`, uten at noe i UI-et antyder at
adressen i adressefeltet er problemet.

### Fikser

1. **`signIn.email({ email: email.trim(), password: password.trim() })`.** Blanktegn i ytterkant
   av et passord er et lime-artefakt, aldri et valg. ⚠️ Kontoopprettelse må trimme likt —
   notert i koden, så det ikke glemmes når invitasjonsflyten (F1-10) bygges. Eneste vei inn i dag
   er seeden, som bruker literaler uten blanktegn.
2. **Norske, atskilte feilmeldinger** for 400 / 401 / 429. 401-meldingen ber deg dessuten skrive
   passordet for hånd hvis nettleseren fylte det ut — et lagret gammelt passord ser identisk ut
   med et riktig ett når feltet bare viser prikker.
3. **`trustedOrigins` i dev**: `localhost:3000` + `127.0.0.1:3000`. **Kun i dev** — i produksjon
   er `baseURL` fasiten, og en ekstra betrodd origin der ville vært et hull.

### Utelukket underveis

Feltnavn og endepunkt er riktige (`signIn.email` → `/api/auth/sign-in/email`). Frontend har
ingen egen `baseURL` — den bruker current origin og Next-rewriten til `:3001`, samme instans som
`BETTER_AUTH_URL` peker på. Ingen mismatch.

**Verifisert:** e-post med mellomrom foran/bak **og** passord med mellomrom + linjeskift bak,
skrevet inn i det ekte skjemaet → `/dashboard`, `activeOrganizationId` satt, sidebaren viser
«Verksted A». Samme inndata ga `401` før fiksen. `tsc` ✓ auth/web · `next build` ✓ 56 ruter.
Ikke pushet.

---

## 2026-08-07 (e) — PLAN: Lager (kjerne) + Butikk (Medusa, betalt modul) · sikkerhetsgjennomgang

**Godkjent arkitektur fra eier. ⛔ INGEN KODE SKREVET — funksjonene bygges ikke ennå.**
Abonnementsflyten tas som egen gjennomgang etterpå.

### Arkitekturen som ble låst

| | **Lager** | **Butikk** |
|---|---|---|
| Type | **KJERNE** — alle forhandlere, ingen gate | **BETALT MODUL** (`tenant_modules` → `shop`) |
| Handler om | Drift: deler, lagernivå, lokasjoner, bevegelser | Handel: produkter, priser, checkout, salg |
| Backend | Endwise' egen Postgres | **Medusa.js** (ny avhengighet) |
| Kontekst | Egen fane + egen sidebar | Egen fane + egen sidebar |

Lager er sannheten for beholdning; Butikk spør. AI-agenten leser begge.

### Sikkerhetsgjennomgang — `docs/notater/sikkerhet-lager-butikk.md`

Full gjennomgang mot **OWASP Top 10** (A01, A03, A06, A08, A10 + secrets) og
**OWASP LLM Top 10** (LLM01, LLM02, LLM06, LLM08, LLM10). **12 tiltak, 5 av dem HØY.**

**De to viktigste funnene:**

**1. 🔴 Modul-gaten finnes ikke (CWE-862).** `tenant_modules` og
`createEntitlements().assert()` finnes — men gjennomgang av kallstedene viser at entitlements
**kun håndheves på AI-agent-stien** (`assertEntitled` i `agent-runtime`). **Ingen tRPC-prosedyre
sjekker modul.** RLS svarer på «hvilken tenants rader», ikke «har de betalt». Uten en
`moduleProcedure` ville en `dealer_admin` uten Butikk-modulen fått svar fra butikk-rutene ved å
kalle dem direkte — UI-gatingen er kosmetikk, som `nav.ts` sier om seg selv.

**2. 🔴 Butikk-data bor UTENFOR RLS (A01).** Alt vi har bygget av tenant-isolasjon er
databasenært — og Medusa har sin egen database. Én feil i et API-kall, og forhandler A ser
forhandler B sine ordrer, **uten at en eneste policy er brutt**. En helt annen feilmodus enn den
vi er vant til.

**Øvrige HØY:** agent-skriving uten godkjenning (LLM08) · reservasjonsmodell + idempotens i
lagersynk (A08) · webhook-signaturverifisering fra Medusa.

### Nye roadmap-kort

| ID | Fase | Hva | Status |
|---|---|---|---|
| **F0-16** | F0 | Modulskillet basis/tillegg + `moduleProcedure` | `planned` |
| **F2-09** | F2 | Lager: datamodell (4 tabeller, RLS) | `planned` |
| **F5-31** | F5 | Lager-kontekst i shellet (egen fane + sidebar) | `planned` |
| **F6-15** | F6 | AI-agentens tilgang til Lager + Butikk | `planned` |
| **F8-10** | F8 | Synk Quick ↔ Lager ↔ Medusa | `planned` |
| **F10-03** | F10 | Butikk-kontekst (Medusa, betalt modul) | **`blocked`** |
| **F14-20** | F14 | Portvakt: sikkerhetsgjennomgangen må lukkes | `planned` |

**Rekkefølge:** F0-16 → F2-09 → F5-31 → F10-03 → F8-10 → F6-15. F0-16 først, fordi Butikk ikke
kan være en betalt modul uten en gate som håndhever det.

### Statusoppfriskning etter arbeidet 6.–7. august

- **F0-03** — FORCE RLS på 23/23 tabeller + `force-rls.test.ts`; sidefunnet at `context.ts`
  koblet til som eier er notert i kortet.
- **F0-04** — merket med at entitlements ikke håndheves på tRPC (peker til F0-16).
- **F1-01** — rate-limit-fiksen dokumentert, inkl. at headernavnet må verifiseres ved deploy.
- **F10-02** — omdefinert til KUN domene-/utrullingsbiten; butikk-konteksten er skilt ut som
  F10-03.
- F5-24…F5-30 sto allerede oppdatert fra 07.08 (b).

**Roadmap: 15 faser, 168 punkter, 0 duplikater.** Fordeling: 48 done · 31 progress · 85 planned ·
4 blocked.

### ⚠️ Krever beslutning fra eier før bygging

1. **Medusa-isolasjonsmodell:** én instans per forhandler (tryggest, dyrest) eller delt instans
   med `sales_channel` per tenant (billigere — men da er isolasjonen vår kode, ikke databasen).
2. **Medusa som avhengighet:** CLAUDE.md §2 krever eksplisitt godkjenning. Å stå i roadmapen er
   ikke det samme som å være godkjent. Derfor står F10-03 som `blocked`.
3. **Abonnementsflyten** — eier tar den som egen gjennomgang.

Ikke pushet.

---

## 2026-08-07 (f) — FIKS: demo-velgeren virket ikke · tre feil, alle mine

Brukeren fikk ikke valgt demo-tenant fra header-dropdownen. Diagnosen fant **tre** feil innført
6.–7. august, og alle var usynlige fordi de feilet stille.

### Rotårsak 1 — `tenants.myDemoTenants` KASTET (hadde aldri virket)

Ruten joinet `member.organization_id` (`text`, Better-Auth eier den) mot `tenants.id` (`uuid`).
Postgres: **`operator does not exist: text = uuid`**. Joinen kunne aldri gått. Den ble aldri
kjørt gjennom tRPC under bygging — verifiseringen gikk direkte mot databasen og traff den ikke.

**Fiks:** ingen join. `member` har ingen RLS (ADR-002), så medlemskapene leses direkte; hver
tenant hentes så i **sin egen `withTenant`-kontekst**. Det er strengere enn før: «kun tenants du
er medlem av» var en WHERE-betingelse vi skrev selv — nå håndhever RLS det, ett oppslag av gangen.

### Rotårsak 2 — `tenants.list` var stille tom

Ruten gikk på `ctx.db` uten tenant-kontekst, med kommentaren «rollen ER isolasjonen her». Den
resonnementet var feil: `tenants`-policyen er `id = current_setting('app.tenant_id')`, og uten
den satt gir RLS **null rader, ikke alle rader**. Forhandlere-siden viste ingenting, uten feil.

**Fiks:** ny `withPlatformAdmin()` + policyen `tenants_platform_admin_read` (migrasjon 0004).

⛔ **`for: 'select'`, ingen `withCheck`, kun `tenants`-tabellen.** Alternativet — å koble til som
DB-eier for den ene spørringen — ville omgått RLS fullstendig. Dette er det smalest mulige hullet
som løser problemet, og det er navngitt i stedet for skjult.

**Bevist med test:** uten GUC → 0 tenants · med GUC → 4 tenants · INSERT blokkert av RLS ·
UPDATE traff 0 rader · `customers` og `bookings` fortsatt 0 rader (GUC-en åpner ikke andre
tabeller).

### Rotårsak 3 — mekaniker-profil LÅSTE hele appen

Den verste, og den som ville rammet uansett hva vi gjorde med dataene: `(app)/layout.tsx` låste
**alle** med `isMechanic` til `/min-dag` og ga dem mobil-shellet — **ingen sidebar, ingen
kontekstvelger**.

Det var riktig så lenge en mekaniker-profil bare fantes på mekanikere. Men `isMechanic` betyr
«har en rad i `mechanics`», ikke «skal kun se mekanikerflaten». Å gi mikkis en mekaniker-profil
for å få mekanikervisningen til å virke, ville altså **låst vedkommende ute av alt annet**.

**Fiks:** låsen gjelder nå kun `kunMekaniker = isMechanic && !isAdmin` — den som ikke har noe
annet sted å være. Admins får full sidebar og bytter til mekanikervisningen via kontekstvelgeren,
som er nettopp det den finnes for (F5-29). `landingForRole` fikk samme regel.

### Løsningen for lokal dev: seeden, ikke en ny konto

Vurdert opp mot å opprette `demo@twofold.no`. **Seeden er ryddigere og har null prod-risiko:**
den nekter allerede å kjøre i produksjon, «Verksted A/B» *er* oppdiktede verksteder, og brukeren
slipper å huske to kontoer.

`pnpm db:seed` gjør nå følgende, idempotent:

- `ensureTenant` setter **`kind: 'demo'`** — også på eksisterende rader fra før kolonnen fantes
- feature-flagget **`dev-mode` opprettes og slås på**
- **mekaniker-profil på mikkis** i Verksted A (så mekanikervisningen er valgbar på ekte grunnlag)
- en tråd **«Notat til meg selv»** for sanntidstesten

### ⛔ Gaten er urørt

`resolveDevMode` krever fortsatt **alle tre**: flagg PÅ · rolle `endwise_admin` · `kind = 'demo'`.
Ingen betingelse er fjernet, svekket eller omgått — seeden **oppfyller** dem med ekte data
lokalt. `flags.setOverride`-sperrelista, `endwiseAdminProcedure` og FORCE RLS står som før.

**Verifisert:** typecheck ✓ web/api/db/auth · Biome ✓ (5 pre-eksisterende) · `next build` ✓ 56
ruter · 6 RLS-påstander ✓ · 6 policy-påstander ✓ · **ende-til-ende i nettleseren**: innlogging →
`/dashboard` med full sidebar, kontekstvelger med 4 kontekster (ingen deaktivert) + 3
demo-tenants, og bytte til Mekaniker (`/min-dag`, sidebar-nav), Butikk (`/butikk`) og
Endwise-admin (`/endwise/forhandlere` med alle 4 forhandlere i lista). Ikke pushet.

---

## 2026-08-07 (g) — DEL A: Lager BYGGET · DEL B: abonnementsgjennomgang

### DEL A — LAGER (F2-09 + F5-31) ✅

**Kjerne, ikke betalt modul.** Fire tabeller, alle med `tenant_id` + `.enableRLS()` +
`tenantPolicy()`. Migrasjon 0005. **RLS + FORCE ble satt automatisk** av DO-blokka i
`grants.sql` — verifisert 4/4, akkurat slik F5-28 ③ lovet at nye tabeller skulle dekkes.

| Tabell | Rolle |
|---|---|
| `parts` | delenummer/SKU, navn, kategori, kostpris (øre), minimumsnivå |
| `stock_locations` | hylle, rom, servicebil |
| `stock_levels` | `onHand` + **`reserved`** per del per lokasjon |
| `stock_movements` | append-only: `in`/`out`/`adjust`/`reserve`/`release`, med hvem og når |

**`reserved` er ikke pynt — den er A08-funnet.** Nedtelling alene gir dobbeltsalg: mekanikeren
tar den siste bremseklossen, og ti minutter senere selger butikken den samme. Derfor er
**tilgjengelig = onHand − reserved** hovedtallet overalt, også i UI-et.

**Bevegelsene er fasiten**, `stock_levels` er materialiseringen. Ingen rad kan redigeres: er
tallet feil, legger man til en korreksjon. Man retter ikke historien.

#### Sikkerhetsfunnene som ble adressert

- **A03 (injection):** sortering er en **allowlist** (`PART_SORT`), aldri `sql.raw(input.sortBy)`.
  Et kolonnenavn fra klienten er like mye brukerinput som et søkeord. Fritekst går via
  parametrisert `ilike`.
- **CWE-639 (IDOR):** SKU er gjettbar *med vilje*. Unik-indeksen er `(tenant_id, sku)`, aldri
  `sku` alene, og hvert oppslag har tenant i WHERE i tillegg til RLS.
- **RBAC:** `inventory: ['read','move','manage']` lagt inn. `dealer_staff` får `read` + `move` —
  kan ta ut en del, kan **ikke** korrigere beholdningen. `adjust` avvises server-side.
- **LLM06 (AI):** lese-verktøy i drift-innsikt-agenten med **felt-allowlist** — `costMinor` og
  `minStock` returneres aldri. Ingen skrivende verktøy i det hele tatt (LLM08).

#### UI

Femte kontekst i header-dropdownen, og **den første uten noen gate** — ingen `requiresDevMode`,
ingen `requiresMechanic`, ingen modul. Egen sidebar: Oversikt · Deler · Lokasjoner · Bevegelser.
Bevegelsesdialogen skiller **reservasjon fra uttak** i klartekst, fordi det er skillet hele
modellen står på.

⛔ Ingen handel: ingen utsalgspris, ingen ordre, ingen «Selg»-knapp. Kostpris vises kun for admin.

#### Verifisert

**41 tester grønne (7 filer)**, inkludert 8 nye angrep i `inventory-isolation.test.ts` — samme SKU
i to tenants lekker ikke, kryss-tenant lesing og skriving avvist, lageret usynlig uten
tenant-kontekst. `next build` ✓ 60 ruter. **Ende-til-ende i nettleser:** 8 deler, 3 lokasjoner,
100 på lager, 13 reservert, **87 tilgjengelig**, 2 under minimum. Bevegelser testet: for stor
reservasjon avvist, uttak innfrir reservasjon (onHand 6→5, reservert 3→2), negativ beholdning
avvist, `actorUserId` fra sesjonen.

⚠️ **Vitest var ødelagt** (`pathe` manglet i pnpm-storen etter forrige økt). Reparert ved å hente
pakken på nytt. De to nye testfilene er lagt til `vitest.config.ts`, som bruker eksplisitt
include-liste — en ny testfil kjører ikke uten at den står der.

### DEL B — ABONNEMENTSGJENNOMGANG (analyse, ikke bygget)

**Hovedfunn: F5-09 er mye lenger enn statusen antyder.** `billing_customers`, `PLANS`
(basis/pluss/proff), `createBillingService` m/ `applyPlan`, Stripe checkout + portal og webhooken
finnes og virker. **Det som mangler er ikke betalingen — det er håndhevingen.**

Vi selger altså moduler ingen dør er låst for (F0-16, CWE-862).

**Nye/utvidede kort:**

| ID | Hva | Status |
|---|---|---|
| **F0-16** | Utvidet med hele basis/tillegg-mappingen + fail-safe | `planned` |
| **F5-32** | Abonnementets oppstartsflyt (5 steg + 3 hull) | `planned` |
| **F10-04** | Butikk auto-provisjonering — **kun analyse** | `blocked` |
| **F5-09** | Merket med hva som faktisk står igjen | `progress` |

**Basis (ingen gate):** Verkstedet · Innboks · Saker · Kunder · **Lager** · Helpdesk · Settings.
**Tillegg:** `ai-support` · `shop` · `nyhetsbrev` · `analyse-pro` · integrasjonene · `white-label`
· `sso`.

**Tre hull i oppstartsflyten:** ingen `provision(moduleKey, tenantId)`-hook (Butikk trenger mer
enn en rad i `tenant_modules`) · nedgradering er udefinert (data slettes ikke, men flaten må vite
det) · `past_due` finnes i schemaet men ingen kode gjør noe med den.

**Butikk-provisjonering:** kravet om automasjon presser mot **delt Medusa med `sales_channel` per
forhandler** — som trekker motsatt vei av isolasjonsfunnet. Forsvarlig **kun** hvis alle
Medusa-kall går gjennom ett serverside-lag som setter kanalen fra `ctx.tenantId`, med
kryss-kanal-tester. Er vi ikke villige til å bygge det laget, er instans-per-forhandler det
ærlige valget.

**Roadmap: 15 faser, 170 punkter, 0 duplikater.** 50 done · 32 progress · 83 planned · 5 blocked.
Ikke pushet.

---

## 2026-08-07 (h) — Modul-gaten (F0-16) · «Meg»-fanen (F7-06) · past_due besluttet

### 1. MODUL-GATEN — CWE-862 er lukket ✅

`moduleProcedure(key)` og `moduleAdminProcedure(key)` i `apps/api/src/trpc/init.ts`. Tre lag:
entitlement fra DB gjennom `withTenant` (aldri fra klient) → rolle → skop fra `ctx.tenantId`.
**Fail-safe:** feiler oppslaget er svaret nei — `.catch(() => [])`, samme mønster som `agent.ts`
allerede brukte.

**Gaten leser `enabled = true`, ikke bare radens eksistens.** Det betyr at nedgradering
(`enabled = false`) virker nøyaktig som om modulen aldri var kjøpt — og det er testet.

#### Gatede ruter

| Rute | Modul |
|---|---|
| `agent.list`, `agent.run` | `ai-support` |
| `quick.config/setConfig/testConnection/pullNow/pushNow` | `quick` |
| `conflicts.list/count/resolve` | `quick` |
| `lookup.vehicleByRegNumber/refreshVehicle` | `vegvesen` |
| `widget.keys.list/issue` | `widget` |

Vegvesen er verdt å merke: **hvert oppslag koster penger hos Autosys.** En åpen rute var både et
entitlement-hull og en regning.

⚠️ Den **offentlige** widget-flaten (`routes/widget/`) er bevisst IKKE gated — sluttkunden har
ingen sesjon å sjekke moduler mot, den har signert token.

#### Ikke gated, med vilje

Verkstedet · Innboks · Saker · Kunder · **Lager** · Helpdesk · Settings · `personvern`
(GDPR-rettigheter skal aldri kunne kjøpes bort) · **`billing`** — abonnementsflaten må stå åpen,
ellers kan en forhandler ikke kjøpe seg ut av en sperre. Begge er testet eksplisitt.

#### Katalogen

`BASIS_MODULES` / `ADDON_MODULES` i `packages/modules/src/entitlements.ts`. `isAddon()` behandler
**ukjente nøkler som tillegg** — fail-safe også her.

`PLANS` er ryddet: planene gir **kun tillegg**. `booking` og `messages` er fjernet fra dem, fordi
å liste basis-funksjoner i en plan antyder at de kan tas bort. `START_MODULER` i
`tenants.create` er nå tom — en ny forhandler kan drive verkstedet fra dag én; tillegg kommer med
abonnementet.

**13 tester** i `apps/api/test/module-gate.test.ts`. Kallene går rett på `appRouter.createCaller`,
ikke over HTTP — en angriper går heller ikke gjennom UI-et.

**Seed:** Verksted A og demo-tenantene får alle tillegg. **Verksted B står på basis med vilje** —
den er kontrasten der gaten kan sees virke i UI-et.

### 2. «MEG»-FANEN (F7-06) ✅

`/min-dag/meg` erstatter «Profil» som siste fane i mekanikerens bunnmeny.

⛔ **Ikke forhandlerens Settings.** Ingen abonnement, ingen team, ingen priser, ingen andre
mekanikere. `mechanic.myProfile` utleder mekanikeren fra `mechanics.userId = ctx.userId`, aldri
fra input — det finnes ingen vei til en kollegas profil herfra.

**Øverst: to hurtigbrytere** — mørkt tema og varsler av/på. Dette er en telefon i en verkstedshall,
ofte med hansker på; de to tingene som faktisk byttes ofte skal ikke ligge nede i en liste.
56px trykkmål.

Under: profil (navn, e-post, tilgjengelighet, kapasitet) · sikkerhet (passord, 2FA-status) ·
varslingskanaler.

⚠️ **Push og SMS er merket «Kommer», ikke «På».** De er de to som betyr mest når man står i hallen
uten appen åpen, og de er ikke koblet (F6-12). Å vise dem som på ville vært å love varsler som
aldri kommer.

Samme layout på maskin — mekanikervisningen har **én** layout og skal ikke få to. Et tilsvarende
«Meg»-punkt er lagt i `MEKANIKER_NAV`, så en admin som ser visningen i sidebaren får de samme
punktene.

### 3. past_due — BESLUTTET: 14 dagers nåde

Låst inn i F5-32. **Basis fortsetter alltid** — en mislykket betaling stenger aldri Verkstedet,
Innboks, Saker, Kunder, Lager, Helpdesk eller Settings. **Tillegg fryses etter 14 dager** i
`past_due`.

Ikke bygget (F5-32 er fortsatt `planned`). Det som trengs når den bygges: en `past_due_since`, et
cron-steg som setter `enabled = false` for tillegg, og varsel til forhandleren underveis.
Basis-nøkler skal aldri røres av jobben — de har uansett ingen gate.

**Verifisert:** typecheck ✓ web/api/db/modules/auth/agents · Biome ✓ (kun pre-eksisterende funn) ·
`next build` ✓ **61 ruter** · **28 tester i apps/api** (13 nye) · **41 tester i packages/db**.
Roadmap: 170 punkter, 0 duplikater — F0-16 `done`, F7-06 `done`. Ikke pushet.

---

## 2026-08-07 (i) — Stripe-abonnement FASE 1: tre nivåer + tillegg (F5-32)

**Prismodell v3 fra eier.** Flat pris per forhandler/mnd, ubegrenset antall brukere, eks. mva.
⛔ **Metered overforbruk er IKKE bygget** — se fase 2 nederst.

### Katalogen — én kilde

`packages/modules/src/billing/plans.ts`: `TIERS` (3) + `TILLEGG` (10).

| Nivå | Pris/mnd | Låser opp |
|---|---|---|
| START | 4 490 | `widget`, `resend` |
| PRO | 8 490 | + `ai-support`, `ai-diagnose`, `ai-providers`, `quick`, `vegvesen`, `smart-hverdag`, `twilio` |
| ENTERPRISE | 12 490 | + `ai-nettside`, `ai-innsikt`, `quick-agent`, `crm-lime`, `webhooks` |

**Nivåene er kumulative** — testet. Merk hva START teknisk låser opp: bare to nøkler. Resten av
START (Verkstedet, Saker, Kunder, **Lager**, Innboks, mekanikervisning, Settings) er **basis og
har ingen gate** — F0-16. START selger tilgangen til produktet; det som faktisk låses er widget og
e-post.

**10 tillegg**, hver med sin egen Stripe-pris og **sin egen modulnøkkel** (én pris = én modul,
testet). Fire kan kjøpes nå (ERP 3 500 · white-label 990 · SSO 690 · nyhetsbrev 449 · Finn.no
349), resten er 🕓 `coming` eller ⛔ `blocked`.

⚠️ **`shop` er `blocked`** — den venter på Medusa-beslutningen (F10-03). Å selge en nettbutikk vi
ikke har bestemt oss for å bygge ville vært å ta betalt for noe vi ikke kan levere.
⛔ **Kryssforhandler-historikk er IKKE i salg** og skal ikke bli det uten egen beslutning —
`IKKE_I_SALG` i katalogen.

### Stripe

`checkout` sender nivået + ett line item per tillegg. **Tilleggene filtreres server-side** mot
`kjopbareTillegg()` — at UI-et viser dem låst er kosmetikk.

**Webhooken leser nå ALLE price-IDene** (`subscriptionFromPriceIds`). Den gamle koden brukte
`items.data[0]` og ville mistet hvert eneste tillegg, stille. Kjenner den ikke igjen nivået, rører
den **ikke** modulene — å nulle dem fordi en price-ID manglet i `.env` ville stengt et betalende
verksted.

**Signaturverifisering bekreftet PÅ:** `constructEvent(body, sig, whsec)` på rå body, 400 ved feil,
**503 uten `STRIPE_WEBHOOK_SECRET`** — den feiler lukket. Entitlements flippes **kun** her; ingen
klient-rute skriver `tenant_modules`.

### Nedgradering: `enabled = false`, ikke DELETE

`applySubscription` deaktiverer i stedet for å slette. To grunner: dataene modulen eier står
igjen uansett, og kommer forhandleren tilbake, mistet vi ellers historikken om hva de betalte for.
`moduleProcedure` leser `enabled = true`, så virkningen er identisk — men reversibel og med spor.
Oppgradering skrur PÅ igjen. Begge testet.

### past_due — 14 dager

`PAST_DUE_NADE_DAGER = 14` + `erUtenforNade()`. **Parameteren er satt, jobben er ikke bygget** —
webhooken setter kun status, og basis berøres uansett aldri.

### Oppsett

`apps/api/scripts/stripe-setup.ts` (`pnpm stripe:setup`). **Nekter `sk_live_`.** Idempotent via
`lookup_key` — kjører du to ganger får du ikke to priser. **Skriver ikke i `.env`** — den printer
linjene du limer inn. `.env`/`.env.example` har fått de 13 nye `STRIPE_PRICE_*`-nøklene.

⚠️ Ingen Stripe-nøkler fantes i `.env`, så produktene er **ikke** opprettet — det må eier gjøre.

### UI

`/abonnement` er bygget mot ekte tRPC: nivåvalg, avhukbare tillegg, løpende sum, checkout.
🕓/⛔-tillegg vises låst **med begrunnelsen**, ikke bare som grå. En dev-knapp simulerer webhooken
(Stripe krever offentlig URL) — `FORBIDDEN` i produksjon.

⚠️ `/abonnement` er bevisst **ikke** modul-gated: en forhandler som har mistet en modul må kunne
kjøpe seg ut av det.

### FASE 2 — utsatt

Metered overforbruk (SMS, AI-diagnoser, nettside-endringer). Kvotene står i `Kvoter` per nivå som
forberedelse, men **`KVOTER_ER_IKKE_HANDHEVET = true`**: ingenting teller, ingenting stopper.

**Verifisert:** typecheck ✓ web/api/modules/db · Biome ✓ (pre-eksisterende) · `next build` ✓ 61
ruter · **44 tester i apps/api** (16 nye) · 41 i packages/db. Roadmap 170 punkter, 0 duplikater,
F5-32 `progress`/`built`. Ikke pushet.

## 2026-08-08 — Spor 1: kjerneflatene gjort ekte (F5-02, F5-03, F3-07, F6-01)

**Godkjent av:** Mikkis
**Endring:** Fire punkter oppdatert etter at flatene faktisk ble bygget mot ekte data.

| ID | Punkt | Var | Er |
|---|---|---|---|
| F5-02 | Kunder-side | `planned` / `ui:missing` | `done` / `ui:full` |
| F5-03 | Kjøretøy-side | `planned` / `ui:missing` | `done` / `ui:full` |
| F3-07 | DealerCalendar (dag/uke) | `planned` / `ui:proto` | `done` / `ui:full` |
| F6-01 | Meldingssystem | `done` (m/ gap «deltakernavn mangler») | `done`, gapet lukket |

**⚠️ Avvik fra ordlyden i F5-03 — ikke bygget, og det er med vilje:**
punktet nevner «modellbilder» og «EU/garanti-status». **Modellbilder** finnes ikke i
datamodellen (ingen bildekilde, verken egen opplasting eller Autosys), og **garanti** er
ikke et felt vi henter eller lagrer. Kjøretøykortet sier dette rett ut i stedet for å tegne
tomme felter som antyder at vi vet noe vi ikke vet. Skal de bygges, er de egne punkter med
egen datakilde.

**Sikkerhet — den ene ruta som fortjener en linje her:** `directory.participants` slår opp
navn på meldingsdeltakere. Den leser **ikke** Better-Auth sin `user`-tabell fritt: de
tabellene har ingen RLS (ADR-002 — globale identiteter), så en rute som tok IDer inn og ga
navn ut ville vært et navneorakel for hele plattformen. Oppslaget er derfor snudd: vi finner
først hvem som hører til tenanten (`member.organization_id`, `mechanics.user_id`,
`customers.user_id`) og krysser de forespurte IDene mot den lista. Ukjent ID gir `null`.

**Dev-seeden ble skrevet om (ikke et roadmap-punkt, men verdt å vite):** blokken for kunder,
kjøretøy, tjenester og bookinger var ikke idempotent — hver `pnpm db:seed` la inn en ny
«Kari Kunde» og tre nye bookinger. Verksted A hadde etter hvert åtte identiske kunder og 25
bookinger på to datoer. Duplikatene er ryddet, og seeden slår nå opp før den skriver
(bookinger via `idempotencyKey`, samme mekanisme widgeten bruker mot dobbeltklikk).

---

## 2026-08-08 — Kanal på meldinger: prototype → datamodell (nytt punkt F6-16)

**Godkjent av:** Mikkis
**Endring:** Nytt punkt **F6-16 — «Innkommende e-post og SMS i innboksen»** (`planned`).

⚠️ **ID-korreksjon:** kortet ble først skrevet som F6-14, men den ID-en var opptatt
(Guardrails-pakken). Duplikatet er rettet til F6-16 i samme økt, og alle kodereferanser
er oppdatert. Roadmap-parseren viser 15 faser / 171 punkter / **0 duplikater**.

**Hva som faktisk ble bygget nå (fundamentet, ikke integrasjonen):**

| Kolonne | Tabell | Hvorfor |
|---|---|---|
| `channel` (`app`\|`sms`\|`email`\|`web`) | `messages` | Hvor meldingen kom inn / gikk ut |
| `direction` (`inbound`\|`outbound`) | `messages` | Kanal alene er tvetydig når tråden går begge veier |
| `external_id` | `messages` | **Unik per tenant** = idempotensnøkkel for webhooks |
| `external_ref` | `messages` | Motpartens adresse/nummer (persondata) |
| `channel` | `threads` | Trådens primærkanal = **svarkanalen** |
| `external_ref` | `threads` | Kroken innkommende e-post rutes på |

Migrasjon `0006_medical_naoko.sql`. Eksisterende rader fikk `app`/`outbound` gjennom
`NOT NULL DEFAULT` — som er sant: de ble alle skrevet i Endwise.

**Hvorfor dette ikke er pynt:** svaret må gå tilbake samme vei. Svarer forhandleren i
panelet på noe kunden sendte som SMS, og svaret bare blir en app-melding, får kunden det
aldri. Derfor er indikatoren ikke lenger bak en avkrysningsboks, og derfor er
`threads.channel` trådens egen egenskap og ikke utledet av siste melding.

**⛔ Dokumentert forutsetning for AI på support-e-post (ikke bygget):**
kunde-e-post er persondata. GDPR gjelder uansett KMS-kryptering og uansett forhandlerens
godkjenning — forhandleren er behandlingsansvarlig, men vi velger underleverandør, og et
samtykke gjør ikke overføringen lovlig. Innholdet er dessuten fritekst vi ikke kontrollerer
og kan inneholde helseopplysninger (art. 9). Rå kunde-e-post er derfor
`dataClass: 'customer_freetext'` og MÅ rutes via `resolveModelProvider` til EU-provider
(Mistral), uten fallback. **Fireworks/OpenRouter kun for `tenant_operational`** — vår egen
strukturerte drift, aldri sluttkundens ord. Se `packages/providers/src/data-region.ts` og F14.

---

## 2026-08-08 — Varslingslyder, eget navn og kallenavn (F5-19, F7-06)

**Godkjent av:** Mikkis (cuelume eksplisitt godkjent som §2-avhengighet)
**Endring:** To eksisterende punkter utvidet. **Ingen nye roller** — rolle-modellen
for selger/support kommer som egen plan.

| ID | Utvidelse |
|---|---|
| F5-19 | Settings › Profil: endre eget visningsnavn, kallenavn, varslingslyder av/på |
| F7-06 | Samme `ProfilKort` i mekanikerens «Meg»-fane; lokal «Varsler» omdøpt til «Push-varsler» og ærlig merket |

**Ny avhengighet:** `cuelume@0.2.2` (MIT, 0 runtime-avhengigheter, Web Audio).
Flyttet i `docs/UI-PAKKER.md` fra §7 «ikke hentet inn ennå» til «Hentet inn».
⛔ `bind()` brukes bevisst IKKE — automatiske hover-/klikklyder over hele panelet
er nettopp det som får folk til å skru av lyden helt, og da mister de varselet
som betyr noe. Kun `arrival` på innkommende melding, `success`/`error` på egne
handlinger, volum 0.35.

**To nye tabeller, med ulik rekkevidde — og det er poenget:**

| Tabell | Skop | RLS | Hvorfor |
|---|---|---|---|
| `user_preferences` | Global per bruker | Nei | Om lyd er på er en egenskap ved MENNESKET. En som jobber i to forhandlere skal skru av én gang, ikke to. Beskyttelsen er at ingen rute tar bruker-ID fra input |
| `member_profiles` | Per tenant | **Ja + FORCE** | Et kallenavn er intern sjargong på ÉN arbeidsplass. Det skal ikke følge deg videre, og forhandler B skal ikke kunne lese forhandler A sine |

Migrasjon `0007_wide_captain_stacy.sql`. FORCE RLS bekreftet på `member_profiles`;
angrepstest uten `app.tenant_id` gir 0 rader.

**⛔ KALLENAVN VISES ALDRI UTAD — hvordan grensen faktisk håndheves:**

1. `visningsnavn()` (`packages/modules/src/profil/`) er **eneste sted** et kallenavn
   blir til et visningsnavn, og den defaulter til `offisiell` = ekte navn. En glemt
   parameter gir ekte navn, aldri et kallenavn — feilen går mot det trygge.
2. `directory.participants` løser navnet **server-side** og returnerer aldri
   kallenavnet rått. En klient kan ikke velge å vise det et sted den ikke skulle.
3. Kunder får alltid ekte navn, uansett visning.
4. `kanHaKallenavn()` avviser `dealer_admin`/`endwise_admin`/`owner` i selve
   mutasjonen — ikke bare ved å skjule feltet. Et skjult felt er en anbefaling;
   en avvist mutasjon er en regel.

Låst av `packages/modules/test/profil.test.ts` (10 tester), inkludert defaulten.

**Sideeffekt som måtte fikses:** `useEventStream` åpnet én `EventSource` per
kallsted. Med en app-bred lydlytter ble det to per fane, og serveren tar maks
5 per bruker — to nettleservinduer i en toparts-test ville brukt fire, tre
vinduer seks. Hooken deler nå ÉN strøm mellom alle abonnenter (refcount).

---

## 2026-08-08 — «Detaljer»-panel i innboksen (nytt punkt F6-17)

**Godkjent av:** Mikkis
**Endring:** Nytt punkt **F6-17 — «Detaljer»-panel i innboksen** (`done` / `ui:full`).
Ingen eksisterende punkter endret status.

**Ny kolonne:** `user_preferences.inbox_details_open` (migrasjon `0008_sour_secret_warriors.sql`),
standard `true`. Gjenbruker tabellen fra forrige økt. Lagres per bruker og ikke i
`localStorage` fordi det er en arbeidsvane, ikke en nettleserinnstilling — åpner du
innboksen på verkstedets maskin i dag og din egen i morgen, skal panelet stå som du
forlot det.

**Ny rute:** `inboxContext.forThread` — én rute, ikke fem, som returnerer en
diskriminert union på `type` (`kunde` | `mekaniker` | `konto` | `ukjent`). Fem separate
kall ville gitt fem spinnere i én 320px kolonne, og klienten måtte kjent trådtypen før
den spurte. Serveren vet det allerede.

**⛔ Tilgang — to sperrer:**
1. RLS holder tenant-grensen (`withTenant`).
2. **Deltakelse i tråden kreves.** Uten den kunne en ansatt hos samme forhandler slått
   opp kundekortet til en samtale hun ikke er med i, ved å gjette en tråd-ID. Ikke en
   tenant-lekkasje, men fortsatt en lekkasje. Verifisert med angrepstest.

**Personvern:** panelet viser forhandlerens egen strukturerte kundedata. Seksjonen
«Andre samtaler» viser **emne og tidspunkt, aldri meldingstekst** — og sier det i UI-et.
Konto-visningen sier eksplisitt at Endwise ser kontoopplysninger, aldri samtaleinnhold.

**Sideeffekt:** `RouterOutput`-typen lagt til i `apps/web/lib/trpc.ts`
(`inferRouterOutputs`). Å utlede union-grenene fra `useQuery(...)['data']` gir `never`,
fordi hooken krever argumenter.

---

## 2026-08-09 — Jobbfunksjon: to-dimensjonal modell (nytt punkt F1-14)

**Godkjent av:** Mikkis
**Endring:** Nytt punkt **F1-14 — «Jobbfunksjon»** (`done` / `ui:full`).

⚠️ **ID-korreksjon:** kortet ble først skrevet som F1-13, men den var opptatt
(Scaleway Key Manager, parkert). Rettet til **F1-14** i samme økt, og alle
kodereferanser oppdatert. Parseren viser 15 faser / 173 punkter / **0 duplikater**.

**⛔ Ingen nye RBAC-roller.** Modellen har to uavhengige akser:

| Akse | Hvor | Hva den styrer |
|---|---|---|
| Tilgangsnivå | `member.role` (uendret) | Hva du har LOV til. `dealer_admin` / `dealer_staff` |
| Jobbfunksjon | `member_profiles.job_function` (ny) | Hvor du LANDER og hva navet vektlegger |

`selger` og `support` er **begge `dealer_staff` med nøyaktig samme tilgang**.
Forskjellen er at den ene starter dagen i kalenderen og den andre i innboksen.
Hadde de vært RBAC-roller, måtte hver `adminProcedure` og RLS-policy tatt stilling
til to verdier som ikke betyr noe for tilgang — og da blir en «funksjon» før eller
siden brukt som en rettighet ved et uhell.

**Migrasjon `0009_parallel_rafael_vega.sql`** — enum + nullable kolonne + backfill
av eksisterende rader (`dealer_admin → leder`, mekanikerprofil → `mekaniker`,
ellers `selger`). Idempotent via `where job_function is null`.

**Kolonnen er nullable med vilje.** De fleste ansatte har ingen rad i
`member_profiles`; `resolveJobbfunksjon()` utleder da funksjonen. En `NOT NULL`
ville krevd en skyggekopi av `member` som måtte holdes i synk for alltid.

**⛔ Fire sperrer på `team.setFunction`:** `adminProcedure` · eksplisitt
`kanEndreJobbfunksjon(ctx.role)` · **medlemskapssjekk på målpersonen** (uten den
kunne en leder skrevet en profilrad for en annen forhandlers ansatt — RLS stopper
lesingen, men innskrivingen ville hatt vår egen tenant-id og vært lovlig) ·
`leder` avvises som tildelbar verdi.

`team.list` er også `adminProcedure`: lista med navn, e-post, rolle og funksjon er
et personregister over verkstedet og hører til lederen.

**Låst av 12 nye rene tester** (`profil.test.ts`) **+ 11 integrasjonstester**
(`apps/api/test/jobbfunksjon.test.ts`), inkludert seks angrepstester.

---

## 2026-08-09 — Bugfiks: låst inne i en demo-tenant (F1-04)

**Ikke en roadmap-endring** — en implementasjonsfeil i F1-04 (tenant-oppretting).
Ingen punkter endret status.

**Rotårsak:** `createTenant` → `auth.api.createOrganization` gir oppretteren
Better-Auths standardrolle **`owner`**. Den verdien finnes ikke i vår RBAC-modell
(`OrgRole` = customer | dealer_staff | dealer_admin | endwise_admin). Doc-kommentaren
på `ownerUserId` lovet «blir dealer_admin»; koden leverte det ikke.

Konsekvens for «Yamaha Bergen»: mikkis sto som `owner` → matchet ingen rolleliste i
navet → både nav-radene og kontekstvelgeren forsvant → **låst inne uten dør ut**.
Ikke et sikkerhetshull, men en stille feil uten feilmelding.

**Fiks (to lag, gaten urørt):**
1. `createTenant` normaliserer eierens rolle til `dealer_admin` rett etter
   opprettelsen — rotårsaken, så nye tenants aldri kan strande noen igjen.
2. Seeden hever hovedbrukeren til `endwise_admin` i alle sine **demo**-tenants,
   idempotent. Rydder opp i tenants som allerede fantes.

⛔ **Dev-mode-gaten er ikke rørt:** flagg + `endwise_admin` + `kind='demo'` gjelder
fortsatt, og alle tre resolveres server-side som før. Vi gjorde ikke betingelsen
svakere — vi oppfylte den i data som var feil.

**Vurdert og forkastet:** å rendre velgeren så lenge brukeren er endwise_admin i
*minst én* demo-tenant. Det ville krevd å løsne `myDemoTenants` fra
`endwiseAdminProcedure` (som gjelder AKTIV tenant) til et kryss-tenant-oppslag —
en reell svekkelse av en bevisst gate, for å løse et dataproblem.

**Ny test:** `packages/auth/test/rolle-normalisering.test.ts` — tre tester som
går gjennom den ekte Better-Auth-veien og slår fast at eieren ikke blir `owner`,
blir `dealer_admin`, og at rollen ligger innenfor RBAC-modellen.

---

## 2026-08-09 — Integrasjoner vs Tjenester & priser (nytt punkt F5-33)

**Godkjent av:** Mikkis
**Endring:** Nytt punkt **F5-33** (`done`/`ui:full`) + **presisering av F5-04**.

**To akser, to faner:**

| Fane | Innhold | Handling |
|---|---|---|
| Integrasjoner | TREDJEPARTS verktøy (Quick, Vegvesen, Twilio, Resend, AI-leverandører, Lime, Finn.no, Composio) | Statisk oversikt. **Ingen av/på.** Bestill/etterspør |
| Tjenester & priser | ENDWISE-EGNE funksjoner + pris per tjeneste + abonnementsnivå | Bestill/etterspør |

**⚠️ Presisering av F5-04 — to ting het det samme.** F5-04 er
**forhandlerens EGEN tjenestekatalog** (EU-kontroll, Liten service …) med
`service_versions` og priser mot KUNDE. Det er noe helt annet enn hva forhandleren
betaler ENDWISE. Ruten `/tjenester` er nå tatt av F5-33, så F5-04 trenger en egen
rute — forslag `/innstillinger/tjenestekatalog`. **F5-04 står fortsatt `planned`**;
den er ikke bygget, bare presisert.

**Mock slettet:** `INTEGRATIONS_UI` i `abonnement/_data.ts` — hardkodet data med
av/på-brytere som kun levde i `useState`. Fanen leser nå `billing.katalog`:
ekte `tenant_modules` + priser fra Stripe-katalogen.

**⚠️ Composio er ikke besluttet.** Den står i katalogen fordi eier ba om det, men
er **ikke i techstacken** (CLAUDE.md §2), ingenting er bygget, status `coming`.
Skal den tas i bruk er det en egen stack-beslutning.

**Ingen nye UI-pakker.** Begge sidene er komposisjoner av eksisterende tokens og
`@endwise/ui`-ikoner. To lucide-ikoner lagt til barrelen: `Plug`, `ExternalLink`.

---

## 2026-08-09 — Offentlig veikart (nytt punkt F5-34)

**Godkjent av:** Mikkis
**Endring:** Nytt punkt **F5-34 — offentlig veikart på `/veikart`** (`done`/`ui:full`).
Ingen eksisterende punkter endret status.

Kundevendt statusside i tre bøtter: «Nylig lansert» · «Underveis» · «Planlagt».
Ingen F-koder eller teknisk sjargong — dette er for forhandlere. Innholdet ligger i
`VEIKART` øverst i fila; Endwise oppdaterer lista uten å røre JSX.

**⛔ Blokkerte punkter står i «Planlagt», ikke «Underveis»:** nettbutikk,
betaling i widget og deling mellom verksteder — alle uten tidsanslag, med
grunnen sagt rett ut.

**Avvik fra førsteutkastet, fordi ekte status vant:**
- **Kalendervisning** er FERDIG (F3-07) → flyttet fra «Underveis» til «Nylig lansert»
- **Invitasjonsflyt** (F1-10) og **varselsenter** (F5-08) er `planned` og ikke
  påbegynt → flyttet fra «Underveis» til «Planlagt»
- **Analyse** står i «Underveis» med at tallene fortsatt er mock, ikke i «Nylig lansert»

---

## 2026-08-09 — Deploy-avklaring + arkitekturoversikt (nytt punkt F13-03)

**Godkjent av:** Mikkis (bestilte planen; selve deployen er IKKE godkjent ennå)
**Endring:** Nytt punkt **F13-03** (`planned`) + **presisering av F0-07**.
Ingenting bygget — dette er en plan til godkjenning.

**To nye notater:** `docs/deploy-plan.md` og `docs/arkitektur.md`.

**⚠️ F0-07 presisert.** Punktet sa «Vercel-prosjekter (web/api/stream)» — altså
tre prosjekter. Analysen konkluderer annerledes, og F0-07 peker nå videre til
F13-03 i stedet for å stå igjen med en anbefaling vi har forlatt.

**Konklusjonen:**

| App | Anbefaling |
|---|---|
| `apps/api` | Port inn i Next som route handlers. Vercel-native, same-origin, `API_INTERNAL_URL` utgår |
| `apps/stream` | Egen persistent-prosess-host (Railway/Render/Fly.io, EU). **⛔ Ikke Vercel serverless** |
| `apps/framer-agent` | Utsettes til F4/F9. Krever container, ikke serverless |
| Kundewidgeten | Deployes ikke av oss — publiseres gjennom Framer |

**Funn underveis:** ingen av Hono-appene har et byggetrinn i dag (`build` er
`tsc --noEmit`), og `vercel.json` finnes i alle tre uten at noen har en
Vercel-entrypoint. «Minimal endring ved egen deploy» var derfor delvis en
illusjon — arbeid kreves uansett vei.

**Fire åpne spørsmål til eier** står nederst i `docs/deploy-plan.md`.

---

## 2026-08-09 — TO-LEVERANDØR-TOPOLOGI: Vercel + Scaleway (Neon droppet)

**Godkjent av:** Mikkis (beslutningen er tatt; deployen er IKKE bygget)
**Endring:** **F13-01 endret** (Neon → Scaleway) · **F13-03 utvidet** ·
**F0-07** peker på den nye topologien.

| Lag | Leverandør | Hva |
|---|---|---|
| Compute | **Vercel** (fra1) | `apps/web` + `apps/api` portet inn som Next route handlers |
| Data | **Scaleway** (Frankrike) | Managed PostgreSQL · Serverless Container for `apps/stream` (min. 1 instans) · Key Manager |

**⚠️ Neon er droppet.** To grunner: (1) to leverandører totalt, ikke tre;
(2) sanntidskanalen holder én permanent `LISTEN`-forbindelse, og serverless-Postgres
med pooler foran er en kjent dårlig match for det — pooleren kan resirkulere
forbindelsen, og varselet forsvinner uten feilmelding.

**Den ærlige kostnaden:** vi mister branch-per-PR (preview-DB-strategi er nå et
åpent punkt), scale-to-zero, og PITR må settes opp og **testes** eksplisitt.

**⚠️ Techstack-endring (CLAUDE.md §2).** `docs/endwise-techstack.md` er oppdatert
sju steder — Neon → Scaleway. Dette er en kanonisk stack-endring, gjort på
eksplisitt beslutning fra eier i denne økta.

**GDPR-funn, verifisert i koden:** `pg_notify`-payloaden er nøyaktig
`{ id, tenantId, audienceId }` — kun IDer. **Men SSE-rammen er det ikke alltid:**
streamen sender hele `stream_events.payload` videre, og ved eskalering (`summary`)
og AI-streaming (tokens) passerer generert tekst fra kundesamtaler gjennom
prosessen. Lav risiko fordi den ligger i EU, ikke lagrer noe og filtrerer på
`audienceId` — men begrunnelsen er ikke «bare IDer».

**Skaleringssti dokumentert** for `apps/stream`: én container → vertikal skalering
(rekker langt) → ⛔ horisontal krever **app-endring** (delt pub/sub, siden fan-out
er in-memory + én LISTEN) → Kapsule til slutt. **K8s løser ikke skalering alene.**

**Kodekommentarer oppdatert** der de sa Neon: `packages/db/src/client.ts`,
`packages/modules/src/booking/engine.ts`, `packages/db/sql/grants.sql`,
`docker-compose.yml`, `docker/init/01-roles.sql`, `.env.example`.
Historiske rapporter i `docs/rapporter/` er **ikke** rørt — de er daterte referater.

**⚠️ Funn som må håndteres før deploy:** `packages/db/drizzle.config.ts` har
`entities.roles.provider: 'neon'`. Det er en *funksjonell* innstilling, ikke en
kommentar. Ikke endret nå — må testes mot en engangsdatabase.

**⚠️ Premiss som ikke stemte:** det finnes ingen «eksterne kostnader»-visning med
en Neon-rad i adminflaten. Søk etter `Neon` i hele `apps/web` gir null treff.

---

## 2026-08-11 — Framer AI-nettside lagt inn som plan (F8-09 omskrevet, F13-04 + F14-21 nye)

**Godkjent av:** Mikkis (arkitekturen er eierbekreftet)
**Omfang:** kun planlegging og dokumentasjon. **Ingenting bygget, ingenting koblet på Framer.**

### Hva som ble lagt inn

| ID | Fase | Hva |
|---|---|---|
| **F8-09** | F8 Integrasjoner | **Omskrevet** fra ett løst punkt til et komplett produktkort (9 detaljpunkter) |
| **F13-04** | F13 Deploy & drift | **Nytt** — infrastruktur + skalering til minst 250 forhandlere (8 detaljpunkter) |
| **F14-21** | F14 Personvern | **Nytt** — Framer som ny underdatabehandler |

Roadmapen har nå **15 faser / 178 punkter / 0 duplikat-IDer**.

### Arkitekturen som ble skrevet ned

- **Framers offisielle Server API** (oppgitt lansert 12.02.2026), server-side, uten at
  forhandleren har Framer åpen.
- ⛔ **Community-MCP-pluginen er avvist** og lagt i «Døde valg» i techstacken: den krever en
  åpen Framer-klient på en persons maskin — ingen kø, ingen retry, ingen revisjonslogg, og
  ikke noe 250 forhandlere kan dele.
- Flyt: **beskriv → forslag → diff → godkjenn → publiser.** ⛔ Aldri publisering uten
  forhandlerens godkjenning. Publiseringsverktøyet *forbereder*, det *utfører* ikke.
- Faste tools (les side · lag side · oppdater seksjon · forbered publisering), modellruting
  etter dataklasse, egen entitlement.
- Kjører som **Scaleway Serverless Container** ved siden av `apps/stream`.

### Hvordan planen håndterer 250 forhandlere

1. **Tokens:** 250 egne tokens, envelope-kryptert i `integration_config`
   (`provider='framer'`), tenant-scopet via RLS — samme mønster som Quick-tokenet.
   ⚠️ To åpne punkter: tabellen har ingen kolonner for refresh-token/utløp (nødvendig ved
   OAuth), og Scaleway Key Manager (F1-13) er fortsatt parkert, så KEK-en ligger i en
   miljøvariabel.
2. **Tilkoblinger:** ⚠️ **per jobb, ikke per forhandler.** 250 forhandlere gir 0 alltid-åpne
   koblinger. Dimensjoneringstallet er *samtidige redigeringsjobber* — enkeltsifret ved
   sporadisk bruk. Jobb-kø med **to** grenser (global + per tenant), køen i **Postgres**
   (`FOR UPDATE SKIP LOCKED`), `min_scale=1` som utgangspunkt.
3. **Rate limits:** backoff med jitter, global token-bucket, 429 → tilbake i kø (ikke feil
   mot bruker). ⛔ De faktiske tallene er **ikke** kjent for oss og skal verifiseres mot
   Framers dokumentasjon før grensene settes.
4. **Isolasjon:** scoped token + faste tools, og **prosjekt-IDen leses fra tenantens config,
   aldri fra modellens output eller fra sideinnhold** — ellers kunne en promptinjeksjon i en
   side-tekst peke agenten på en annen forhandlers prosjekt.
5. **Kostnad:** tre linjer (AI per redigering · Framer Server API · containerleie). Skalerer
   med **bruk**, ikke med antall forhandlere. ⛔ Største usikkerhet er Framer selv: krever
   Server API en bestemt plan, og er den per prosjekt? Da blir kostnaden per forhandler.
6. **Sikkerhet/personvern:** Framer blir ny databehandler (F14-21 → subprosessorliste F14-15
   + personvernerklæring F14-17), forhandleren autoriserer tilgangen selv, og
   godkjenn-før-publiser er den harde sperren.

### ⚠️ Techstack-endring (CLAUDE.md §2)

`docs/endwise-techstack.md` er endret fire steder på eierens beslutning:
Vercel Container → **Scaleway Serverless Container**, External Agent CLI → **Server API**,
Framer-raden i integrasjonstabellen, og community-MCP-pluginen inn i «Døde valg».

### ⚠️ Forbehold som står i kortene

Hele planen hviler på eierens bekreftelse av at Server API-en finnes og hva den kan.
**API-flate, autentisering, grenser og prising er ikke lest av oss** og må verifiseres mot
Framers dokumentasjon før første linje kode.

### Sidefunn: roadmap-rendereren krasjet

Seks kort (`F1-14`, `F5-33`, `F5-34`, `F6-16`, `F6-17`, `F13-03`) var skrevet med
`{why, points[]}`, mens rendereren kun leste `{lead, steps[]}` — den traff `d.steps.length`
på `undefined` og **hele punktlista sluttet å rendre**. Fikset med en `normDet()`-normalisering
som godtar begge formene, slik at eksisterende kort ikke må skrives om. Verifisert i nettleser:
15 faser, 178 punkter, alle 35 detaljkort åpner.

---

## 2026-08-11 (b) — Bilder på markedssiden «/» (nytt punkt F5-35)

**Godkjent av:** Mikkis
**Endring:** markedssiden `/` fikk de fire bildene fra `apps/web/public/images/`.

### ⚠️ Kortet ble laget i ETTERTID

`/` ble bygget om til markedsside 09.08.2026 **uten et roadmap-punkt**. Det er et brudd på
CLAUDE.md §1, og det ble oppdaget nå fordi denne oppgaven skulle verifiseres mot roadmapen og
det ikke fantes noe å verifisere mot. **F5-35** dekker derfor både siden og bildene, og sier
eksplisitt at den er etterregistrert. Roadmapen: **15 faser / 179 punkter / 0 duplikat-IDer**.

### Bildene som ble funnet

Fire filer i `apps/web/public/images/` — én serie: samme duotone-rastrering i blått og
kremhvitt, arkitekturmotiv, alle 1672×941, ~900 kB hver.

| Fil | Motiv | Plassert på |
|---|---|---|
| `hero` | Rotunde utenfra — mange søyler bærer én bue | **Hero**, øverst (16:9) |
| `img_1` | Utsikt ut gjennom en bue mot sypresser og sjø | **«Hva du får»** (21:9) |
| `img_2` | Loggia innenfra — like buer på rekke | **«Slik henger det sammen»** (21:9) |
| `img_3` | Løvdekt pergola med tre buer og fontene | **«Klar til å prøve?»** (21:9) |

**Den røde tråden:** utenfra → utsikten → innsiden → ankomsten. Pris-seksjonen står bevisst
uten bilde — den trenger luft, ikke enda et motiv.

### Valg som er verdt å kjenne

- **To formater gir hierarki.** Hero er 16:9, de tre andre er 21:9-bånd. Fire like høye bilder
  nedover en 720px-spalte ville lest som et galleri der ingen av dem betydde noe.
- **Verdipunktene har ikke ett bilde hver.** Seks punkter, tre bilder — og seks små
  illustrasjoner ville blitt det ikon-rutenettet siden er designet for å unngå. Bildet hører til
  seksjonen. Strukturen `BILDER` er nøkkelbasert, så et bilde flyttes ved å bytte én nøkkel.
- **Statiske importer**, ikke strenger: `width`/`height` og uskarp plassholder kommer automatisk,
  og et feilstavet filnavn blir en byggefeil i stedet for et hull i produksjon.

### ⚠️ Filene måtte døpes om

De lå som `.jfif`. De **er** ekte JPEG-er (magic `ffd8ffe0`), men `.jfif` er ikke en kjent
bilde-endelse — verken for statiske importer eller for bilde-optimaliseringen. Døpt om til
`.jpg`. Verifisert etterpå: alle fire svarer `200 image/jpeg` gjennom `/_next/image` og dekoder
til 1672×941.

### UI-PAKKER.md

Ny rad i §8 for `Bildefelt`: ingen pakke dekker et bilde på en markedsside (shadcn har ingen
media-komponent), så komponenten er ~20 linjer `next/image` på token-laget. **Ingen ny pakke
tatt inn.**

---

## 2026-08-12 — AI-chat-flaten på shadcn-mønstre + vår runtime (nytt punkt F6-18)

**Godkjent av:** Mikkis (nye pakker eksplisitt godkjent i økta)
**Endring:** nytt punkt **F6-18**, og **F6-04** oppdatert — AI-diagnose har nå en ekte chat-flate.
Roadmapen: **15 faser / 180 punkter / 0 duplikat-IDer**.

### Hva som ble hentet inn

| Komponent | Kilde |
|---|---|
| `message` | ✅ shadcn-registeret, **0 avhengigheter** |
| `message-scroller` | ✅ shadcn-registeret, krever `@shadcn/react` |
| `questionnaire` | ⚠️ **Ikke i registeret** (404) — stil-skall skrevet mot dokumentert API |
| `tool-part` | ✍️ Egenskrevet — shadcn har ingen |

**Nye pakker (§2, godkjent):** `@ai-sdk/react` (305 kB), `@shadcn/react` (56 kB, 0 deps, MIT),
`@shadcn/helpers` (48 kB, MIT). `ai@7` lagt til eksplisitt i apps/api og apps/web.
⛔ **Ingen Vercel AI Gateway.**

### Ekte vs. demo

- **Ekte:** `/ai-verktoy/diagnose` → `POST /chat/ai-diagnose` → vår agent-runtime.
  Agenten `ai-diagnose` er `customer_freetext` ⇒ Mistral EU.
- **Demo:** `/ai-verktoy/nettside` (Framer, F8-09 ikke bygget) → forhåndsskrevet samtale via
  `createChat()`. Merket i UI-et, i kortet og i filhodet.

### ⚠️ To ekte funn

**1. L4-guardrailen tålte ikke strømming.** `filterOutput()` kjører regexene på hele svaret.
Tokens kommer i biter, og et fødselsnummer delt som «120345»+«67890» treffer ingen regex.
Å strømme rått og filtrere til slutt er ikke å filtrere. Løst med `createStreamRedactor()`
(akkumulerer, redigerer hele teksten hver runde, sender bare ut det som ikke lenger kan endre
seg). **8 nye tester**, inkl. tegn-for-tegn-strømming.

**2. Rekkefølge-bug som bare ekte HTTP avslørte.** Første versjon tømte redaktøren i strømmens
`flush()`. Resultat: `text-delta` etter `finish`, med en `id` uten `text-start` → strømmen endte
i `error` og **halen av hvert svar ville forsvunnet**. Typecheck, lint og enhetstester var alle
grønne. Nå: én redaktør per tekstblokk, tømmes rett før `text-end` med samme id.

### ⚠️ Avvik fra oppgaveteksten

Endepunktet ble lagt i **apps/api**, ikke som Next route handler. `apps/web` har med vilje ingen
databasetilgang (`docs/arkitektur.md`); en chat-rute der ville trukket DB + Better-Auth +
agent-runtime inn i laget vi har holdt rent. `/chat/*` rewrites til api — for nettleseren er
forskjellen null, og når api porteres inn i Next (F13-03) **blir** den en route handler.

### ⚠️ Hva som IKKE er verifisert

`MISTRAL_API_KEY` og `FIREWORKS_API_KEY` er tomme lokalt, så ende-til-ende-testen kjørte mot
mock-provideren (dokumentert dev-oppførsel). Auth, modul-gate, strømformat, tool-loop og L4 er
verifisert over ekte HTTP — **et ekte Mistral-kall er det ikke.** At `customer_freetext` ikke KAN
rutes utenfor EU er bevist med enhetstest (`DataRegionViolation`).

### UI-PAKKER.md

Ny **§9 (chat)**. ⚠️ Raden for `ai-elements` i §7 er merket: den overlapper nå med §9
(`Conversation`/`Message`/`PromptInput` er dekket). Å ta den inn nå ville gitt to
meldingskomponenter side om side — det er en §2-avklaring for eier.

---

## 2026-08-12 (b) — §2-vedtaket for chat-pakkene formelt bekreftet

**Godkjent av:** Mikkis, via orkestratoren, i klartekst (alternativ **A**).

⚠️ **Hvorfor dette står som egen oppføring:** pakkene ble installert og bygget 12.08 på en
godkjenning som kom gjennom et internt spørsmålsverktøy brukeren **ikke faktisk så**. Vedtaket er
nå hentet inn på ordentlig. Ingenting ble rullet tilbake — valget ble bekreftet slik det sto.

### Vedtaket

| Pakke | Versjon | Lisens | Rolle |
|---|---|---|---|
| `@ai-sdk/react` | `^4.0.67` | Apache-2.0 | `useChat`. React-bindingen til `ai@7` vi alt kjører |
| `@shadcn/react` | **`0.3.0` pinnet** | MIT | Oppførsel i message-scroller + questionnaire. 0 avhengigheter |
| `@shadcn/helpers` | **`0.2.0` pinnet** | MIT | `createChat()` — demo-strømmen på Framer-flaten |

**Pinnet, ikke caret:** begge shadcn-pakkene er på 0.x, der minor-versjoner kan brekke API-et.
`@ai-sdk/react` beholder caret — den er på 4.x og følger `ai@7` som vi allerede har som caret.

### To hull som ble lukket samtidig

1. **Techstacken nevnte ingen av pakkene.** `docs/UI-PAKKER.md` §9 og roadmap-kortet hadde dem,
   men `docs/endwise-techstack.md` — som er den kanoniske etter CLAUDE.md §2 — sa ingenting.
   Nå står chat-komponentene, `@ai-sdk/react`, og en eksplisitt linje om at
   **Vercel AI Gateway ikke brukes**, med begrunnelsen (gateway ville flyttet modellvalget ut av
   `resolveModelProvider(dataClass)`, og EU-residensen med det).
2. **`ai` var deklarert transitivt.** Nå direkte avhengighet i `apps/api` og `apps/web`, som er
   der den faktisk importeres fra.

⚠️ **Fortsatt åpent for eier:** `AI Elements` står i techstacken som planlagt, men
`Conversation`/`Message`/`PromptInput` er nå dekket av §9. Å hente den inn ville gitt to
meldingskomponenter side om side. Igjen står `Plan`, `Task` og `Voice`.

---

## 2026-08-12 (c) — SIKKERHETSFIKS: 2FA håndhevet server-side (F1-11 → done)

**Godkjent av:** Mikkis (eksplisitt oppgave)

### Rotårsaken

⚠️ **Det manglet ikke en sjekk — det fantes en KONSTANT som aldri ble lest.**
`ROLES_REQUIRING_2FA` sto i `rbac.ts`, brukt null steder. Better-Auth sin twoFactor-plugin var
riktig satt opp, men den håndhever kun 2FA for brukere som ALLEREDE har `twoFactorEnabled = true`.
Samtlige sådde kontoer hadde `false` — altså logget hele forhandler- og admin-laget inn med
passord alene.

⚠️ **Rollelista var videre enn oppgaven antok:** ikke bare `dealer_admin` + `endwise_admin`, men
også **`dealer_staff`** — alt unntatt `customer`. Det omfatter mekanikere og selgere, altså
mekaniker-PWA-en. Fasiten er nå låst i en test.

### Hva som håndheves

Sjekken ligger i **`requireSession()`** — ett sted, som alle tre inngangene (tRPC-context,
REST-middleware, SSE) går gjennom. `db` er et **påkrevd** argument: gjorde vi det valgfritt,
ville et kallsted som glemte det stille hoppet over sjekken.

Kravet henger på **personen**, ikke på aktiv forhandler (`findRolesForUser` ser på alle
medlemskap) — ellers kunne man logget inn uten 2FA med en kunde-tenant aktiv og så byttet.

### ⚠️ Sidefunn: tRPC hoppet over `requireSession` helt

`createRequestContext` kalte `auth.api.getSession()` direkte. Dermed ble den **absolutte
maks-levetiden (F1-12, 12 t) ikke håndhevet på datatrafikken** — kun det glidende idle-vinduet.
REST og SSE hadde den. Rettet i samme slengen.

### Tvungen enrollment

Ny rute **`/2fa-oppsett`**, utenfor `(app)`. Uten den ville fiksen vært en utestengelse: hele
panelet henter data over tRPC, så en bruker uten 2FA kunne ikke nå siden der 2FA skrus på.
`/signin` og `/` ruter dit på `TWO_FACTOR_REQUIRED`.

### ⚠️ Målt: Better-Auth rydder ikke gamle sesjoner

To passord-sesjoner overlevde en fullført `verify-otp`. En slik sesjon ville plutselig bestått
2FA-sjekken uten å ha sett en kode. Oppsettflaten kaller derfor `revokeOtherSessions()`.

**Forkastet underveis:** en `databaseHooks.user.update.after` som rev alle sesjoner. Den logget
også ut sesjonen som nettopp fullførte 2FA, og ville fyrt ved helt urelaterte brukeroppdateringer.

**Restrisiko:** slås 2FA på utenom oppsettflaten, rydder ingen opp; en slik sesjon lever til den
dør av seg selv (≤12 t). Å lukke det helt krever enten revokering ved hver innlogging (= én aktiv
enhet per admin — en produktbeslutning) eller en ny kolonne. **Eierens valg.**

### Dev-levering av engangskoden

Koden skrives til serverloggen **kun** når `NODE_ENV !== production` **OG** `RESEND_API_KEY`
mangler. Betingelse to er den viktige: med bare den første ville en feilsatt `NODE_ENV` i prod
vært nok til at koder havnet i en driftslogg. ⛔ Ingen dev-endepunkt — ett feilkonfigurert
endepunkt er en bakdør. I prod uten Resend kaster den: innloggingen feiler lukket.

### ⚠️ Runtime-bug typecheck ikke fanget

`TwoFactorRequiredError` ble først skrevet med en TS **parameter-property**. `tsc --noEmit` var
grønn, men api og stream kjører med `--experimental-strip-types` → `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`
og **begge serverne døde på oppstart**. Funnet ved å faktisk starte serveren.

### Bonus: sesjonsopprydding

`purgeExpiredRows` i cleanup-workflowen var en TODO som returnerte 0. Sletter nå døde
sesjonsrader (utløpt idle ELLER passert absolutt levetid). ⛔ Rører aldri en levende sesjon.

### Verifisert

11 nye 2FA-tester (7 uten DB, 4 mot ekte medlemskap) · 3 OTP-leveringstester · 3 purge-tester ·
ende-til-ende mot ekte API: uten 2FA → **403 TWO_FACTOR_REQUIRED**, etter enrollment →
**twoFactorRedirect ved innlogging** og **200 med kode**. typecheck 22/22 · tester 21/21 · build ✅

---

## 2026-08-16 — Restrisikoen i F1-11 lukket: databasetrigger

**Godkjent av:** Mikkis (eksplisitt oppgave)

### Rotgrepet

⚠️ Kravet var «uansett hvordan 2FA ble slått på — **også direkte i basen**». Et rått
`UPDATE "user" SET two_factor_enabled = true` kjører ingen applikasjonskode. **Ingen app-sperre
kan derfor være siste skanse.** Sperren måtte ned i databasen.

**`endwise_2fa_session_cutoff`** (migrasjon `0010`, idempotent): en `AFTER UPDATE OF
two_factor_enabled`-trigger som sletter alle sesjoner for brukeren i det flagget går fra
ikke-sann til sann. En pre-2FA-sesjon dør nå **umiddelbart**, ikke etter ≤12 t.

### ⚠️ Hvorfor sletting og ikke et «gyldig fra»-tidsstempel

Tidsstempel var førstevalget — det ble forkastet etter en **måling**, ikke etter en magefølelse:

`session.created_at` er `timestamp` **uten tidssone**, og node-postgres skriver den i
*appserverens* lokale tid. En rad skrevet i samme øyeblikk som `now()` lå **7200 sekunder foran**
`now()` (databasen i UTC, Node i CEST).

Et SQL-satt tidsstempel sammenlignet med den kolonnen ville vært systematisk skjevt — og skjevt
**feil vei**: hver sesjon ville sett nyere ut enn grensen, så sperren ville **aldri slått til**.
En sikkerhetssjekk som stilltiende alltid sier ja er verre enn ingen sjekk, fordi den ser ut som
om den virker. Sletting har ingen klokke-semantikk.

*(Merk: dette rammer ikke F1-12s absolutte levetid — der sammenlignes JS mot JS, altså samme
klokkebasis i begge ender. Problemet oppstår kun når SQL og JS blandes.)*

### Hvorfor den nye sesjonen overlever

Triggeren fyrer inne i `UPDATE`-setningen; Better-Auth roterer sesjonen i en **senere** setning i
samme forespørsel. Verifisert ende-til-ende: to pre-2FA-sesjoner forsvant, den 2FA-verifiserte
overlevde, og `session.me` ga 200.

⚠️ Endrer rekkefølgen seg i en framtidig Better-Auth-versjon, må brukeren logge inn én gang til
— med kode. Den feiler **lukket**.

### ⛔ Avgrenset til overgangen

`OLD.two_factor_enabled IS DISTINCT FROM TRUE`. Uten den ville **enhver** oppdatering av en
2FA-bruker logget vedkommende ut — navnebytte, e-postverifisering, Better-Auths egne
felt-oppdateringer. Egen negativ test.

### Ikke valgt: single-active-session

Vurdert og forkastet. Den ville løst problemet, men også tvunget «én enhet per admin» — en
produktbeslutning, ikke en sikkerhetsfiks. Triggeren gir samme garanti uten den kostnaden.

### Verifisert

5 nye angrepstester i `packages/db/test/2fa-session-cutoff.test.ts` (rå SQL-angrep · ny sesjon
overlever · urelatert oppdatering rører ingenting · gjentatt `true` rører ingenting · andre
brukere urørt). Migrasjonen kjørt to ganger — idempotent. typecheck 22/22 · tester 21/21 ·
build ✅ · db 15 passed · auth 16 passed.

Ingen ny kolonne, ingen schema-endring i Drizzle — kun trigger.

---

## 2026-08-16 (b) — Invitasjonsflyt / første innlogging (F1-10 → done)

**Godkjent av:** Mikkis (eksplisitt oppgave)

Bygget rett oppå de to forrige: **F1-14** gir jobbfunksjonen invitasjonen tildeler, og **F1-11**
gjør at den ansatte ikke kommer inn før tofaktor er satt opp. Invitasjonen oppretter altså aldri
en konto som kan brukes uten 2FA.

### Sikkerhetsmodellen

- ⛔ **Tokenet lagres aldri.** 32 tilfeldige byte i lenka, SHA-256 i basen.
- ⛔ **Engangs-garantien ligger i SQL** (`update … where accepted_at is null`), ikke i en
  if-setning. To samtidige forsøk gir én vinner, avgjort av databasen.
- ⛔ **Tre lag** hindrer at en invitasjon gir mer enn `dealer_staff`: modulen, ruta
  (`adminProcedure` + rollesjekk), og en **CHECK-constraint** i basen.
- Utløp etter 7 dager. Tilbakekall fra lederens flate.

### ⚠️ Oppslaget måtte bli en SECURITY DEFINER-funksjon

`invitations` har RLS + FORCE RLS, men den som åpner lenka har verken sesjon eller tenant.
**Verifisert: en unscopet select som app-rollen returnerer 0 rader.** Uten funksjonen ville hver
eneste invitasjon sett ut som «ukjent token». `lookup_open_invitation` / `consume_invitation`
gjør ett oppslag på hash og svarer kun på åpne invitasjoner — samme mønster som
`redact_audit_log()` (F14-16).

### ⚠️ To ekte bugs, begge funnet ved å kjøre det

1. **Sti-kollisjon.** API-et lå først på `/invitasjon/*` — samme sti som Next-SIDEN. Next ville
   servert HTML der klienten venter JSON. API-et flyttet til `/invitasjoner/*` (flertall).
2. **Forhandlernavnet ble stille «Endwise».** Oppslaget mot `tenants` gikk uten tenant-kontekst,
   og RLS returnerte null rader i stedet for en feil — så fallbacken så ut som en fornuftig
   standard. Rettet med `withTenant` begge steder.

Ingen av dem ble fanget av typecheck.

### Rekkefølgen i godta-stien

valider → slå opp → **forbruk token** → opprett bruker/medlemskap. ⚠️ Feiler siste steg, er
invitasjonen brukt opp uten at kontoen ble ferdig. Det er den trygge feilretningen: aldri to
kontoer fra ett token.

### Verifisert

**21 angrepstester**: gjenbrukt · utløpt · tilbakekalt · oppdiktet token · kryss-tenant
tilbakekall · kryss-tenant liste · dealer_staff kan verken invitere, se lista eller tilbakekalle ·
customer avvist · rå INSERT med `dealer_admin` avvist av CHECK · rå INSERT med funksjonen `leder`
avvist · oppgitt `tenantId` i kroppen strippes.

Mot ekte database: modules **120**, db **49**, auth **16**, api **63**. typecheck 22/22 · build ✅

Ende-til-ende mot ekte API: hele kjeden fra lenke → konto → medlemskap → innlogging bekreftet.

---
