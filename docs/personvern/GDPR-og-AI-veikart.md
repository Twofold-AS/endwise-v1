# GDPR- og AI-compliance — veikart for Endwise

**Dato:** 14. juli 2026 · **Status:** handlingsplan, ikke ferdig compliance
**Eier av dokumentet:** Mikkis (Twofold) · **Neste revisjon:** før første forhandler i produksjon

> ## ⚠️ DETTE ER IKKE JURIDISK RÅDGIVNING
>
> Dokumentet er en teknisk og organisatorisk handlingsplan skrevet av en utvikler, basert på
> offentlig tilgjengelige kilder som er sitert underveis. **Rolleavklaring, DPA-er, overførings-
> grunnlag og DPIA må kvalitetssikres av advokat med personvernkompetanse før produksjon.**
>
> Der noe *må* til advokat, står det eksplisitt: **[ADVOKAT]**.
> Der vi kan gjøre det selv, står det: **[VI SELV]**.

---

> ## 🔗 DETTE DOKUMENTET HAR EN PORTVAKT I ROADMAP
>
> Alle punktene her er ført inn som **fase F14 — «⛔ COMPLIANCE-PORTVAKT (GDPR + AI Act) — INGEN
> PRODUKSJON FØR ALT ER GRØNT»** i `docs/endwise-roadmap.html`.
>
> **Dette dokumentet er *hvorfor*. F14 er *hva som må krysses av*.** Endrer du noe her, oppdater
> F14 — og motsatt. To dokumenter som sier ulike ting om det samme er verre enn ett dokument som
> tar feil.
>
> | F14-ID | Punkt | Type |
> |---|---|---|
> | **F14-04** | 🔴 **AI Act art. 50-merking — HARD FRIST 2. AUGUST 2026** | Teknisk |
> | **F14-07** | ⛔ **Rolleavklaring — blokkerer alt annet** | Juridisk |
> | F14-08 | DPA med forhandlerne | Juridisk |
> | F14-09 | DPA med Mistral + skriftlig «trening av» | Juridisk |
> | F14-10 | Mistral-konto: betalt plan · opt-out · **Labs models AV** | Juridisk/drift |
> | F14-11 | ⚠️ Mistral ZDR **søkt og innvilget** (kan avslås) | Juridisk |
> | F14-12 | DPA + SCC med Fireworks | Juridisk |
> | F14-13 | Transfer Impact Assessment (Fireworks) | Juridisk |
> | F14-14 | DPIA gjennomført | Juridisk |
> | F14-15 | Personvernerklæring + subprosessorliste | Juridisk |
> | **F14-17** | **OFFENTLIG personvernerklæring / åpenhetsdokument (publiseres til sluttbrukere)** | Juridisk (vi lager utkast) |
> | F14-05 | Scope-gate **ut av audit-modus** | Teknisk |
> | F14-02 | Rutingregel + EU-endepunkt verifisert i CI | Teknisk |
> | F14-03 | Logg-policy + retensjon | Teknisk |
> | F14-16 | Sletterutine som når **alle ledd** (inkl. leverandørlogger) | Teknisk |
> | F14-01 | Pseudonymisering før prompt | Teknisk |
> | F14-06 | Compliance-artefakter generert fra kode | Teknisk |

---

## 0. Kort oppsummering

| Spørsmål | Svar (per 14.07.2026) |
|---|---|
| Er Fireworks DPF-sertifisert? | **Sannsynligvis nei.** Ikke funnet i DPF-lista, og Fireworks' egen personvernerklæring viser til **SCC («Model Clauses»)** som overføringsgrunnlag — ikke DPF. Må verifiseres manuelt |
| Har Fireworks ZDR? | **Ja, som standard** for chat completions (som er det vi bruker). ⚠️ **Ikke** for «Response API» (`store=True` som default, 30 dagers retensjon) |
| Bruker Fireworks våre data til trening? | **Nei, uten eksplisitt opt-in** — står i deres personvernerklæring og docs |
| Treffer vi Datatilsynets DPIA-liste? | **Ikke entydig.** Vi treffer trolig ikke et av punktene direkte, men usikkerheten er stor nok til at **DPIA bør gjøres** |
| Gjelder AI Act art. 50 for oss? | **Ja.** Chatbot-plikten gjelder **fra 2. august 2026** — om 19 dager |
| Er arkitekturen god nok? | **Teknisk: ja, uvanlig god.** Se §3. Hullet er ikke arkitekturen — det er **fritekst inn i prompten** |

> ## 🔄 OPPDATERT 14.07.2026 — BESLUTNING TATT: BEGGE LEVERANDØRER
>
> **Vi bruker Mistral (EU) OG Fireworks (global), delt etter dataklasse.**
>
> **🔄 OPPDATERT 02.09.2026 (Mikael):** `resolveModelProvider` ruter **begge** dataklasser til Mistral EU.
> Fireworks var prisvalg, ikke lovkrav. Agent-runtime velger den ikke. EU-vernet
> (`customer_freetext` mot ikke-EU) står. `@ai-sdk/fireworks` kan bli stående unused.
>
> | Dataklasse | Leverandør (resolve, 02.09) | Hvorfor |
> |---|---|---|
> | **Sluttkundens fritekst** (kunde-support-agenten) | **Mistral (EU)** | Ingen tredjelandsoverføring. Problemet forsvinner, det håndteres ikke |
> | **Tenant-skopede driftsdata** (Ronny, drifts-agenten) | **Mistral (EU)** | Samme leverandør. Region-typen tillater fortsatt global; resolve velger den ikke |
>
> **Regelen er implementert i KODE, ikke i dette dokumentet:** hver agent erklærer `dataClass`,
> hver provider erklærer `region`, og `spawnAgent()` **nekter å starte** en `customer_freetext`-agent
> mot en ikke-EU-leverandør. 13 tester dekker det.
>
> **Konsekvensen for veikartet:** vei A og vei B under er *begge* valgt, for hver sin dataklasse.
> **For support-agenten bortfaller hele overføringsdiskusjonen** — ingen SCC, ingen TIA, ingen
> «forhandleren må akseptere USA». For Fireworks-agentene består den, men de ser bare driftstall.

---

## 1. PUNKT ÉN: Rolleavklaring. Alt annet henger på denne. **[ADVOKAT]**

Ingenting under kan ferdigstilles før dette er avgjort, fordi **hvem som er behandlingsansvarlig
avgjør hvem som skal signere hvilken DPA, hvem som skal gjøre DPIA-en, og hvem som svarer for
overføringen til USA.**

Arbeidshypotesen — som må bekreftes av advokat:

| Data | Behandlingsansvarlig | Databehandler | Begrunnelse |
|---|---|---|---|
| **Konto-/brukerdata** (forhandlerens ansatte: navn, e-post, telefon, passord, 2FA) | **Endwise** | — | Vi bestemmer formål og midler. Dette er *vår* SaaS-konto |
| **Verkstedsdata** (forhandlerens kunder, kjøretøy, bookinger, meldinger) | **Forhandleren** | **Endwise** | Forhandleren eier kunderelasjonen. Vi behandler på deres instruks |
| **Quick-speilet** (kundedata synket Quick→Endwise, og status/endringer tilbake Endwise→Quick) | **Forhandleren** | **Endwise** (Quick er forhandlerens egen ERP) | Forhandleren eier både Quick-instansen og kunderelasjonen. Endwise speiler og synker på deres instruks. Quick er *forhandlerens* system — ikke en underdatabehandler av Endwise |
| **Sluttkundens data i widget** (navn, regnr, fritekst) | **Forhandleren** | **Endwise** | Widgeten står på forhandlerens side, i forhandlerens navn |
| **AI-prompt-innhold** | **Forhandleren** | **Endwise** → **Fireworks (underdatabehandler)** | Kjeden er tre ledd. Det er her overføringen skjer |

**Konsekvensen av hypotesen, hvis den holder:**

- Vi trenger **databehandleravtale med hver forhandler** (vi er deres databehandler).
- Vi trenger **databehandleravtale med Fireworks** (de er vår underdatabehandler).
- **Forhandleren** er den som formelt må *akseptere* overføringen til USA — vi kan ikke godta den
  på deres vegne. Vi kan bare **opplyse** om den og innhente aksept. Det er nøyaktig modellen
  Dara/Soria bruker i sin DPA ([meetdara.no/dpa](https://meetdara.no/dpa)) — **og det er en
  legitim vei.**
- **DPIA-ansvaret** ligger hos forhandleren som behandlingsansvarlig — men i praksis er det vi som
  må lage den, fordi bare vi kjenner systemet. Vi leverer den som et vedlegg de kan bruke.

**Kundewidgeten (F4) — NY innsamlingsflate for persondata (art. 5/6/13/50):** Widgeten er en
OFFENTLIG, embeddbar flate på forhandlerens nettside der sluttkunden selv taster inn navn,
telefon, e-post, regnr og fritekst — og chatter med en kunde-AI. Behandlingsansvar: **forhandleren**
(widgeten står i forhandlerens navn, på deres domene), **Endwise = databehandler** — samme som
«sluttkundens data i widget» i tabellen over. Teknisk/organisatorisk: (a) **AI Act art. 50** —
opplysning om AI gis FØR samtalen og server-håndheves (F14-04); (b) kundefritekst går KUN til
**EU-provider (Mistral)**, aldri USA/Fireworks (F14-02), med **scope-gate** (F14-05) og
**pseudonymisering** (F14-01) før prompt; (c) anonym tilgang er scopet av en publishable key +
origin-allowlist + kortlevd token + RLS — en kunde kan ikke enumerere andres data; (d) rate-limit
mot misbruk. **Personvernerklæringen (F14-17) og DPIA-en MÅ dekke widget-innsamlingen** (hvilke
felt, formål, lagringstid, AI-behandling). Grunnlaget er typisk avtale/berettiget interesse for
booking-forespørselen — **[ADVOKAT]** bekrefter grunnlag + at widget-flaten inngår i forhandler-DPA-en.

**Quick-dataflyten (F8-01, QuickLite) — teknisk/organisatorisk (art. 32):** Endwise speiler
kundedata FRA forhandlerens egen Quick-instans (kunde→`customers`, `source='quick'`) og synker
status/endringer TILBAKE til Quick (toveis). Quick er *forhandlerens* ERP — forhandleren er
behandlingsansvarlig, Endwise er databehandler; Quick er ikke en underdatabehandler *av oss*.
Forhandlerens Quick API-token er en per-tenant hemmelighet og lagres **envelope-kryptert
(AES-256-GCM, BYOK — `ENDWISE_KEK` utenfor DB)**, RLS-skopet, og forlater aldri serveren. Kun
dealer_admin/endwise_admin kan sette/endre den. Ingen data forlater EU i denne flyten (Quick er
norsk drift) — men **behandlingsgrunnlag og DPA med forhandleren dekker også Quick-speilingen**,
og synkens omfang (hvilke felt) må inn i DPIA/behandlingsprotokollen. **[ADVOKAT]** bekrefter at
Quick-synken faller inn under den samme forhandler-DPA-en som resten av verkstedsdataene.

> **Merk, siden det ofte misforstås:** *ingen myndighet «godkjenner» en DPA.* Det finnes ikke en
> slik ordning. Datatilsynet kontrollerer i ettertid. En DPA er en avtale mellom to parter, og
> ansvaret for at den holder ligger på partene.

---

## 2. Beslutningstreet: to veier

### Vei A — Bli i EU (Scaleway / OVHcloud)

Bytt LLM-leverandør til en med EU-hosting. Da **forsvinner tredjelandsoverføringen**, og hele
kapittel 5 i GDPR blir irrelevant.

| | |
|---|---|
| **Kostnad** | Byttet i seg selv: **én fil** (`packages/providers/src/fireworks.ts`). Abstraksjonen er allerede der — det er hele poenget med den. Reell kostnad er **modellkvalitet**: EU-leverandørene har smalere utvalg, og du må verifisere at modellen faktisk kan tool calling godt nok for agent-løkka |
| **Risiko** | **Lav juridisk risiko.** Ingen overføring, ingen SCC, ingen TIA, ingen diskusjon med forhandlerne om USA |
| **Haken** | Du binder deg til et smalere modellutvalg og en mindre moden plattform. Og du må gjøre jobben på nytt om leverandøren ikke leverer |

> ⚠️ **Kildeforbehold:** brukeren har oppgitt at EU-alternativer (Scaleway, OVHcloud) er kartlagt
> med EU-hosting + tool calling + DPA. **Den rapporten ligger ikke i repoet**, og jeg har ikke
> verifisert påstandene selv. Legg den inn i `docs/personvern/` så den kan siteres.

### Vei B — Fireworks (USA) med SCC + TIA + DPA

| | |
|---|---|
| **Kostnad** | **Juridisk arbeid**, ikke teknisk: DPA med Fireworks, SCC (de tilbyr det), **transfer impact assessment**, og opplysning + aksept fra hver forhandler |
| **Risiko** | **Moderat, og håndterbar.** Fireworks har ISO 27001 + 27701 + **42001** (AI-styring), SOC 2 Type II, ZDR som standard, og ingen trening på våre data. Det er en sterk pakke |
| **Haken** | ⚠️ **Serverless kan ikke region-pinnes.** On-demand kan (`--region EUROPE`), serverless kan ikke. Så lenge vi er på serverless, går prompten til USA |

### 🎯 Anbefaling: **Vei B — men med F14-01 (pseudonymisering) som forutsetning**

Grunnen er ikke at overføring er greit. Grunnen er at **pseudonymisering fjerner premisset for
diskusjonen.**

Hvis prompten inneholder `kunde_id: 7f3a…`, `kjøretøy: MC`, `tjeneste: EU-kontroll` — og **ikke**
navn, e-post, telefon eller regnr — så er det som krysser Atlanteren i praksis ikke
identifiserende for Fireworks. Overføringen blir en formalitet i stedet for et problem, og
TIA-en blir en kort tekst i stedet for en utredning.

**Merk at dette ikke gjør dataene anonyme i GDPR-forstand** — vi kan re-identifisere dem, altså er
de fortsatt personopplysninger og GDPR gjelder. Men risikoen ved overføringen faller dramatisk, og
det er nettopp det en TIA måler.

**Det som IKKE lar seg pseudonymisere er fritekst.** Skriver kunden *«Hei, det er Ola Nordmann på
99887766, jeg har vondt i ryggen og klarer ikke løfte sykkelen»* — så er både identitet og en
**art. 9-helseopplysning** i prompten. Se §4.

**Fallback:** går Fireworks til on-demand i EU-regionen senere, forsvinner problemet helt. Det er
verdt å spørre dem om.

---

## 2b. Mistral (EU) — hva som faktisk står i vilkårene

⚠️ **Les denne før du antar at «vi bare skrur av trening».** To ting holder ikke helt det du trodde.

### ✅ EU-hosting — men det finnes et US-endepunkt

> *«By default, your data is hosted in the European Union. You may, however, **explicitly use our
> US API endpoint** and in such a case your data is hosted in the United States.»*
> — [Mistral Help Center](https://help.mistral.ai/en/articles/347629-where-do-you-store-my-data-or-my-organization-s-data)

**Dette er grunnen til at `assertEuEndpoint()` finnes i koden.** «Fransk selskap» er ikke det samme
som «EU-hosting» — det er base-URL-en som avgjør. En feilstavet miljøvariabel skulle ellers vært
nok til å flytte norske kunders helseopplysninger til USA i stillhet. Nå nekter provideren å bli
opprettet.

Samme kilde: *«Depending on the feature you use, your data can be temporarily transferred outside
of the European Union»* (underdatabehandlere, listet i deres Trust Center). Så EU er standarden,
ikke en absolutt garanti. **Underdatabehandlerlista må gjennomgås.** **[ADVOKAT]**

### ⚠️ Trening: opt-out finnes — men bildet er ikke helt entydig

To Mistral-kilder sier litt ulike ting:

| Kilde | Sier |
|---|---|
| [Mistral Docs — Privacy and data controls](https://docs.mistral.ai/admin/monitor-comply/privacy-data-controls) | *«**API**: data sent through the API isn't used for model training.»* — kategorisk |
| [Help Center — «Can I opt out…»](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training) | *«Customers on a **Scale** plan are **opted out of training by default**. Users on the **free plan** may opt out…»* — altså: på gratisplan er du **inne** til du skrur det av |

**Ærlig lesning:** dokumentasjonen sier «API brukes ikke», men hjelpesenteret forutsetter at
gratisbrukere *kan være inne* og må opt-oute manuelt. Det er ikke det samme.

**Hva du må gjøre — konkret:**

1. **Vær på en betalt plan** (Scale = opt-out som default).
2. **Verifiser toggelen likevel:** Admin Console → **Privacy** → *«Anonymous improvement data»* → **av**.
3. ⚠️ **Slå AV «Labs models».** Mistrals egen doku sier rett ut: *«If you activate Labs models, data
   can be used to train Mistral models, **regardless of your subscription plan or opt-out
   settings**.»* Det er en bakdør i ditt eget opt-out.
4. **Få det inn i DPA-en skriftlig.** En toggle i et adminpanel er ikke et avtalevilkår. **[ADVOKAT]**

### ⚠️ ZDR: ikke en bryter — en SØKNAD

Dette er den største avviket fra antakelsen:

> *«You can activate Zero Data Retention by submitting your request … As part of this request, you
> must provide **sufficient detail of your legitimate reasons** … We will review your request and,
> **at our discretion**, approve or deny the request.»*
> — [Mistral Help Center](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)

**ZDR hos Mistral er ikke en innstilling du skrur på. Det er en søknad de kan avslå.**

Uten ZDR: input/output lagres i **30 rullerende dager** for misbruksovervåking (per deres vilkår).
Det er lovlig og vanlig — men det er ikke «zero».

**Sammenlign med Fireworks:** der er ZDR **standard**, uten søknad. Det er et poeng i Fireworks'
favør som er verdt å notere, selv om vi velger Mistral for fritekst av regionshensyn.

**Handling:** søk om ZDR tidlig, og **planlegg for at søknaden kan bli avslått.** Får vi ikke ZDR,
er 30 dagers retensjon hos en EU-databehandler fortsatt langt bedre enn overføring til USA — men
det må stå i DPA-en og i personvernerklæringen.

### ✅ DPA finnes

Mistral publiserer sin DPA: [legal.mistral.ai/terms/data-processing-addendum](https://legal.mistral.ai/terms/data-processing-addendum).
Skrevet med GDPR som utgangspunkt, ikke som tillegg. **[ADVOKAT]** gjennomgår.

### ✅ Moderations-API — scope-gaten kjører i EU

`mistral-moderation-2603` klassifiserer tekst i ni kategorier, hvorav fire er våre:
**health**, **pii**, **law**, **selfharm**
([Mistral Moderation API](https://mistral.ai/news/mistral-moderation/)).

**Det avgjørende:** den kjører **i EU**. En scope-gate som selv måtte sende kundens fritekst til
USA for å avgjøre om den kunne sendes til USA, ville vært en sirkel vi ikke kom ut av.

---

## 3. Det arkitekturen ALLEREDE gjør riktig (ikke gjenoppfinn)

Dette er ikke selvros — det er materiale til DPIA-en, og det er sterkere enn det de fleste
SaaS-produkter kan vise til:

| Tiltak | GDPR-krav det oppfyller |
|---|---|
| **AI-en har ingen DB-tilgang.** Den kan bare kalle verktøy vi har skrevet | Art. 25 (innebygd personvern), art. 32 (sikkerhet) |
| **Agenten er låst til én tenant ved spawn** — frosset objekt, ingen setter, verktøy bygget én gang | Art. 32. Cross-tenant-lekkasje er strukturelt umulig, ikke bare forbudt |
| **Verktøy tar aldri imot tenant-ID.** Feltet finnes ikke | Art. 25. Prompt-injeksjon kan ikke flytte agenten til en annen forhandler |
| **RLS på hver tabell med `tenant_id`**, håndhevet i databasen | Art. 32. Beskyttelsen ligger under applikasjonen, ikke i den |
| **Guardrails L1–L5** (bl.a. L4: fjerner API-nøkler, DB-URL-er, tokens og **fødselsnumre** fra AI-svar) | Art. 32, art. 5(1)(f) |
| **Rollebasert tilgang** (`dealer_admin` / `dealer_staff` / …), håndhevet i backend | Art. 32, art. 5(1)(c) dataminimering |
| **Obligatorisk 2FA + 60 min sesjons-timeout** | Art. 32 |
| **Append-only audit-logg** som ikke kan endres av app-rollen | Art. 5(2) ansvarlighet |
| **76 automatiserte angrepstester**, inkl. «agenten kan ikke lese en annen tenants data selv når modellen ber om det» | Art. 32(1)(d) — *«regelmessig testing av tiltakene»* |

**Dette er DPIA-ens tiltaksdel, ferdig skrevet.** Den siste raden er verdt å understreke: GDPR
art. 32(1)(d) krever *jevnlig testing* av sikkerhetstiltakene. Vi har det i CI.

---

## 4. Det kjente hullet: fritekst → art. 9-data — **nå vesentlig mindre**

> **Oppdatert:** hullet er ikke lukket, men det er ikke lenger et *overførings*-problem.
> Fritekst går nå til **Mistral i EU**, og **scope-gaten (F14-05) er bygget** — med Mistrals egen
> moderasjonsmodell som motor, kjørende i EU. Det som gjenstår er å måle falske positive i
> audit-modus før den settes i blokkerende modus.
>
> Art. 9-grunnlaget må fortsatt avklares **[ADVOKAT]** — EU-hosting fjerner overføringsspørsmålet,
> ikke behandlingsgrunnlaget.

### Originalanalysen (fortsatt gyldig for hvorfor gaten trengs)

**Problemet, konkret:** kunde-support-agenten får kundens melding rå inn i prompten. Kunden er
ikke instruert i hva han skal skrive, og kan uoppfordret oppgi:

- helseopplysninger (*«jeg har ryggprolaps og trenger lavere sete»*) → **art. 9**
- fagforeningsmedlemskap, religion, etnisitet → **art. 9**
- fødselsnummer, kontonummer

**Art. 9 krever et eget behandlingsgrunnlag.** «Berettiget interesse» holder ikke. Og vi har ikke
bedt om dataene — de kommer likevel.

**Tiltak (F14-05):** en guardrail-utvidelse som **kjører før prompten sendes**, oppdager
mønstre for særlige kategorier, og enten **maskerer** dem eller **stopper og eskalerer til et
menneske** (F6-05 finnes allerede — broen er bygget).

**Ærlig forbehold:** mønstergjenkjenning på fritekst er upålitelig. Den fanger det åpenbare, ikke
det subtile. Derfor må den kombineres med:

1. **Transparens i UI**: «Ikke del helseopplysninger eller fødselsnummer i chatten» — plassert der
   kunden skriver, ikke i en personvernerklæring ingen leser.
2. **ZDR hos leverandøren** (som Fireworks har) — slik at dataene ikke persisteres hos dem uansett.
3. **Kort logg-retensjon hos oss** (F14-03).

---

## 4b. Sletting: umiddelbart hos oss, inntil 30 dager i AI-leddet **[ADVOKAT]**

Dette avsnittet er **utkast til ordlyd** for personvernerklæringen (F14-15) og for svaret en kunde
får når hun ber om sletting. **Den endelige teksten skal kvalitetssikres av advokat** — men
strukturen og de tekniske fakta er våre, og de stemmer med hvordan sletterutinen (F14-16) faktisk
oppfører seg.

### Utkast (klar til advokat)

> **Når du ber om at opplysningene dine slettes:**
>
> Vi sletter eller anonymiserer opplysningene dine hos Endwise **umiddelbart**. Meldinger, notater
> og kontaktopplysninger fjernes; bookinger og kjøretøyhistorikk anonymiseres (personen fjernes,
> men transaksjonen beholdes så lenge bokføringsloven krever det).
>
> Når du har brukt vår AI-assistent, kan meldingene dine ha blitt behandlet av vår
> databehandler for kunstig intelligens (**Mistral AI, EU**). Der lagres innhold i **inntil 30
> dager** for sikkerhets- og misbruksovervåking, før det slettes automatisk. Vi har ikke et
> teknisk grensesnitt for å fjerne en enkelt melding fra denne mellomlagringen før fristen — men
> **den forsvinner innen 30 dager uansett**, og innholdet brukes ikke til noe annet formål og
> ikke til å trene AI-modeller.
>
> Du får en bekreftelse når slettingen er utført hos oss, med opplysning om at AI-leddet tømmes
> innen fristen over.

### Hvorfor teksten ser slik ut

- **«umiddelbart hos oss»** er sant: `eraseCustomer()` (F14-16) kjører synkront gjennom alle våre
  ledd før den svarer.
- **«inntil 30 dager i AI-leddet»** er sant og dokumentert: Mistral lagrer input/output i 30
  rullerende dager uten ZDR ([kilde](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)).
  Dette er nøyaktig grunnen til at sletterutinen returnerer status **`partial`, ikke `completed`** —
  koden og teksten sier det samme.
- **Modellen er Dara-modellen:** vi *unngår* ikke problemet, vi **opplyser om det og setter en
  frist**. Det er en legitim vei (jf. [meetdara.no/dpa](https://meetdara.no/dpa)).

### To ting som endrer dette avsnittet hvis de skjer

1. **Får vi ZDR innvilget hos Mistral (F14-11):** da lagres ingenting i AI-leddet, og hele
   30-dagers-halen faller bort. Avsnittet skal da skrives om til «slettes umiddelbart, også i
   AI-leddet». **Dette er den beste grunnen til å prioritere ZDR-søknaden.**
2. **Fireworks-leddet:** for drifts-agentene (Fireworks) er det ingen 30-dagers-hale — ZDR er
   standard der. Halen gjelder **kun** Mistral-leddet, altså kun kundevendt AI-chat.

---

## 5. Sjekkliste før produksjon — prioritert

| # | Oppgave | Hvem | Blokkerer lansering? |
|---|---|---|---|
| **1** | **Rolleavklaring** behandlingsansvarlig / databehandler | **[ADVOKAT]** | ✅ **JA** — alt annet henger på den |
| **2** | **DPA med forhandlerne** (vi som databehandler). Må opplyse om overføring til USA og innhente aksept — Dara-modellen | **[ADVOKAT]** skriver, **[VI SELV]** leverer vedlegg (dataflyt, subprosessorliste) | ✅ **JA** |
| **3** | **DPA + SCC med Fireworks.** De tilbyr Model Clauses — be om avtalen skriftlig | **[ADVOKAT]** vurderer, **[VI SELV]** innhenter | ✅ **JA** |
| **4** | **ZDR bekreftet skriftlig** i avtalen — ikke bare i dokumentasjonen. Og eksplisitt: **vi bruker ikke Response API** | **[VI SELV]** innhenter, **[ADVOKAT]** verifiserer | ✅ **JA** |
| **5** | **Transfer Impact Assessment (TIA)** — hvis vei B | **[ADVOKAT]** | ✅ **JA** (vei B) |
| **6** | **DPIA** | **[ADVOKAT]** kvalitetssikrer, **[VI SELV]** skriver teknisk del (§3 er ferdig) | ✅ **JA** — se §6 |
| **7** | **AI Act art. 50-merking** i UI («du snakker med en AI») | **[VI SELV]** — F14-04 | ✅ **JA** — **frist 2. august 2026** |
| **8** | **Pseudonymisering før prompt** | **[VI SELV]** — F14-01 | ⚠️ Anbefalt som *forutsetning* for vei B |
| **9** | **Logg-policy med retensjonstid** | **[VI SELV]** — F14-03 | ⚠️ Bør |
| **10** | **Art. 9-vakt** på fritekst | **[VI SELV]** — F14-05 | ⚠️ Bør |
| **11** | Personvernerklæring + subprosessorliste publisert | **[ADVOKAT]** + **[VI SELV]** | ✅ JA |

---

## 6. DPIA — treffer vi Datatilsynets liste?

Datatilsynets liste over behandlinger som **alltid** krever DPIA er gjennomgått punkt for punkt.

**Vi treffer ikke noe punkt entydig.** Vi driver ikke med biometri, genetikk, ansattmonitorering,
kameraovervåking, skoledata eller scoring av personer.

**Men to punkter er nære nok til å gjøre meg urolig:**

1. > *«Behandling av personopplysninger med innovativ teknologi i følge med minst ett annet
   > kriterium»*

   AI-agenter er «innovativ teknologi» i enhver rimelig lesning. Det «andre kriteriet» ville vært
   **særlige kategorier** — som *kan* komme inn via fritekst (§4). Da treffer vi.

2. > *«Behandling av personopplysninger der formålet er å tilby en tjeneste … som involverer å
   > forutsi … helse, personlige preferanser eller interesser …»*

   AI-diagnose av kjøretøy er ikke dette. Men det ligger nærmere enn man skulle tro.

**Datatilsynet sier selv:** *«I de tilfellene der det er usikkert om det er nødvendig å gjennomføre
en vurdering av personvernkonsekvenser eller ikke, anbefaler vi at det gjøres.»*

**Konklusjon: gjør DPIA.** Den er uansett halvferdig — §3 er tiltaksdelen, og
`docs/endwise-sikkerhet-cwe-owasp.md` (referert i techstacken) er risikodelen.

---

## 7. EU AI Act artikkel 50 — dette har en dato, og den er nær

**Hva den krever av oss, konkret:**

Vi er **både leverandør og ibruktaker** av et AI-system som er ment å interagere direkte med
fysiske personer (kunde-support-agenten i widgeten). Da gjelder art. 50(1):

> Systemet skal utformes slik at **den fysiske personen informeres om at de samhandler med et
> AI-system** — med mindre det er åpenbart for en rimelig oppmerksom person.

**Informasjonen må gis senest ved første interaksjon.** For en chatbot: **før eller helt i
begynnelsen av samtalen.** Ikke i en fotnote, ikke i vilkårene.

| | |
|---|---|
| **Gjelder fra** | **2. august 2026** ([Regulation (EU) 2024/1689](https://artificialintelligenceact.eu/article/50/)) |
| **I dag** | 14. juli 2026 → **19 dager** |
| **Bot** | Inntil **15 mill. EUR eller 3 % av global omsetning** |

**Vi lanserer ikke før 2. august**, så plikten inntrer i praksis ved lansering — ikke som en
brannalarm i dag. Men **den må være på plass i UI-et fra dag én**, og den er *trivielt billig* å
implementere. Det er ingen grunn til å utsette den.

**F14-04** dekker dette: merking i chat-widgeten, i forhandler-chatten, og i eskaleringsmeldingen
(«Assistenten hentet en kollega» — kunden skal vite når det byttet fra AI til menneske).

---

## 8. Tekniske tiltak — nye roadmap-punkter (fase **F14**)

| ID | Tiltak | Hvorfor |
|---|---|---|
| **F14-01** | **Pseudonymisering før prompt.** Verktøy og kontekst sender **ID-er**, aldri navn/e-post/telefon/regnr. Oppslagstabell blir hos oss | Fjerner premisset for hele overføringsdiskusjonen (§2). **Viktigste tekniske tiltak i dokumentet** |
| **F14-02** | **Assert på leverandør og endepunkt i provider-laget.** Bygget skal feile hvis `FIREWORKS_*` peker et annet sted enn avtalt, og en kill-switch (Flags SDK) skal kunne slå av AI-laget uten deploy | En feilkonfigurert base-URL er en datalekkasje som ingen ser |
| **F14-03** | **Logg-policy + retensjon.** `stream_events` (har allerede `pruneEvents`), audit-logg, AI-samtaler. Definert retensjonstid per tabell, håndhevet av Vercel Cron | Art. 5(1)(e) lagringsbegrensning. Vi har mekanismen, vi mangler policyen |
| **F14-04** | **AI Act art. 50-transparens i UI.** «Du snakker med en AI» ved samtalestart + tydelig merking når eskalering til menneske skjer | **Lovpålagt fra 2. august 2026** |
| **F14-05** | **Art. 9-vakt (guardrail L1-utvidelse).** Oppdager særlige kategorier i fritekst → maskerer eller eskalerer til menneske før prompten sendes | §4. Det kjente hullet |
| **F14-06** | **Compliance-artefakter generert fra kode.** Subprosessorliste, dataflytdiagram og «hvilke felter går til modellen»-tabell — generert fra `packages/providers` og agent-verktøyene, ikke skrevet for hånd | En manuelt vedlikeholdt dataflyt er utdatert innen tre måneder. Denne er alltid sann |
| **F14-18** | **Vercel Web Analytics — personvernkonfig.** Cookieless/anonymisert (hash nullstilles daglig, ingen krysssporing). Inn i subprosessorlista. Samler KUN inn på Vercel-deploy (ikke localhost) | Lav byrde, men fortsatt Vercel-hostet data → underdatabehandler. Nær F13-deploy |
| **F14-19** | **Stripe — DPA + SCC + PCI-DSS.** Betalings-/personopplysninger → underdatabehandler. Databehandleravtale, SCC (US-selskap m/ EU-entitet), bekreft PCI-DSS-nivå. Inn i subprosessorlista | Betaling er personopplysninger. Egen underdatabehandler med eget overføringsgrunnlag |

---

## 8b. Underdatabehandlere (subprosessorliste)

Gjeldende underdatabehandlere. **[ADVOKAT]** verifiserer overføringsgrunnlag; F14-06 genererer den
maskinlesbare versjonen fra kode. Endwise er databehandler for forhandleren; disse er våre
underdatabehandlere.

| Underdatabehandler | Formål | Data | Lokasjon | Overføringsgrunnlag |
|---|---|---|---|---|
| **Vercel** (hosting, kjøring, Workflows, Cron, Blob) | App-hosting + varige jobber | All app-data i transitt/kjøring | US-selskap, EU-region (cdg1 Paris) | SCC / DPF |
| **Vercel Web Analytics** 🆕 | Anonym besøksstatistikk | Cookieless, aggregert; hash nullstilles daglig, ingen krysssporing. Ingen PII | Vercel (US/EU) | SCC. **Kun på deploy** (virker ikke på localhost) |
| **Neon** | Postgres-database (EU) | All tenant-/kundedata | EU-region | DPA |
| **Resend** | Transaksjons-e-post + nyhetsbrev | E-postadresser + innhold | US | DPA + SCC |
| **Twilio** | SMS-varsler | Telefonnummer + meldingsinnhold | US | DPA + SCC |
| **Fireworks** | AI — tenant-driftsdata | Strukturerte driftstall (ingen sluttkunde-fritekst) | US | SCC + TIA + DPA (F14-12/13). ZDR standard |
| **Mistral** | AI — kunde-fritekst | Sluttkundens fritekst | EU | DPA (F14-09). ZDR søkt (F14-11) |
| **Stripe** 🆕 | Betaling/fakturering (forhandler-abonnement) | Betalings-/personopplysninger (navn, e-post, kortdata håndteres av Stripe) | US-selskap m/ EU-entitet | SCC + **PCI-DSS** (F14-19) |

🆕 = lagt til 16.07.2026 (brukergodkjent). Kortdata lagres aldri hos Endwise — de går direkte til
Stripe (PCI-scope hos dem).

---

## 9. Kilder

- Fireworks — **Zero Data Retention**: [docs.fireworks.ai/guides/security_compliance/data_handling](https://docs.fireworks.ai/guides/security_compliance/data_handling)
  (ZDR som standard; ⚠️ **Response API lagrer i 30 dager med `store=True` som default** — vi bruker ikke Response API)
- Fireworks — **Data Security / sertifiseringer**: [docs.fireworks.ai/guides/security_compliance/data_security](https://docs.fireworks.ai/guides/security_compliance/data_security)
  (ISO 27001, ISO 27701, **ISO 42001**, SOC 2 Type II, HIPAA)
- Fireworks — **Personvernerklæring** (sist endret 11.12.2025): [fireworks.ai/privacy-policy](https://fireworks.ai/privacy-policy)
  §1: *«No AI Training on Your Data»*. §13 Data Transfers: servere i **USA**, overføring skjer på
  **SCC / «Model Clauses»** — **DPF er ikke nevnt**. EU-representant: GDPR Local.
- **DPF-lista**: [dataprivacyframework.gov/list](https://www.dataprivacyframework.gov/list) —
  Fireworks **ikke funnet**. ⚠️ Siden er JavaScript-basert og lot seg ikke lese maskinelt;
  **må sjekkes manuelt** i [deltakersøket](https://www.dataprivacyframework.gov/s/participant-search)
  før beslutning tas.
- Fireworks — **Trust Center** (sertifikat-PDF-er): [trust.fireworks.ai](https://trust.fireworks.ai/)
- Fireworks — **serverless vs. on-demand** (region-pinning kun på on-demand): [docs.fireworks.ai/guides/ondemand-deployments](https://docs.fireworks.ai/guides/ondemand-deployments)
- **Datatilsynet — når må man gjennomføre DPIA** (inkl. lista over behandlinger som alltid krever det): [datatilsynet.no](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/vurdering-av-personvernkonsekvenser/nar-ma-man-gjennomfore-en-vurdering-av-personvernkonsekvenser/)
- **EU AI Act art. 50**: [artificialintelligenceact.eu/article/50](https://artificialintelligenceact.eu/article/50/) — gjelder fra **2. august 2026**
- **Dara/Soria DPA** (modell for opplysning + aksept av overføring): [meetdara.no/dpa](https://meetdara.no/dpa)

---

## 10. Til slutt — én gang til

**Dette dokumentet er ikke juridisk rådgivning.** Det er en teknisk handlingsplan med sitater til
kildene. Rolleavklaringen (§1), DPA-ene (§5), overføringsgrunnlaget (§2) og DPIA-en (§6) **skal
kvalitetssikres av advokat med personvernkompetanse før første forhandler settes i produksjon.**

Det tekniske i §8 kan vi bygge selv, og bør bygge uavhengig av hva advokaten konkluderer — det gjør
alle konklusjoner enklere å leve med.
