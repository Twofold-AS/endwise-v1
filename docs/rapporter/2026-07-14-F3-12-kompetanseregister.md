# Arbeidsrapport — F3-04-rettelse + F3-12 Kompetanseregister

**Dato:** 14. juli 2026 (økt 10)

---

## 1. F3-04-teksten rettet

«Twilio + **BullMQ**» → «Twilio + Resend via **Vercel Workflows**». BullMQ står i techstack §1 som
dødt valg og i §6 under «Hva vi bevisst IKKE bruker». Koden har hele tiden fulgt techstacken — det
var roadmap-teksten som hang igjen fra den forkastede Hetzner-arkitekturen. Loggført i
`roadmap-endringer.md`.

## 2. F3-12 — Kompetanseregister (NYTT PUNKT)

### Sjekket mot eksisterende punkter først

| Punkt | Dekker det dette? |
|---|---|
| **F1-05** RBAC | Nei — rollene, ikke kompetansen |
| **F1-07** Endwise-admin | Nei — tenants/mekanikere, ikke ferdighetsnivå |
| **F3-02** Matching | Nei — *leser* ferdigheter, vedlikeholder dem ikke |
| **F3-08** DealerMechanics | **UI-en** («liste m/ skills, sertifisering») — men backend-en den skal vise fantes ikke |

Derfor: nytt **backend**-punkt `F3-12`. F3-08 forblir UI-en over det.

Du hadde rett i diagnosen: F3-02 var **en motor uten ratt.** Den rangerte på ferdigheter som lå
som en `text[]`-kolonne satt ved seeding, som ingen kunne redigere.

### Datamodellen — og hvorfor gradert, ikke binært

Binært («har / har ikke») ville dekket det **harde** kravet: kan denne mekanikeren ta jobben?
Men matcheren gjør to ting, og den andre er **spesialist-vernet**: når flere kan ta jobben, skal
ikke båtmotor-eksperten bruke dagen på EU-kontroll av en moped.

Spesialist-vernet trengte et **mål**. Den gamle versjonen telte *antall* ferdigheter — en grov
proxy som rett og slett er feil: **en mekaniker med fem ferdigheter på nybegynnernivå er en
generalist, ikke en spesialist.** Nivået er det som skiller dem.

Og så var det sertifiseringen, som avgjorde saken: **EU-kontroll krever en sertifisering som
utløper.** En boolean kan ikke utløpe. Et felt som ikke kan utløpe, vil før eller siden la en
usertifisert mekaniker ta en jobb han ikke har lov til å ta — og det er ikke en UX-bug, det er
et tilsynsavvik.

**Resultat:** to tabeller.

| Tabell | Innhold |
|---|---|
| `skills` | Ferdighetskatalogen **per tenant**. `key`, `name`, `requiresCertification` |
| `mechanic_skills` | `level` **1–5** · `certifiedAt` · `certificationExpiresAt` · `yearsExperience` · `notes` |

Nivåskalaen har ord, ikke bare tall (`SKILL_LEVELS`): 1 = under opplæring · 3 = selvstendig ·
5 = spesialist. UI-et (F3-08) skal vise ordene.

**`mechanics.skills`-kolonnen er fjernet.** Én kilde til sannhet.

### Matcheren leser nå fra registeret

Hardt krav utvidet: **utløpt sertifisering diskvalifiserer.** Spesialist-vernet måler nå *samlet
ekspertise* (sum av nivåer), ikke antall ferdigheter.

### To beskyttelseslag som gjør ULIKE jobber

Dette er kjernen i hvorfor rolle-gaten måtte finnes i tillegg til RLS:

- **RLS** svarer på «hvilken tenants rader?» — kan ikke omgås fra appen.
- **Rollen** svarer på «har DU lov til å skrive?» — **RLS vet ingenting om roller.**

En `dealer_staff` *er* medlem av tenanten. RLS slipper ham inn i dataene. Det er **bare**
rollesjekken som hindrer at han gir seg selv `mc-eu` med en sertifiseringsdato han fant på — og
deretter booker seg selv på jobber han ikke har lov til å ta.

Skriving: kun `dealer_admin` (egen tenant) og `endwise_admin`. Lesing: også `dealer_staff`, som må
se hvem som kan hva for å booke manuelt.

Implementert både i modulen (`assertCanWriteCompetence`) og i tRPC (`adminProcedure`). `role` er
lagt til i `AppContext`, og `protectedProcedure` krever den nå.

### Bonus som falt ut av modellen

`expiringCertifications(tenantId, withinDays)` — sertifiseringer som utløper snart. En mekaniker
som mister sertifiseringen midt i en booket uke er noe man vil vite om **før** det skjer. Klar til
å kobles på F3-04-varslingen.

---

## 3. Testene — 38/38 grønne mot ekte Postgres

Ni nye i `competence.test.ts`, hvorav fem er angrep:

| Angrep | Resultat |
|---|---|
| **En mekaniker (dealer_staff) gir seg selv `mc-eu` nivå 5** | Avvist — `CompetenceForbiddenError` |
| En kunde prøver å røre ferdighetskatalogen | Avvist |
| Tenant A leser B sine mekanikeres kompetanse | 0 rader (RLS) |
| Tenant A **skriver** kompetanse på B sin mekaniker — *selv som admin* | Avvist |
| Tenant A ser B sin ferdighetskatalog | Kun egne |
| **Utløpt sertifisering** → matcheren diskvalifiserer | ✅ |

Den siste er den viktigste. En dato som ikke sjekkes er ikke en sertifisering — det er en påstand.

**Total: 38 tester** (6 tenant-isolasjon · 5 F2 cross-tenant · 9 booking · 5 matching · 4 varsling
· 9 kompetanse). Typecheck (19 pakker), biome og `next build` også grønt.

---

## 4. Hva gikk galt

Ingenting av betydning. De eksisterende matching- og booking-testene seedet `mechanics.skills`,
som ikke finnes lenger — de er skrevet om til å seede kompetanseregisteret i stedet. Fanget av
typecheck.

## 5. Roadmap

**F3: 6 ferdige** (F3-01, -02, -03, -04, -11, **-12**). De seks som gjenstår er alle UI.
**Totalt: 25 ferdig · 6 pågår · 88 planlagt.**

## 6. Neste

**Fra deg: tokens.** F3-backend er nå helt tom for arbeid.

**Uten deg:** F2-03 (Blob-pipeline), F4 (widget-fundament) eller **F6-02 (SSE)** — sistnevnte er
fundamentet både meldinger og AI-streaming står på, og `apps/stream` er fortsatt bare et skall.

Ingenting er pushet.
