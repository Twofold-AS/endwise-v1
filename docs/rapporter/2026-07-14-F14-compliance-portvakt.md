# Arbeidsrapport — F14 blir compliance-portvakt

**Dato:** 14. juli 2026 (økt 16) · **Ingen kode skrevet.** Roadmap + dokumenter.

---

## 1. Valget: utvidet F14, laget ikke F15

F14 inneholdt allerede den **tekniske** halvdelen av compliance-arbeidet. En ny F15 med den
**juridiske** halvdelen ville splittet én portvakt over to faser — **og en portvakt du kan gå forbi
ved å hoppe til neste fase, er ingen portvakt.**

Én port, én fase. F14 er retitulert:

> **⛔ COMPLIANCE-PORTVAKT (GDPR + AI Act) — INGEN PRODUKSJON FØR ALT ER GRØNT**

ID-ene er **beholdt** (F14-01…06 er referert i flere rapporter), ti nye lagt til (F14-07…16).
**Rekkefølgen i fasen er prioritert, ikke numerisk** — det som haster står øverst, uansett hva det
heter.

---

## 2. Rekkefølgen — og hvorfor akkurat den

| # | ID | Punkt | Type |
|---|---|---|---|
| **1** | **F14-04** | 🔴 **AI Act art. 50-merking — HARD FRIST 2. AUGUST 2026** | Teknisk |
| **2** | **F14-07** | ⛔ **Rolleavklaring — blokkerer alt annet** | Juridisk |
| 3 | F14-08 | DPA med forhandlerne | Juridisk |
| 4 | F14-09 | DPA med Mistral + skriftlig «trening av» | Juridisk |
| 5 | F14-10 | Mistral-konto: betalt plan · opt-out · **Labs models AV** | Juridisk/drift |
| 6 | F14-11 | ⚠️ Mistral ZDR **søkt og innvilget** — *kan avslås* | Juridisk |
| 7 | F14-12 | DPA + SCC med Fireworks | Juridisk |
| 8 | F14-13 | Transfer Impact Assessment (Fireworks) | Juridisk |
| 9 | F14-14 | DPIA gjennomført | Juridisk |
| 10 | F14-15 | Personvernerklæring + subprosessorliste | Juridisk |
| 11 | F14-05 | Scope-gate **ut av audit-modus** | Teknisk |
| 12 | F14-02 | Rutingregel + EU-endepunkt verifisert i CI | Teknisk |
| 13 | F14-03 | Logg-policy + retensjon | Teknisk |
| 14 | F14-16 | **Sletterutine som når alle ledd** | Teknisk |
| 15 | F14-01 | Pseudonymisering før prompt | Teknisk |
| 16 | F14-06 | Compliance-artefakter generert fra kode | Teknisk |

**Art. 50 står øverst fordi det er det eneste punktet med en dato satt av noen andre enn oss.**
2. august 2026. Bot inntil 15 mill. EUR / 3 % av global omsetning. Alt annet kan gli; ikke den.

**Rolleavklaringen står som nr. 2 fordi den blokkerer alle de andre juridiske punktene.** Hvem som
er behandlingsansvarlig avgjør hvem som signerer hvilken DPA og hvem som eier DPIA-en. Å begynne
på F14-08 før F14-07 er å skrive en avtale før man vet hvem partene er.

---

## 3. To punkter jeg vil at du skal legge merke til

### F14-11 — Mistral ZDR **kan bli avslått**

Dette er ikke en avkryssingsboks. ZDR hos Mistral er en **søknad**: du må oppgi «legitimate
reasons», og de godkjenner *«at our discretion»*.

Derfor er punktet formulert slik at det krever **en dokumentert beslutning uansett utfall**:
aksepterer vi 30 dagers retensjon hos en EU-databehandler, eller bytter vi leverandør? Et punkt som
bare kan «bli grønt» hvis motparten er snill, er ikke et punkt — det er et håp.

### F14-16 — Sletterutinen (ny)

**En sletterutine som stopper ved vår egen database er ikke en sletterutine.**

Art. 17 gjelder hele kjeden: DB (RLS-skopet), `stream_events`, audit-loggen (som er **append-only**
— sletting der krever en egen, kontrollert prosess), Blob-opplastinger, **og leverandørloggene**
(Mistral 30 dager uten ZDR, Fireworks metadata).

Dette punktet fantes ikke før. Det burde ha gjort det.

---

## 4. Merking: [JURIDISK] vs [TEKNISK]

Hvert punkt er merket i selve roadmap-teksten:

- **[JURIDISK]** — krever advokat eller motpart. **Kan ikke lukkes med kode.** Ti punkter.
- **[TEKNISK]** — vi bygger det selv. Seks punkter.

Skillet er der fordi det er lett å tro at man er ferdig når koden kompilerer. Ti av seksten punkter
i denne fasen lukkes ikke av en commit.

---

## 5. Kryssreferansen

`docs/personvern/GDPR-og-AI-veikart.md` har fått en tabell øverst som peker på hvert F14-punkt, og
F14-punktene peker tilbake på veikartet.

**Veikartet er *hvorfor*. F14 er *hva som må krysses av*.** To dokumenter som sier ulike ting om det
samme er verre enn ett dokument som tar feil — derfor står det eksplisitt i begge at de skal
oppdateres sammen.

---

## 6. Status

**Roadmap:** 30 ferdig · 8 pågår · 97 planlagt · 1 blokkert.
F14 har nå **16 punkter**, hvorav 2 er `progress` (rutingregelen og scope-gaten er delvis bygget).

**Ingen kode rørt denne økten.** Ingen tester å kjøre. Ingenting pushet.

---

## 7. Det du kan gjøre nå, uten meg

Tre av punktene kan startes i dag og trenger ingen kode:

1. **F14-07** — ring advokaten. Alt annet juridisk venter på svaret.
2. **F14-10** — logg inn på Mistral, verifiser plan, slå av opt-out **og Labs models**, ta
   skjermbilde. Ti minutter.
3. **F14-11** — send ZDR-søknaden. Den har behandlingstid, så den bør ut tidlig — særlig siden den
   kan bli avslått.

**F14-04 (art. 50)** kan jeg bygge så snart tokens er inne. Den er trivielt billig, og den har den
eneste harde fristen i hele prosjektet.
