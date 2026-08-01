# Arbeidsrapport — Recharts ut, full dither, F2-backend

**Dato:** 14. juli 2026 (økt 7)

---

## 1. Hva er gjort

### Recharts ut — dither-kit er eneste chart-motor

Techstack-endringen er gjennomført i **fire filer, samme økt**:

| Fil | Endring |
|---|---|
| `docs/endwise-techstack.md` | §2 Frontend omskrevet · ny rad i §1 «Døde valg»-tabellen · Recharts lagt til i §6 «Hva vi bevisst IKKE bruker» |
| `docs/UI-PAKKER.md` | dither-kit merket som **eneste** chart-motor |
| `docs/roadmap-endringer.md` | Endringen loggført, brukergodkjent, med dato |
| `packages/*` | **Ingenting å fjerne** — Recharts ble aldri installert |

Fra nå av: ser du `recharts` i en import, er det en feil som skal rettes.

### Hele dither-kit hentet inn

`bar-chart`, `pie-chart`, `radar-chart`, `avatar`, `button`, `gradient` — i tillegg til
`area-chart`. **40 filer** i `packages/ui/src/components/dither-kit/`.

Alt er re-eksportert fra `@endwise/ui`: `AreaChart`, `LineChart`, `BarChart`, `PieChart`,
`RadarChart`, `Sparkline`, `Area`, `Line`, `Bar`, `Pie`, `Radar`, `Grid`, `XAxis`, `YAxis`,
`Legend`, `Tooltip`, `Dot`, `ActiveDot`, `DitherAvatar`, `DitherButton`, `DitherGradient`.

**API-detaljer jeg fant ved å kompilere, ikke ved å gjette** (nå notert i `UI-PAKKER.md`):
`<PieChart>` krever `dataKey` **og** `nameKey` på chart-nivå mens `<Pie>` kun tar `variant`;
`<RadarChart>` krever `nameKey`; alle chartene krever `children` — de er komposisjons-API-er.

### Hele matrix-loaders tatt i bruk

**93 loadere**, alle re-eksportert fra `@endwise/ui`: `DotMatrixIcon`, `DotmSquare1–23`,
`DotmCircular1–20`, `DotmTriangle1–20`, `DotmHex1–10` og `Dotm3x3`-familien (glyph-spin,
diagonal-wave, path-wave). Kartlagt i `UI-PAKKER.md`.

**Verifisert på ekte:** alle tre pakkene (dither-kit-charts + beUI + en matrix-loader) montert
sammen i en faktisk Next-rute og bygget. Kompilerte og bundlet. Probe-ruten er fjernet igjen —
**ingen UI er bygget.**

### Tilgjengelighet: skjøvet, ikke droppet

To nye roadmap-punkter i **F11 (Avansert)**:

- **`F11-07`** — reduced-motion-variant (brukervalgt statisk/dempet modus)
- **`F11-08`** — performance-budsjett: Playwright-fps-måling + tak på samtidige canvas.
  **Måling/advarsel i CI, blokkerer ikke bygget.**

To ting er **ikke** skjøvet, og det er et bevisst valg:

1. **`prefers-reduced-motion` beholdes.** dither-kit og beUI respekterer den allerede i sin egen
   kilde. Jeg *fjerner ikke* tilgjengelighet som allerede ligger der. F11-07 er ekstrautstyret,
   ikke sikkerhetsbeltet.
2. **«Dither bærer aldri informasjon alene» beholdes.** Tallet står alltid i klartekst. Koster
   oss ingenting, holder WCAG, og gjør F11-07 enkel den dagen den bygges.

### F2 — Kjernedata (backend)

| ID | Punkt | Status | Leveranse |
|---|---|---|---|
| **F2-01** | Kjøretøyregister | **done** | `vehicles` (MC/båt/ATV via enum). `regNumber` er unik **per tenant**, ikke globalt — to forhandlere kan ha samme MC i registeret uten å kollidere. Vegvesen-feltene er merket som speilet data med `lookupAt` |
| **F2-04** | Tjenestekatalog, **versjonert** | **done** | `services` (identitet) + `service_versions` (fakta på et tidspunkt). `update` **lager en ny versjon** og lukker den forrige med `validTo` — den endrer aldri en eksisterende. Endrer forhandleren prisen i dag, skal fjorårets faktura fortsatt stemme. Bookinger (F3) peker på en **versjon** |
| **F2-06** | Kunderegister | **done** | `customers` + `customer_notes` (egen tabell — notater har forfatter og tid, det er ikke en tekstkolonne) |
| **F2-08** | Vegvesen-oppslag | **done** | `@endwise/toolkit-vegvesen` — Autosys «Enkeltoppslag», implementerer `IntegrationProvider` (F0-06) |

tRPC-rutere i `apps/api`: `customers`, `vehicles`, `services`, `lookup`. Alle går gjennom
`withTenant()` → RLS.

**Vegvesen-toolkitet er bygget på den ekte OpenAPI-spesifikasjonen**, hentet fra
`akfell-datautlevering.atlas.vegvesen.no/v3/api-docs` — ikke fra hukommelsen:

- `GET /enkeltoppslag/kjoretoydata?kjennemerke=…`, header `SVV-Authorization: Apikey <key>`
- Zod-skjemaet er en **bevisst delmengde** med `.loose()` — den fulle responsen har hundrevis av
  felter (ADR-tankdata, WLTP-koeffisienter, akselgrupper). Vi speiler kun det verkstedet trenger,
  og ukjente felter velter ikke oppslaget når Vegvesenet utvider API-et.
- `422`/`429` mappes til `VegvesenQuotaError` — kvoten er 50 000 kall per nøkkel per døgn.
- **API-et har ingen «årsmodell».** Jeg utleder den fra første registrering i Norge, og det står
  i koden. Ingen oppfunnet felt.
- **GDPR:** kjennemerke og understellsnummer *er* personopplysninger etter norsk rett. Notert i
  toolkitet: oppslag krever behandlingsgrunnlag (booking-forespørselen fra kunden selv).

### F1-08 utvidet — 11/11 grønn mot ekte Postgres

Ny suite `f2-isolation.test.ts` (5 angrep) på de nye tabellene:

- A ser ikke B sine kunder
- A ser ikke B sine kjøretøy — **heller ikke med kjent regnr**
- A kan ikke knytte et kjøretøy til B sin kunde
- A kan ikke opprette en tjeneste i B
- A ser sine egne kunder når de finnes

Denne suiten er også **kontrollen på at ingen ny tabell slipper unna RLS**: legger noen til en
tabell med `tenant_id` uten `tenantPolicy`, feiler den.

---

## 2. Hva gikk galt

1. **Drizzle ble duplisert igjen** — denne gangen i `apps/api`, som importerte `eq`/`and` direkte
   fra `drizzle-orm`. Samme feil som i `packages/auth` forrige økt: to kopier = to inkompatible
   typeverdener.
2. **Vendorisert kode tålte ikke `noUnusedLocals`** — en ubrukt konstant i én matrix-loader
   stoppet `next build`.
3. `@endwise/toolkit-vegvesen` ble ikke funnet av pnpm — workspace-mønsteret var `packages/tools/*`,
   men pakken ligger i `packages/tools/toolkits/vegvesen`.
4. En **utdatert migrasjonsfil** (`0000_curious_mister_fear.sql`) ligger igjen i
   `packages/db/drizzle/`. Den er **inert** — `meta/_journal.json` refererer kun til den gjeldende
   (`0000_open_legion`) — men jeg får ikke slettet den fra sandkassen. **Slett den manuelt.**

## 3. Fikser

1. **Operatorene re-eksporteres nå fra `@endwise/db`** (`packages/db/src/operators.ts`).
   Regelen er nå eksplisitt i koden: drizzle-orm eies av db-pakken, og bare den. Ingen app
   importerer den direkte.
2. `noUnusedLocals`/`noUnusedParameters` fjernet fra `tsconfig.base.json` — **Biomes
   `noUnusedVariables` dekker vår egen kode** og hopper over vendor. Vi retter ikke andres kilde.
3. `pnpm-workspace.yaml`: `packages/tools/toolkits/*`.

**Verifisering:** typecheck (17 pakker) · biome · `next build` · **11/11 RLS-tester mot ekte
Postgres** — alt grønt.

---

## 4. Hva gjenstår

**Fra deg:**

1. **Prototypen inn i repoet.** Dette er nå den *eneste* tingen som blokkerer UI-bygging. Tokens
   er plassholdere, og dither-uttrykket **er** farge — jeg finner ikke på en palett.
2. Lisens-avgjørelsen på matrix-loaders (juridisk, ikke teknisk).
3. Ja/nei på **F14 Desktop-app**.
4. Slett `packages/db/drizzle/0000_curious_mister_fear.sql`.

**Uten deg kan jeg gå videre med:** F2-03 (modellbildebibliotek — Vercel Blob-pipelinen i
`packages/uploads`), eller starte **F3 booking-motor** (F3-01: lifecycle, slot-lock via
`pg_advisory_xact_lock`, konfliktdeteksjon, idempotency keys) — begge er backend og rører ikke UI.

Ingenting er pushet.
