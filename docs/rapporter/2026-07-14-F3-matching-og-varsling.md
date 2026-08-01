# Arbeidsrapport — cal.com forkastet, F3-02 matching, F3-04 varsling

**Dato:** 14. juli 2026 (økt 9)

---

## 1. Hva er gjort

### cal.com — vurdert, forkastet, loggført

`docs/adr/ADR-004-cal-com-vurdert-og-forkastet.md` + linje i `roadmap-endringer.md`.
Fire grunner, i vektrekkefølge:

1. **Domenet er feil.** cal.com booker *møter* — én person, én kalender. Vi booker
   *verkstedkapasitet*: mekaniker med ferdigheter, versjonert tjenestevarighet, matching-regler.
   Slot-låsen vår er per **(tenant, mekaniker)**. Det er en annen modell, ikke en konfigurasjon
   av den samme.
2. **Motoren er allerede bygget og bevist** — 9 tester grønne, inkludert samtidighet.
3. **AGPL-3.0** mot et SaaS-produkt vi selger. Nettverksklausulen er nettopp designet for å treffe
   SaaS.
4. **Nok et system å drifte** — i strid med techstack §0 «én leverandør».

Skulle vi senere trenge *møtebooking* («avtal en prat med selger»), er cal.com fortsatt riktig
verktøy for **det** — men som integrasjon, ikke som fundament.

### F3-02 — Regelbasert mekaniker-matching

`packages/modules/src/matching/rule-matcher.ts`, implementerer `MechanicMatcher`-kontrakten fra
F0-06.

**Harde krav** (diskvalifiserer): aktiv · har **alle** ferdighetene tjenesteversjonen krever ·
har ledig kapasitet i vinduet.

**Prioritering** (rangerer de som er igjen):

- **Lavest belastning vinner.** Vi sprer jobbene, vi stabler dem ikke.
- **Spesialist-vern.** Ved likhet rangeres den med færrest *overflødige* ferdigheter først:
  spesialisten på båtmotor skal ikke bruke dagen på EU-kontroll av en moped hvis generalisten
  kan ta den.

**Matcheren velger ikke.** Den rangerer og returnerer kandidater — valget *og slot-låsen* tilhører
booking-motoren (F3-01). Ellers ville vi hatt to steder i systemet som kunne dobbeltbooke.

### F3-04 — Varslingsmodul

> ⚠️ Roadmap-teksten sier «Twilio + **BullMQ**». BullMQ er et **dødt valg** (techstack §1/§6).
> Køen er **Vercel Workflows** (F0-13, ADR-003). Selve sendingen er den samme; det er transporten
> rundt som er en annen. Jeg har ikke endret roadmap-teksten — men koden følger techstacken.

- `@endwise/toolkit-resend` og `@endwise/toolkit-twilio` — begge implementerer
  `NotificationChannel` fra F0-06.
- `packages/modules/src/notifications/dispatcher.ts` — kanalregister + **idempotens-vakt**.
- `apps/api/src/workflows/notify.ts` — durable jobb med `use workflow`/`use step`,
  `RetryableError`/`FatalError` og DLQ-steg.

**Idempotens-vakten er hele poenget.** Workflows retryer steg som feiler. Går en SMS ut og svaret
forsvinner i en timeout, vil retry-en prøve igjen — og kunden får to påminnelser om samme time
fordi nettverket hikstet.

Derfor: **skriv raden først, send etterpå.** `onConflictDoNothing` på
`(tenant_id, idempotency_key)`. Vinner du ingen rad, er varselet allerede sendt, og vi gjør
ingenting. Feiler sendingen, markeres raden `failed` — nøkkelen forblir brukt, så en retry kan
eskalere i stedet for å spamme mottakeren.

`twilio`-toolkitet sender **transaksjonell SMS**, ikke Verify. Verify (OTP, F1-01) er en annen
tjeneste med en annen livssyklus — de skal ikke blandes.

### Tester — 29/29 grønne mot ekte Postgres

| Suite | Antall |
|---|---|
| Tenant-isolasjon (F1-08) | 6 |
| F2-tabeller cross-tenant | 5 |
| Booking-motor (F3-01) | 9 |
| **Matching (F3-02)** | **5** |
| **Varsling (F3-04)** | **4** |

De to som betyr mest blant de nye:

- **«Generalisten rangeres foran spesialisten på en enkel jobb»** — beviser at spesialist-vernet
  faktisk virker, ikke bare finnes i en kommentar.
- **«Samme nøkkel to ganger → sendes ÉN gang»** — teller faktiske kall til kanalen, ikke bare
  returverdien. Retry-sikkerheten er målt, ikke påstått.

---

## 2. Roadmap

**F3 er nå ferdig så langt den kan komme uten prototypen:**

| ID | Status |
|---|---|
| F3-01 Booking Engine | **done** |
| F3-02 Mekaniker-matching | **done** |
| F3-03 Kalender-API | **done** |
| F3-04 Varslingsmodul | **done** |
| F3-11 Internt booking-inntak | **done** |
| F3-05 … F3-10 (6 punkter) | `planned` — **alle er UI**, alle venter på tokens |

**Totalt: 24 ferdig · 6 pågår · 88 planlagt · 1 blokkert.**

---

## 3. Hva gikk galt

Én ting: jeg skrev `schema.notifications.id.eq(row.id)` — som ikke er Drizzles API. Fanget av
typecheck før det rakk å bli noe.

Ellers gikk alt som planlagt.

## 4. Fikser

`eq(schema.notifications.id, row.id)`, importert fra `@endwise/db` (som fortsatt er eneste eier av
Drizzle).

**Rydd opp (jeg får ikke slettet filer):** i `packages/db/drizzle/` ligger nå tre migrasjonsfiler,
men journalen peker kun på den nyeste (`0000_dark_jack_murdock.sql`). Slett de to gamle:
`0000_open_legion.sql` og `0000_watery_sage.sql`.

---

## 5. Neste

**Fra deg: tokens.** Backend-delen av F3 er tom for arbeid som ikke krever UI. De seks
gjenstående F3-punktene er alle skjermer.

**Uten deg kan jeg gå videre med:**

- **F2-03** modellbildebibliotek (Vercel Blob-pipeline i `packages/uploads`) — backend
- **F4** widget-runtime / Framer Plugin-fundamentet — delvis backend
- **F6-01/02** meldinger + SSE (`apps/stream` er fortsatt et skall) — backend

Si fra hvilken du vil ha. Ellers tar jeg F6-02 (SSE), siden den er fundamentet både meldinger og
AI-streaming står på.

Ingenting er pushet.
