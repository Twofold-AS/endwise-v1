# Rapport — 20.08.2026 — Statusrydding i F2 (F2-02, F2-05, F2-07)

**Roadmap:** F2-02 → `done` · F2-07 → `done` · F2-05 → `planned` (presisert)
**Godkjenning:** Mikkis (eksplisitt oppgave)
**Kode endret:** ingen. Kun `docs/endwise-roadmap.html` og `docs/roadmap-endringer.md`.

---

## 1. Hva er gjort

Tre F2-punkter sto med identisk, udatert ordlyd — «placeholder i prototype, må designes» —
skrevet før F5 fantes. Gjennomgang av `apps/web` mot roadmapen viser at F2 og F5 beskrev
**samme flate fra hver sin side**, og at F5 ble oppdatert mens F2 ble stående.

| ID | Konklusjon | Bevis i repoet |
|---|---|---|
| **F2-02** Kjøretøy-side | Dekket av F5-03 (08.08) | `/kjoretoy`, `/kjoretoy/[id]` → `vehicles.list` / `vehicles.byId` / `lookup.refreshVehicle` |
| **F2-07** Kunder-side | Dekket av F5-02 (08.08) | `/kunder`, `/kunder/[id]` → `customers.list` / `customers.byId`, notater + historikk |
| **F2-05** Tjenester-side | **Ikke dekket** | ingen rute, ingen nav-oppføring |

Begge de lukkede flatene går mot ekte tRPC-ruter, ikke mock.

## 2. Hva gikk galt

Ingen feil i utførelsen. Men selve funnet ER en feil som lå i repoet:

### ⛔ F2-05 var forvekslet med en helt annen tjeneste

Det finnes en «Tjenester & priser»-flate i nav-en under Settings — og den er ikke denne.
`/tjenester` viser hva forhandleren betaler **Endwise** (billing-katalogen, F5-33-aksen).
`/innstillinger/tjenester` er en ren `redirect()` dit.

Forhandlerens **egen** katalog (EU-kontroll, Liten service … med varighet, skills og pris mot
kunde) har verken flate eller nav-oppføring. Skillet ble presisert i F5-04 den 09.08; F2-05
fanget det aldri opp. De to punktene er ett arbeid.

⚠️ **Backend er ferdig og står ubrukt:** `servicesRouter` har `list`, `create`, `update`,
`deactivate`. Kun `list` kalles fra UI — som nedtrekk i `/bookinger/ny`. De tre skrivende
prosedyrene har null kallsteder.

### ⚠️ To sidefunn, bevisst ikke rettet

1. **Feil F-kode i to kodekommentarer.** `apps/web/app/(app)/tjenester/page.tsx` er merket
   «F5-04 / F5-19», og redirect-en sier «implementasjonen ligger fortsatt på /tjenester (F5-04)».
   Begge er F5-33 etter 09.08. Kommentarene er nettopp det som gjorde forvekslingen lett.
2. **`ui:"full"` og `ui:"done"` finnes ikke i `UI_LBL`.** Vokabularet er
   `built | proto | partial | missing | na`, men 12 punkter bruker `full` og 6 bruker `done`.
   De rendrer badge-teksten `undefined` og mangler CSS (`b-ui-full` / `b-ui-done`). F5-02 og
   F5-03 er blant dem.

Begge er utenfor oppgavens ramme (som var F2-status), og nr. 2 krever en beslutning før den
kan rettes.

## 3. Hvilke fikser ble gjort

- F2-02 → `done`, `ui:"built"`, med eksplisitt forbehold: **modellbilder er ikke med** (eies av
  F2-03, fortsatt `planned`) og garanti-status finnes ikke i datamodellen. Samme avvik som F5-03
  allerede noterer — punktet er ikke lukket som om hele den opprinnelige ordlyden er levert.
- F2-07 → `done`, `ui:"built"`.
- F2-05 → beholdt `planned`, men omskrevet så forvekslingen ikke kan gjentas: hva som finnes,
  hva som mangler, og at den bygges sammen med F5-04.
- `ui:"built"` brukt framfor `full`, så ryddingen ikke utvidet render-bugen i sidefunn 2.
- Oppføring lagt i `roadmap-endringer.md`, som fila selv krever.

**Verifisert:** `const ROADMAP` parser rent — **180 punkter, 180 unike ID-er, 0 duplikater**.
F2 er nå 7 `done` / 2 `planned`. Totalt: 65 done · 31 progress · 79 planned · 5 blocked.
Diff: 3 linjer i roadmapen, 0 linjer kode.

## 4. Neste steg

1. **F2-03 modellbilder** er nå eneste åpne UI-avhengighet i F2 ved siden av F2-05.
2. **F2-05 + F5-04 som ett arbeid**: egen rute (forslag `/innstillinger/tjenestekatalog`),
   katalogredigering, versjonering via `service_versions`, prising. Backend finnes allerede —
   dette er en ren UI-oppgave mot fire eksisterende prosedyrer.
3. **Beslutning utestår:** skal `ui:"full"`/`"done"` normaliseres til `built`, eller skal
   `UI_LBL` + CSS utvides med et nivå over «Bygget»?
