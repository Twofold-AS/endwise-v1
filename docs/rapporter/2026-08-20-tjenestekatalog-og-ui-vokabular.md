# Rapport — 20.08.2026 — ui-vokabular normalisert · Tjenestekatalogen bygget (F2-05 + F5-04)

**Roadmap:** F2-05 → `done` · F5-04 → `done` · 18 punkter normalisert til `ui:"built"`
**Godkjenning:** Mikkis (eksplisitt oppgave, to punkter)

---

## 1. Hva er gjort

### 1.1 ui-vokabularet normalisert (18 punkter)

`UI_LBL` kjenner fem verdier: `built | proto | partial | missing | na`. 12 punkter brukte `full`
og 6 brukte `done` — de rendret badge-teksten `undefined` og hadde ingen CSS-regel. Etter eiers
beslutning er alle 18 satt til `built`; vokabularet er ikke utvidet. **Ferdige punkter skal si at
de er ferdige.** Alle 180 punkter validerer nå mot `UI_LBL`.

### 1.2 Forhandlerens egen tjenestekatalog (F2-05 + F5-04 som ett arbeid)

Ny rute **`/innstillinger/tjenestekatalog`**: liste med filtrering på kjøretøytype, kort per
tjeneste med varighet, pris, ferdighetskrav og versjonsnummer, «ny tjeneste», «ny versjon»,
deaktiver/slå-på-igjen, og versjonshistorikk per tjeneste.

| Fil | Rolle |
|---|---|
| `page.tsx` | Liste, filtre, rollegating, kryssreferanse til `/tjenester` |
| `_tjeneste-kort.tsx` | Ett kort: lesevisning, ny versjon, historikk, av/på |
| `_ny-tjeneste.tsx` | Opprett (navn + type + versjonsfelter) |
| `_felter.tsx` | **Delt** feltsett for opprett og ny versjon |
| `_felles.ts` | Prisparsing, varighetsvisning, typevalg |

**De tre valgene som betydde noe:**

- **Rute og plassering.** Under Settings, etter F5-19 («all konfigurasjon samlet») og prinsippet
  F5-02 formulerer: konfigurasjon i Settings, filtrering der arbeidet skjer. En prisliste settes
  sjelden og gjelder til noen endrer den. Ruta er den roadmapen selv foreslo.
- **Versjonering.** Knappen heter «Ny versjon» og «Lagre som v4», ikke «Lagre». `update` lukker
  gjeldende versjon med `validTo` og skriver en ny rad; bookinger fra i fjor peker på den gamle.
  Kalte vi den «Lagre», ville flaten løyet: en forhandler som tror han retter en skrivefeil fra i
  går, ville i stedet innført en prisendring fra i dag. Flaten sier det i klartekst før lagring.
- **Prising.** Tomt prisfelt er **ikke** 0 kr. `price_minor` er nullbar med vilje — «etter medgått
  tid» / «på forespørsel». Parseren godtar komma og mellomrom («1 450,50») fordi det er slik en
  norsk forhandler skriver et beløp, men avviser alt annet i stedet for å gjette: `parseFloat`
  ville lest «1450kr» som 1450, og en parser som gjetter, gjetter en dag feil på en prislapp.

**Ferdigheter velges fra registeret, aldri som fritekst.** `service_versions.skills` peker på
`skills.key` (F3-12), og det er koblingen MechanicMatcher bruker. En skrivefeil ville ikke gitt
noen feilmelding — den ville gitt en tjeneste ingen mekaniker matcher, og en booking som stille
aldri blir tildelt.

## 2. Hva gikk galt

### ⛔ 2.1 Prislista sto åpen for alle ansatte

`services.create`, `update` og `deactivate` lå på `protectedProcedure`. Så lenge de ikke hadde ett
eneste kallsted, var det uten praktisk konsekvens. I det katalogflaten ga dem en knapp, betydde det
at **enhver `dealer_staff` med en sesjon kunne endre prisen kunden betaler.**

RLS svarer på «hvilken tenants rader», ikke «har denne personen lov» — nøyaktig argumentet
`adminProcedure` selv fører for kompetanse (F3-12). Å bygge flaten uten å rette dette ville vært å
sende et hull, ikke en funksjon.

### ⚠️ 2.2 Miljøbegrensninger, to stykker

1. **context7 (CLAUDE.md §3) er ikke tilgjengelig** — MCP-serveren er ikke koblet til i denne
   sesjonen, så jeg kunne ikke hente ferske API-dokumenter slik regelen krever. Ingen ny teknologi
   eller pakke er tatt i bruk; mønstrene er lest ut av eksisterende kode. Det er en svakere kilde
   enn §3 ber om.
2. **Nettleserpanelet komposierer ikke** (viewport 0×0, tom side) — samme begrensning som
   05.08-rapporten beskrev. **Jeg har ikke sett flaten tegnet.** Sidene svarer 200 og SSR-HTML-en
   inneholder overskrift, ingress og kryssreferanse, men visuell bekreftelse gjenstår.

### 2.3 To småting fanget av verktøyene

- Zod v4 avviste `.default({})` på et objekt med påkrevd utledet type. Løst med `.optional()`,
  som samtidig lar `/bookinger/ny` beholde sitt argumentløse `useQuery()` uendret.
- Biome avviste `role="radio"` på en knapp — med rette. Se 3.2.

## 3. Hvilke fikser ble gjort

### 3.1 Tre prosedyrer lagt til utover de fire

Oppgaven sa «mot de fire prosedyrene som allerede finnes». Tre måtte likevel til:

1. **`reactivate`** — uten den er `deactivate` en enveisdør fra UI-et: tjenesten faller ut av
   `list`, og eneste vei tilbake er et manuelt UPDATE i basen. Å sende en uopprettelig knapp er
   verre enn å legge til seks linjer.
2. **`versions`** (lesing) — uten den er «versjonering» bare et tall. Et versjonsnummer man ikke
   kan slå opp, beviser ingenting for den som lurer på hvorfor fjorårets faktura sier noe annet.
3. **`list({ inkluderInaktive })`** — katalogen er eneste sted en deaktivert tjeneste skal være
   synlig. Standard er usann, så booking-motoren og `/bookinger/ny` er uendret.

### 3.2 Ekte radioknapper, første gang i appen

Kjøretøytype-velgeren er `<input type="radio">`, ikke pille-knapper med `role="radio"` som ellers.
Pillene andre steder er **filtre** — der er `tablist` riktig. Denne er et **skjemafelt**, og da skal
tastaturet oppføre seg som i et skjema. Utseendet er identisk. Notert i UI-PAKKER §8.

### 3.3 Kodekommentaren som skapte forvekslingen

`innstillinger/tjenester/page.tsx` sa «implementasjonen ligger fortsatt på /tjenester (F5-04)».
Feil, og ikke ufarlig — den er en av grunnene til at punktet sto som «må designes» i fire måneder
mens backend var ferdig. Rettet, og kryssreferanse lagt inn **begge veier**.

### 3.4 Verifisert

**13 nye tester** i `apps/api/test/tjenestekatalog.test.ts`, mot ekte database: dealer_staff avvist
på create/update/deactivate/reactivate · staff KAN lese katalog og historikk · ny versjon lukker
den forrige uten å røre prisen i v1 · deaktivert faller ut av standardlista, men er synlig med
`inkluderInaktive` · reactivate beholder versjonen · nabo-tenant ser verken tjenesten eller
versjonene.

| Suite | Før | Etter |
|---|---|---|
| api | 7 filer / 63 tester | **8 / 76** |
| modules | 120 | 120 |
| db | 49 | 49 |
| auth | 19 | 19 |
| agents | 17 | 17 |

typecheck 22/22 ✓ · biome rent ✓ · `next build` ✓ 52 ruter med `/innstillinger/tjenestekatalog` ·
roadmap 180 punkter, 180 unike, 0 ukjente ui-verdier. Ikke pushet.

## 4. Neste steg

1. **Visuell gjennomgang** av `/innstillinger/tjenestekatalog` — kjør `pnpm dev`. Det eneste som
   gjenstår for å kalle punktet fullt verifisert.
2. **F2-03 modellbilder** er nå eneste åpne punkt i F2 (R2-lagring, admin-godkjenning,
   srcset-pipeline, fallback-silhuetter).
3. **Vurder samme rollegjennomgang på andre ubrukte skriveruter.** Denne feilen oppsto fordi en
   prosedyre uten kallsted ikke gjør vondt før den får ett. Det er neppe den eneste.
