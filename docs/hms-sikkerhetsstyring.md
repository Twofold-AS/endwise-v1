# Sikkerhetsstyringssystem / HMS — veikart (v0)

**Fase:** F15 · **Epic:** F15-01 (veikart + flagg + IA) · **Status v0:** dokumentert, ikke bygget  
**Godkjent av:** Mikael (produktlås: fremtidig verkstedmodul bak flagg)  
**Dato:** 10. september 2026  
**⛔ Dette dokumentet er ikke juridisk rådgivning.** Forskriftslisten er ramme, ikke etterlevelsesbevis.

Dette er **v0**: veikart, flaggnavn og IA-skisse. Ingen HMS-UI, ingen HMS-tabeller, ingen nøkkel i `FLAG_KEYS` / `ADDON_MODULES` i denne runden. Implementasjon er F15-02…F15-05.

---

## 1. Hvorfor — verksted, ikke plattformkjerne

Endwise er et **verkstedprodukt**. HMS hører hjemme der folk står i hallen, bruker arbeidsutstyr, kjemikalier og tid, og der AMU og verneombud allerede er en del av driften.

Modulen skal integreres **dypere i verkstedet** (jobber, avvik, kompetanse, utstyr) — men den skal **ikke fylle kjernen** før den er slått på. Et verksted uten booking, innboks, kunder og lager er ikke et verksted (F0-16). Et verksted uten HMS-modulen er fortsatt et verksted.

Derfor:

- **Ikke basis.** Ingen `moduleProcedure` i kjernen, ingen rad i `BASIS_MODULES`.
- **Opt-in.** To brytere som allerede finnes (F0-04 / F0-16), begge må si ja.
- **Lean flate.** Inntil flagget er på: null nav-rad, null rute, null tabell.

---

## 2. Flagg og entitlement (forslag, ikke wired)

Samme mønster som intern testbutikk (`shop`, F10-03): **release-flagg** og **tillegg** er to ulike spørsmål. Blandes de, får du lekkasje eller feilfakturering.

| Bryter | Nøkkel | Betydning | Default |
|---|---|---|---|
| Feature-flag (`feature_flags`) | **`hms`** | Har *vi* rullet ut modulen? | Global **AV**. Tenant-overstyring for intern testdealer via `/endwise/flagg`. |
| Entitlement (`tenant_modules`) | **`hms`** | Har *forhandleren* fått/kjøpt tillegget? | Ingen rad = nei. ADDON, ikke BASIS. |

**Hvorfor `hms` og ikke `sikkerhetsstyring`:** eksisterende nøkler er korte (`shop`, `dev-mode`, `kill-switch`). `FLAG_KEY_PATTERN` tillater kebab-case; `hms` matcher produktnavnet folk sier. Produktittelen forblir **Sikkerhetsstyringssystem / HMS**.

Når implementasjonen starter (ikke i denne PR):

1. Legg `hms` i `FLAG_KEYS` / `FLAG_DEFAULTS` (`false`) — `apps/web/flags.ts`.
2. Legg `hms` i `ADDON_MODULES` + `ADDON_LABELS` («HMS / sikkerhetsstyring») — `packages/modules/src/entitlements.ts`.
3. `moduleProcedure('hms')` på alle HMS-ruter. Fail-safe: feilet oppslag = nei.
4. Nav-rad og ruter skjules når flagg **eller** entitlement er nei. UI-gating alene er kosmetikk.

**Ikke Unleash.** Flagg bor i Postgres (F0-04). Techstack §6.

---

## 3. Grense mot maritim ISM

**ISM** i denne modulen betyr *intern sikkerhetsstyring* i verkstedet — systematisk HMS-arbeid, analogt til internkontroll, ikke et skipsfartssystem.

| Dette er | Dette er ikke |
|---|---|
| Verkstedets egne rutiner, risiko, møter, utstyr og dokumentasjon | IMO **ISM Code** (International Safety Management) for rederi / skip |
| Sikkerhetsstyring som *kan* gjenbruke sjekklister der båtverkstedet berører fartøy på land | Shipboard Safety Management System, Designated Person Ashore, flaggstatsrevisjon |
| Valgfrie maler merket «båt / land» i senere faser hvis en tenant trenger det | Påstand om at Endwise er et godkjent maritimt SMS |

En Yamaha-/båtforhandler kan ha både MC-hall og båtservice. Det gjør ikke Endwise til et ISM-verktøy for sjø. Hvis en tenant senere ber om ISM Code-spor, er det et **eget** produktvalg — ikke en utvidelse som sniker seg inn i F15.

---

## 4. Omfang (produktspråk)

Modulen dekker / relaterer til:

| Tema | Rolle i Endwise (senere) |
|---|---|
| **Arbeidsmiljøutvalg (AMU)** | Organ, medlemmer, møteplan, saker. Ikke et styreverktøy. |
| **Verneombud** | Ressurs og samarbeidspartner — rolle på ansatt, ikke bare en etikett. |
| **HMS-møter** | Innkalling, agenda, referat, tiltak. Skilt fra kundemøter / innboks. |
| **Ulykkesforebyggende arbeid** | Tiltak ut fra risiko og hendelser — ikke en blogg. |
| **Risikovurdering** | Kart + tiltak + eier + frist. Verkstedsoner, oppgaver, utstyr. |
| **Sikkerhetsstyring (ISM)** | Intern systematikk i verkstedet. Se §3. |
| **Kvalitetssikring og ansvar** | Hvem eier tiltaket, hvem signerer, sporbarhet. Ikke ISO-sertifiseringsbyrå. |
| **Dokumentasjon og sertifisering** | HMS-dokumenter og *sikkerhets*sertifikater. Jobb-kompetanse er F3-12. |
| **Vern av arbeidstakere** | Tiltak og varsling — ikke erstatning for bedriftshelsetjeneste. |
| **Tilrettelegging for opplæring** | Plan, gjennomført, neste frist. Kan *peke på* F3-12, ikke erstatte den. |
| **Informasjon og oppfølging av arbeidstakers helse** | ⚠️ Særlige kategorier (GDPR art. 9). Se §6. |
| **Personlig verneutstyr (PVU)** | Utstyr per sone/oppgave, utlevering, utløp. |
| **Arbeidsutstyr** | Register, ettersyn, avvik på utstyr. Ikke lager (F2-09). |
| **Kjemikalier og biologiske faktorer** | Stoffkartotek-pekere, soner, tiltak — ikke fullt stoffregister a la EcoOnline. |
| **Vern mot mekaniske vibrasjoner** | Eksponering / tiltak på relevante oppgaver. |
| **Vern mot støy** | Det samme. |
| **Ergonomi** | Verkstedtypiske oppgaver (løft, stilling, repetisjon). |
| **Andre fysiske arbeidsmiljøfaktorer** | Temperatur, belysning, trekk — som sjekkliste, ikke IoT-plattform. |
| **Psykososialt arbeidsmiljø** | Kartlegging og tiltak. Ikke personaljournal. |
| **Utmattelsestilstand / fatigue** | Kobling mot kapasitet/timeplan (F3-08) som *signal*, ikke medisinsk diagnose. |
| **Forskrifter for HMS-arbeid** | Referanse/ramme i hjelpetekst. Ikke lovdump, ikke «du er compliant»-stempel. |

---

## 5. Ikke-mål for v1 (og for denne PR)

Denne PR-en implementerer **ingenting** av UI eller skjema.

Når byggingen starter, er dette **ikke** v1:

- Hele Arbeidstilsynets virkelighet, alle forskrifter, alle bransjer.
- Juridisk rådgivning, «godkjent internkontroll»-stempel, revisjonsattest.
- Maritimt ISM Code / skips-SMS (§3).
- Bedriftshelsetjeneste, sykemelding, NAV, yrkesskadeoppgjør.
- Fullt stoffkartotek / kjemikaliedatabase som erstatter eksterne systemer.
- IoT-måling av støy, vibrasjon, luft.
- Å sluke **jobb-avvik** (F7-05) eller **Endringer**-fanen inn i HMS.
- Å sluke **kompetanseregisteret** (F3-12) — det matcher mekaniker til *jobb* (EU-kontroll, ferdighet). HMS-opplæring kan peke dit senere.
- Helsejournal på ansatte (art. 9) uten [JURIDISK] avklaring (F14).
- Nav-rad, pulse-kort eller Timeplan-fane for alle tenants.
- Ny UI-pakke. Når flaten bygges: les `docs/UI-PAKKER.md` først; bruk shadcn / beUI / eksisterende skall.

---

## 6. Helseopplysninger og F14

«Informasjon og oppfølging av arbeidstakers helse» treffer **særlige kategorier** (GDPR art. 9). F14-07 (rolleavklaring) og F14-14 (DPIA) er portvakt for *all* produksjon. HMS-helse skal **ikke** få egne tabeller før:

1. Behandlingsgrunnlag er avklart (forhandler = behandlingsansvarlig for verkstedsdata er arbeidshypotesen — må bekreftes).
2. Hva som faktisk lagres er minimert (f.eks. «tilrettelegging nødvendig: ja/nei + frist», ikke diagnose).
3. Retensjon og sletting er i `RETENTION_POLICY` (F14-03 / F14-16-mønster).

Inntil det: fase 1–3 lagrer **ikke** helsefelter. Fase 4 kan ha en plassholder merket [JURIDISK].

---

## 7. Faser (implementasjon senere)

### Fase 1 — AMU, verneombud, møter (F15-02)

Folk og samarbeid først. Uten organ og møter blir risiko et skjema ingen eier.

- AMU: medlemmer (ansatt + funksjon), periode, leder.
- Verneombud: ressurs på `member_profiles` / jobbfunksjon — samarbeidspartner, ikke bare badge.
- HMS-møter: type (AMU / verneombud / allmøte), agenda, referat, tiltak med eier.
- IA: `Organisasjon › HMS` med faner Oversikt · AMU · Verneombud · Møter. Skjult uten `hms`.

### Fase 2 — Risikovurdering og HMS-avvik (F15-03)

Systematikken. Knyttes til **eksisterende** jobb-avvik uten å sluke dem.

- Risikovurdering per sone / oppgave / utstyr: fare → sannsynlighet/konsekvens → tiltak.
- HMS-avvik / hendelse / nestenulykke: **eget objekt**, ikke `bookings.notes`.
- Bro mot F7-05: et jobb-avvik *kan* eskaleres til HMS-hendelse («dette var en sikkerhetshendelse»). Motsatt kan en HMS-hendelse *peke på* en booking. Endringer-fanen forblir selgerens jobb-kø.
- Ulykkesforebyggende tiltak som barn av risiko eller hendelse.

### Fase 3 — Dokumentasjon, PVU, arbeidsutstyr (F15-04)

Ting folk faktisk bruker i hallen.

- Dokumentbibliotek: rutiner, internkontroll, sertifikater (HMS — ikke F3-12-jobbsert).
- PVU: type, sone/oppgave, utlevering, utløp.
- Arbeidsutstyr: register + ettersyn. Skilt fra lagerdeler (`parts`). En momentnøkkel på HMS-lista er ikke en reservedel på F2-09.
- Kvalitetssikring/ansvar: eier, signatur, dato på dokument og tiltak.

### Fase 4 — Arbeidsmiljøfaktorer og forskriftsramme (F15-05)

Etter at organ, risiko og utstyr finnes. Ellers blir dette en tom sjekkliste.

- Kjemikalier / biologiske faktorer: pekere og sonetiltak, ikke fullt register.
- Vibrasjon, støy, ergonomi, øvrige fysiske faktorer, psykososialt, fatigue.
- Opplæring: plan mot F3-12 der det overlapper (f.eks. «truck-sert» vs «truck-sikkerhet»).
- Forskriftsramme: korte henvisninger i hjelpetekst (internkontrollforskriften, arbeidsmiljøloven, forskrift om utførelse av arbeid, …). Ingen lovtekst-dump. Ingen «compliant»-badge.
- Helseoppfølging: bare etter §6.

---

## 8. IA-skisse (lean, bak flagg)

Inntil `hms` er på **og** tenanten har tillegget:

- Ingen sidebar-rad, ingen telefon-destinasjon, ingen pulse-kort, ingen Timeplan-fane.
- Direkte URL skal gi samme tom/FORBIDDEN som Butikk uten `shop` — ikke en tom HMS-app.

Når begge bryterne er på (senere):

```
Organisasjon
  Team
  Kompetanse          ← F3-12 (jobb), uendret
  Timeplan
  HMS                 ← NY, bare hvis hms
    Oversikt          AMU-neste, åpne tiltak, utløpt PVU
    AMU
    Verneombud
    Møter
    Risiko
    Hendelser         HMS-avvik — ikke /jobber?fane=avvik
    Utstyr & PVU
    Dokumentasjon
```

**Mekaniker (PWA):** ingen ny bunnfane i v1. Valgfritt senere: «Meld hendelse» på jobbdetalj *ved siden av* «Meld avvik» (F7-05), synlig bare med flagg. Standard er jobb-avvik som i dag.

**Hjem / pulse:** ingen HMS-flis. Avvik | Forespørsler på toppkortet forblir F7-05 / Hjelp.

**Innstillinger:** ingen HMS-fane. Konfig (verneombud, AMU-periode) bor i HMS-flaten.

**Chrome:** samme Innstillinger-skall (midtstilt tittel + underline-faner) som Timeplan / Organisasjon. Ingen ny UI-pakke. ⛔ #114/#119.

---

## 9. Kobling til det som allerede finnes

| Eksisterende | Forhold til HMS |
|---|---|
| **F7-05 Avvik / Endringer** | Jobb-avvik = ekstra tid, deler, endring på *bookingen*. Selger-kø. HMS-hendelse = person/utstyr/miljø. Bro i F15-03, ikke sammenslåing. |
| **F3-05 pulse Avvik** | Telleren er jobb-avvik. Skal ikke blande inn HMS-tall. |
| **F3-12 Kompetanse** | Ferdighet + jobbsert. HMS-opplæring og sikkerhetssert kan *referere* `skills` senere. |
| **F3-08 Mekanikerliste** | Verneombud-merke kan vises her senere — ikke i v0. |
| **F1-10 / F1-14 Team** | Verneombud og AMU-medlem er funksjon/ansvar, ikke ny RBAC-rolle. `dealer_admin` styrer HMS; staff leser/melder. |
| **F0-04 / F0-16** | Flagg + `moduleProcedure('hms')`. Begge må si ja. |
| **F5-17 Samarbeid** | Ikke HMS. Kryssforhandler-rutiner er avidentifisert og juridisk sperret. HMS er *denne* tenantens internkontroll. |
| **F2-09 Lager** | Deler ≠ arbeidsutstyr ≠ PVU. Tre registre. |
| **F14** | Portvakt for helsefelter og produksjon. |

---

## 10. Tech (når det bygges — ikke nå)

- Eget skjema-område (`packages/db/src/schema/hms.ts` e.l.), RLS + FORCE, `tenant_id`. Ingen HMS-kolonner på `bookings` utover en valgfri peker fra HMS-hendelse → booking.
- tRPC-ruter bak `moduleProcedure('hms')`.
- Hendelser på `packages/events` (f.eks. `hms.incident.reported`) — katalogen utvides da, ikke før.
- Ingen ny kø, ingen Redis, ingen Unleash, ingen ny UI-pakke. CLAUDE.md §2.

---

## 11. Suksess for v0 (denne PR)

- [x] F15 ligger i `docs/endwise-roadmap.html` med epic + faser.
- [x] Flaggnavn `hms` + entitlement-nøkkel `hms` er foreslått, ikke wired.
- [x] IA-skisse og ikke-mål står her og på F15-01.
- [x] F7-05 / Avvik er krysslenket, ikke slukt.
- [x] Ingen HMS-UI, ingen HMS-migrasjon.
