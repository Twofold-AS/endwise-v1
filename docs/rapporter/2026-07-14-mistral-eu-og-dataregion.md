# Arbeidsrapport — Mistral (EU) inn, rutingregel i kode, scope-gate

**Dato:** 14. juli 2026 (økt 15)

---

## 1. ⚠️ Først: tre ting i Mistrals vilkår er IKKE som du trodde

### 1. «Vi skrur bare av trening» — nesten, men ikke helt

To Mistral-kilder spriker:

| Kilde | Sier |
|---|---|
| [Docs — Privacy and data controls](https://docs.mistral.ai/admin/monitor-comply/privacy-data-controls) | *«**API**: data sent through the API isn't used for model training»* — kategorisk |
| [Help Center](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training) | *«Customers on a **Scale** plan are opted out by default. Users on the **free plan** may opt out…»* |

Altså: på gratisplan er du **inne** til du skrur det av. Det er ikke det samme som «API brukes ikke».

**Og her er bakdøren:** Mistrals egen doku sier at aktiverer du **«Labs models»**, kan data brukes
til trening *«**regardless of your subscription plan or opt-out settings**»*. Et opt-out som kan
overstyres av en annen toggle, er ikke et opt-out.

**Hva du må gjøre:** betalt plan → verifiser toggelen i Admin Console → **slå av Labs models** →
**få det inn i DPA-en skriftlig.** En toggle i et adminpanel er ikke et avtalevilkår.

### 2. ZDR er en SØKNAD, ikke en bryter

> *«…you must provide **sufficient detail of your legitimate reasons** … We will review your request
> and, **at our discretion**, approve or deny the request.»*
> — [Mistral Help Center](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)

**Mistral kan avslå.** Uten ZDR: 30 dagers retensjon for misbruksovervåking.

**Ironien er verdt å nevne:** **Fireworks har ZDR som standard, uten søknad.** På akkurat dette
punktet er den amerikanske leverandøren strengere enn den europeiske. Vi velger likevel Mistral for
fritekst — fordi *region* trumfer *retensjon* når spørsmålet er tredjelandsoverføring av
helseopplysninger.

### 3. Mistral har et US-endepunkt

> *«By default, your data is hosted in the European Union. You may, however, **explicitly use our US
> API endpoint** and in such a case your data is hosted in the United States.»*

**«Fransk selskap» er ikke det samme som «EU-hosting».** Det er base-URL-en som avgjør.

Derfor: `assertEuEndpoint()`. Provideren **nekter å bli opprettet** mot `api.us.mistral.ai` — ikke
ved første kall, men ved oppstart. En feilstavet miljøvariabel skal ikke kunne flytte norske
kunders helseopplysninger over Atlanteren i stillhet.

*(Samme kilde: data kan «temporarily» gå ut av EU til underdatabehandlere. EU er standarden, ikke en
absolutt garanti. Underdatabehandlerlista må gjennomgås — **[ADVOKAT]**.)*

---

## 2. Rutingregelen er kode, ikke dokumentasjon

Dette var kjernen i oppdraget, og det er løst slik:

```
Agent erklærer:      dataClass: 'customer_freetext' | 'tenant_operational'
Provider erklærer:   region:    'eu' | 'global'

spawnAgent():        passer de ikke sammen → DataRegionViolation. Agenten starter ikke.
```

| Agent | dataClass | Kan kjøre på |
|---|---|---|
| **kunde-support** | `customer_freetext` | **Kun Mistral (EU)** |
| **drift-innsikt** (ny) | `tenant_operational` | Fireworks eller Mistral |

Sjekken finnes **to steder** — i `spawnAgent()` og i `runAgent()` — fordi det finnes to innganger,
og **en sikkerhetsregel som bare gjelder den ene inngangen er ingen sikkerhetsregel.**

`resolveModelProvider(dataClass)` velger leverandør ut fra dataklassen, ikke ut fra konfig. Og
mangler `MISTRAL_API_KEY` i produksjon: **det finnes ingen fallback til Fireworks.** Å løse et
konfigurasjonsproblem med et personvernbrudd er ikke en løsning.

**Jeg la til drifts-agenten** (`drift-innsikt`) nettopp for å ha kontrasten i repoet — og for å
gjøre regelen synlig i praksis, ikke bare i en type.

**Testen som betyr mest:**

> *«ANGREP: kunde-support-agenten kan IKKE spawnes mot Fireworks»*

Den kaster `DataRegionViolation`, og feilmeldingen sier ordrett *«Dette er et personvernbrudd, ikke
en feilkonfigurasjon.»* Den som møter den skal ikke være i tvil om hva den gjorde.

---

## 3. Scope-gaten (F14-05) — Mistral Moderations, og hvorfor

**Valget:** `mistral-moderation-2603` som motor.

**Hvorfor ikke regex:** vi har allerede regex i L1/L4. De fanger fødselsnummer og API-nøkler. De
fanger **ikke** dette:

> *«Jeg har ryggprolaps og klarer ikke løfte sykkelen opp på rampa»*

Det er en helseopplysning etter art. 9. Ingen regex tar den uten å også ta hundre uskyldige
setninger.

**Hvorfor Mistral:** modellen klassifiserer i ni kategorier, hvorav fire er nøyaktig våre —
**health**, **pii**, **law**, **selfharm**.

**Og det avgjørende:** **den kjører i EU.** En scope-gate som selv måtte sende kundens fritekst til
USA for å avgjøre om den kunne sendes til USA, ville vært en sirkel vi ikke kom ut av.

**Bygget med audit-modus som default-mulighet.** Å slå på en uprøvd klassifikator i blokkerende
modus mot ekte kunder er å bytte ett problem mot et annet — en falsk positiv betyr at en kunde som
spør om åpningstider blir eskalert til et menneske. Vi måler først, blokkerer etterpå.

`financial` er bevisst **ikke** i listen: en kunde som spør hva EU-kontroll koster, skal ikke
eskaleres.

---

## 4. Tester — 100/100 grønne

| Suite | Antall |
|---|---|
| RLS / tenant-isolasjon (mot ekte Postgres) | 11 |
| Moduler (booking, matching, varsling, kompetanse, SSE, meldinger) | 44 |
| **Providers (dataregion + EU-endepunkt + ruting)** | **13** |
| Guardrails L1–L5 + **scope-gate** | 15 |
| Agent-runtime (spawn-binding, eskalering, **dataregion**) | 17 |

Typecheck (19 pakker), biome og `next build` også grønt.

---

## 5. Oppdatert

- **Techstack §2 + §5:** to leverandører, arbeidsdeling etter dataklasse, EU-assert nevnt eksplisitt
- **`.env.example`:** `MISTRAL_API_KEY`, `MISTRAL_BASE_URL`, `MISTRAL_MODEL_*` (inkl. `_MODERATION`)
- **`docs/personvern/GDPR-og-AI-veikart.md`:** ny §2b med de tre funnene over. Anbefalingen er
  oppdatert — vi går EU-veien for support-agenten, og **overføringsdiskusjonen bortfaller for den**
- **Roadmap:** F14-02 og F14-05 → `progress`. F14-01 (pseudonymisering) **nedprioritert** — den var
  kritisk *fordi* fritekst gikk til USA. Nå er den «bare» god dataminimering (art. 5(1)(c)), og
  fortsatt verdt å gjøre for Fireworks-agentene
- **Roadmap-endringer.md:** loggført som brukergodkjent techstack-endring

**Fortsatt uendret og fortsatt påkrevd:** rolleavklaring, DPA-er (med forhandlerne **og** med
Mistral), DPIA, og **art. 50-transparens innen 2. august**.

---

## 6. Modell-ID-er: fortsatt ikke gjettet

Jeg har **ikke** skrevet inn noen Mistral-modellnavn. `MISTRAL_MODEL_FAST` må settes til en modell
som støtter **tool calling** — hele agent-løkka avhenger av det. Sett du bare nøkkelen og glemmer
modell-ID-en, får du en feilmelding som sier nøyaktig hvilken env-variabel som mangler.

`MISTRAL_MODEL_MODERATION` settes til moderasjonsmodellen (`mistral-moderation-2603` per deres
docs — verifiser at den fortsatt er gjeldende).

**Ikke verifisert:** ingenting er kjørt mot ekte Mistral. Vi har ingen nøkkel. Alt er testet mot
mock — som er riktig, fordi testene handler om *våre* grenser, ikke om deres modell.

Ingenting er pushet.
