# Arbeidsrapport — dev-server, roadmap-status, F3 booking-motor

**Dato:** 14. juli 2026 (økt 8)

---

## 1. Dev-serveren — og hva du faktisk får se

**Sandkassen min har ikke Docker, og prosesser dør mellom hvert kall.** Jeg kan derfor ikke
holde en server i live for deg. Kjør dette selv i PowerShell:

```powershell
cd C:\Users\mikae\Desktop\Twofold\Endwise\v1

docker compose up -d          # Postgres 16 + pgvector + roller
pnpm db:setup                 # migrasjoner + RLS-policyer + grants
pnpm dev                      # web :3000 · api :3001 · stream :3002
```

Åpne **http://localhost:3000**.

### Hva du kommer til å se — ærlig

**Så godt som ingenting.** Én side, ett kort, tre linjer tekst:

> **Endwise** · `F0 · Fundament`
> **Fundamentet står**
> Next.js 16 · React 19.2 · Tailwind 4 · Turborepo · Biome. Flater bygges i F1 og utover.

Det er alt. Ingen dashbord, ingen kalender, ingen dither-flater, ingen innlogging. Jeg har
verifisert det ved å faktisk starte serveren og lese ut teksten fra siden — det er ikke et anslag.

**Hvorfor det ser tomt ut, og hvorfor det ikke er et problem:** alt som er bygget hittil er
*under* skjermen. Databasen, RLS-en, auth-en, kjernedataene og nå booking-motoren finnes og er
testet — men de har ingen flate ennå, fordi UI-et venter på prototypen. Det du kan «se» i dag er
egentlig `pnpm test`: 20 tester som beviser at motoren under panseret virker.

Vil du se noe bevege seg, er dette det ærligste:

```powershell
pnpm test                     # 20 tester mot ekte database
```

`apps/api` på :3001 svarer på `GET /health`, men de interne API-ene krever innlogging, som krever
en tenant, som krever admin-UI — som er F1-07. Det er derfor UI-et er neste steg.

---

## 2. Roadmap-fila — verifisert

**Fil:** `docs/endwise-roadmap.html` (åpne den i nettleseren)

Alle endringene ligger i `const ROADMAP` i fila, som er den kanoniske kilden. Status nå:

| Fase | Ferdig | Pågår | Planlagt |
|---|---|---|---|
| **F0** Fundament | 6 | 6 | — |
| **F1** Auth, tenant, brukere | 9 | — | 3 (alle UI) |
| **F2** Kjernedata | 4 | — | 4 (3 av dem UI) |
| **F3** Booking-motor | **3** ← ny | — | 8 |
| F13 Deploy & drift (Vercel) | — | — | 4 |
| Resten | — | — | … |

**Totalt: 22 ferdig · 6 pågår · 90 planlagt · 1 blokkert**

Alt er synlig i fila: F13-flyttingen (F0-07/08/09 + nye F13-01), F11-07/08 (reduced-motion +
perf-budsjett), og F2/F3-statusene.

> ⚠️ **Én felle:** roadmap-fila lagrer klikk-endringer i `localStorage`. Har du klikket på
> statusbadges i nettleseren tidligere, ser du *dine* lokale overstyringer — ikke fila.
> Trykk **«Nullstill lokale endringer»** øverst for å se sannheten.

---

## 3. Når kan du begynne på UI? — konkret

### Hva jeg trenger fra prototypen

**Ett av disse holder** (i prioritert rekkefølge):

| Format | Hva jeg henter ut | Godt nok? |
|---|---|---|
| **CSS/SCSS-fil med `:root { --… }`** eller en `tokens.json` | Rett inn i `packages/ui/src/widget-tokens/tokens.css` | ✅ **Best.** Rett kopi |
| **Figma-lenke** med farger som *styles/variables* | Jeg leser ut hex-verdiene | ✅ Fint |
| **HTML/React-prototypen** (kildekoden) | Jeg graver ut fargene og komponentnavnene | ✅ Fint |
| Skjermbilder | Jeg må gjette hex-verdier | ❌ **Nei.** Da finner jeg på farger |

### Minimum jeg må ha (F0-11)

Bare **11 verdier**. Ikke et helt designsystem:

```
--ew-bg          bakgrunn (lys)
--ew-surface     kort/panel-flate
--ew-border      kantlinje
--ew-fg          tekst
--ew-fg-muted    dempet tekst
--ew-accent      aksentfarge  ← den viktigste. Dither-flatene fargelegges av denne
--ew-accent-fg   tekst på aksent
```
\+ de fire mørk-modus-variantene (`bg`, `surface`, `border`, `fg`).

**Aksenten er den kritiske.** dither-kit har en fast palett (`green · blue · purple · pink ·
orange · red · grey`) — jeg må vite hvilken av dem som *er* Endwise, eller om vi skal mappe
paletten mot deres egen aksent.

### Nyttig, men ikke blokkerende

Komponentgalleriet (F0-12): hvis prototypen har navngitte komponenter (`Btn`, `Badge`, `Chip`,
`Card`, `Input`) vil jeg se dem, så jeg vet om shadcn dekker dem eller om de faktisk er noe eget.
Uten dette bygger jeg med shadcn og du korrigerer.

### Tidslinje fra du leverer til første ekte skjerm

| Steg | Tid |
|---|---|
| Tokens inn + F0-11/F0-12 lukket | **~1 økt** |
| Forhandler-oversikt (F3-05): KPI-kort med dither-bakgrunn, kapasitetsflate, dagens bookinger | **~1 økt** |
| Bookinger + kalender (F3-06/F3-07) med dither-tetthet | **~1–2 økter** |

**Første ekte skjerm er altså to økter unna fra du leverer tokens.** Booking-motoren under den er
allerede ferdig og testet — skjermen har noe å vise fram.

---

## 4. F3 — Booking-motoren

| ID | Punkt | Status |
|---|---|---|
| **F3-01** | Booking Engine: lifecycle, slot-lock, konfliktdeteksjon, idempotency | **done** |
| **F3-03** | Kalender-API (tidsvindu, per mekaniker / samlet) | **done** |
| **F3-11** | Internt booking-inntak (admin-API uten UI) | **done** |

Nye tabeller: `bookings`, `mechanics` (nødvendig — en booking må ha noen å låse mot, selv om
regelbasert matching først kommer i F3-02). Begge med RLS.

### Slot-låsen — der det faktisk kan gå galt

```ts
await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${tenantId}), hashtext(${mechanicId}))`);
```

**Transaksjons-skopet, ikke session-skopet.** Det er ikke en detalj: med Neons pooler gjenbrukes
forbindelser på tvers av forespørsler, og en session-lås ville overlevd transaksjonen og fulgt med
neste låner av forbindelsen. Transaksjonslåsen slippes av COMMIT/ROLLBACK uansett hva som skjer.

Rekkefølgen inne i transaksjonen **er** hele beskyttelsen:

1. **lås** mekanikeren
2. sjekk **idempotensnøkkel** — allerede booket? returner den samme
3. sjekk **overlapp**
4. skriv

Uten steg 1 er steg 3 verdiløs: to samtidige forespørsler ville begge sett «ledig» og begge
skrevet. Det er nettopp dobbeltbookingen som ødelegger en verkstedsdag.

Låsen er per **(tenant, mekaniker)** — to forhandlere kan booke samtidig uten å vente på hverandre.

### Livsløpet som en maskin, ikke som if-er

```
draft ──► confirmed ──► in_progress ──► completed
  │           │              │
  └───────────┴──────────────┴────────► cancelled / no_show
```

`completed` og `cancelled` er endestasjoner. **En fullført jobb kan ikke «avbestilles» i etterkant**
— da er det en kreditnota, ikke en statusendring.

### Testene — 9/9 mot ekte Postgres

- **SAMTIDIGHET:** to parallelle bookinger på samme slot → **nøyaktig én vinner**, den andre får
  `SlotConflictError`. Dette er testen som beviser at advisory-låsen virker.
- **IDEMPOTENS:** samme nøkkel to ganger → **samme booking**, ikke to. (Dobbeltklikk i widgeten.)
- Tilstøtende slot (09–10 og 10–11) er **ikke** konflikt — halvåpne intervaller.
- En annen mekaniker i samme tid er lov.
- En kansellert booking **frigjør** slotet.
- Fullført booking kan ikke kanselleres.

**Total testsuite: 20/20 grønne mot ekte Postgres** (11 RLS/tenant-isolasjon + 9 booking).

---

## 5. Hva gikk galt

1. **Sirkulær workspace-avhengighet.** Booking-testen lå først i `packages/db`, men trengte
   `@endwise/modules`, som avhenger av `@endwise/db`. Flyttet testen til `packages/modules` — der
   motoren faktisk bor.
2. `@endwise/db` eksporterte `schema` som navnerom, så `BookingStatus` var ikke synlig som type.
3. Testen importerte `drizzle-orm` direkte — samme felle som to ganger før.

## 6. Fikser

1. Testen flyttet til `packages/modules/test/`.
2. Domenetypene eksporteres nå **flatt** fra `@endwise/db` i tillegg til `schema`-navnerommet.
3. `sql` importeres fra `@endwise/db`, ikke fra `drizzle-orm`. Regelen holder: **db-pakken eier
   Drizzle, ingen andre.**

**Rydd opp (jeg får ikke slettet filer):** `packages/db/drizzle/0000_open_legion.sql` er en
utdatert migrasjon. Journalen (`meta/_journal.json`) peker kun på `0000_watery_sage.sql`, så den
er inert — men slett den.

---

## 7. Neste

**Fra deg:** prototypen (se §3). Det er det eneste som står mellom deg og en skjerm.

**Uten deg:** F3-02 (regelbasert mekaniker-matching — `MechanicMatcher`-kontrakten fra F0-06 er
klar og venter) eller F3-04 (varslingsmodul: Twilio/Resend via `NotificationChannel`). Begge er
backend.

Ingenting er pushet.
