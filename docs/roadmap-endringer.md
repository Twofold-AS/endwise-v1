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
