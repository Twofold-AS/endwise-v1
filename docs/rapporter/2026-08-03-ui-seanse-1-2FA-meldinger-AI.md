# Rapport — 03.08.2026 — Roadmap-opprydding (F1-13) + første UI-seanse (F1-11, F6-01, F6-04, F6-05)

**Roadmap-punkter:** F1-13 (nytt kort, `blocked`), F1-11 (`done` → `progress`, UI bygget),
F6-01 (`done`, UI bygget), F6-04 (`planned` → `progress`, UI bygget), F6-05 (`done` → `progress`,
UI bygget)
**Godkjenning:** brukergodkjent 03.08.2026 (Mikkis)

---

## 1. Hva er gjort

### Del 1 — Roadmap: Scaleway samlet i ett kort (F1-13)

Ny mekanikk i `docs/endwise-roadmap.html`: et roadmap-punkt kan nå bære
`detail: { lead, steps[], src[] }`, som rendres som en klikkbar «N steg gjenstår»-knapp i
punkttittelen. Klikk folder ut hele implementeringsplanen — nummererte steg med begrunnelse, samt
hvilke dokumenter planen er hentet fra. Åpen/lukket-tilstand holdes i `openDetails`, ved siden av
`openPhases`.

**F1-13** er lagt inn i fase F1 med status **`blocked`** og alle åtte gjenstående stegene i kortet:
Scaleway-prosjekt + IAM · SCW-nøkler som Vercel-hemmeligheter · `packages/db/src/kms.ts` med
`@scaleway/sdk` · refaktor av `encryptSecret`/`decryptSecret` · `hmacBlindIndex()` · **påkrevd**
rotasjons-cron for `SCW_SECRET_KEY` · ekte unwrap-teller inn i kostnadskalkulatoren · verifisering
av Scaleways forespørselsprising. **Ingenting av koblingen er bygget** — det var bestillingen.

Loggført i `docs/roadmap-endringer.md` (2026-08-03), med begrunnelsen for `blocked` framfor
`planned`: `blocked` har egen KPI-teller og eget statusfilter, `planned` er den største bunken.

### Del 2 — UI mot ferdig backend

Felles fundament først, fordi tre av de fire punktene trengte det samme:

**SSE-klienten (F6-02) fantes ikke.** `apps/stream` har vært ferdig lenge, men ingen lyttet.
Lagt til: rewrite `/stream/:path*` → `:3002` i `next.config.ts` (same-origin, så `EventSource`
sender sesjonscookien uten CORS og uten token i URL-en — en sesjonstoken i en query-parameter
havner i hver eneste tilgangslogg), og hooken `_lib/use-event-stream.ts`.

Mønsteret i alle kallstedene er **event → invalidate → hent på nytt**, aldri
*event → skriv i UI*. Serveren sender med vilje bare «hva skjedde + subjectId»; innholdet hentes
gjennom tRPC og dermed RLS. Et UI som stoler på pushet innhold, viser til slutt noe RLS aldri
godkjente.

| ID | Flate | Bygget |
|---|---|---|
| **F1-11** | `/signin` | To steg: passord → 6-sifret engangskode. `signIn.email` svarer `twoFactorRedirect` i stedet for en sesjon → `twoFactor.sendOtp()` → `twoFactor.verifyOtp({code})`. «Send ny kode» m/ 60 s cooldown, `autoComplete="one-time-code"`, «Bytt konto». **Ingen «husk enhet»-avkrysning** — `trustDevice` sendes aldri |
| **F6-01** | `/meldinger` + `/meldinger/[id]` | Innboks (kanalfilter, søk, uleste-teller) og tråd (dagskillere, avsenderbobler, `markRead` ved åpning *og* ved nye meldinger, svarfelt m/ ⌘/Ctrl+Enter). Live over SSE |
| **F6-04** | `/integrasjoner/ai` | Rutingtabell (dataklasse → påkrevd region → leverandør → region-OK/brudd) + konsoll m/ live token-streaming, verktøykall-chips og matrix-loader per SSE-fase. `[ART50-UI] AiDisclosure` øverst |
| **F6-05** | Innboks + tråd | Live eskaleringsvarsel øverst i innboksen (`thread.escalated`, m/ grunn + oppsummering) og `[ART50-UI] HumanHandoverNotice` i tråden når en agent har vært inne |

**Nav:** «Meldinger» lagt til under Forhandler (m/ `NewBadge`). «AI-leverandører» omdøpt til
«AI-diagnose» så nav-etiketten og sidetittelen sier det samme.

### Pakkebruk (UI-PAKKER.md §4 — lest først)

- **beUI `StatefulButton`** — innlogging, 2FA-bekreftelse, trådsvar, «Kjør» i konsollen. Alle
  fire endrer tilstand på serveren, som er hele bruksregelen for komponenten.
- **matrix-loaders** — **tatt i bruk for aller første gang.** Én loader per SSE-fase
  (`DotmCircular1` starter · `DotmHex1` tenker · `DotmSquare1` henter data), akkurat som §4 sier.
- **dither-kit `DitherAvatar`** — deltaker-identitet i tråden. Samme author-id → samme avatar,
  alltid.
- **shadcn/`@endwise/ui`-ikoner + `CardShell`/`CardMedia`** — kortstil og ikoner uendret.
- **`[ART50-UI]`-komponentene** fra `@endwise/ui/compliance` — ikke nyskrevet.

**Ingen ny UI-pakke tatt inn. Ingen techstack-endring.**

---

## 2. Hva gikk galt

Fire funn. De tre første motsier premisset for oppgaven, og er derfor det viktigste i rapporten.

### ⚠️ 2.1 Scaleway-arbeidet ligger ikke i hovedarbeidstreet

`docs/rapporter/2026-08-02-scaleway-bytte.md` og `2026-08-01-KMS-og-eksterne-kostnader.md` finnes
**ikke** i `D:\Endwise\endwise-v1`. De ligger som **ucommittede endringer i git-worktreet**
`.claude/worktrees/determined-mestorf-53951c` — sammen med F5-12,
`apps/web/app/(app)/admin/_components/external-costs.tsx`, `admin/_data.ts`,
`packages/ui/src/icons.ts` og techstack-oppdateringene. Samme base-commit (`7cdbed6`) som `main`,
så ingenting har divergert; arbeidet er bare aldri hentet over.

F1-13-kortet er skrevet fra worktree-kildene og lagt i hovedtreets roadmap. **F5-12 er bevisst
ikke lagt inn** — koden den beskriver som `done` finnes ikke her, og et roadmap-punkt som sier
«ferdig» om kode som ikke er der, er verre enn ingen rad.

### ⚠️ 2.2 F1-11 er ikke ferdig i backend — «obligatorisk» håndheves ingen steder

`ROLES_REQUIRING_2FA` i `packages/auth/src/rbac.ts` er **deklarert og aldri brukt**
(`grep` gir én treff: definisjonen). Two-factor-pluginen er riktig satt opp med Resend-sender og
sesjonsrotasjon, men ingenting krever at en `dealer_admin`/`endwise_admin` faktisk *har*
`twoFactorEnabled` — og `apps/api/scripts/seed.ts` setter den eksplisitt til `false`.

Konsekvensen: **en forhandler eller admin uten 2FA slått på logger inn med bare passord, og
skjermen jeg bygde vises aldri.** Punktets egen ordlyd er «ingen bypass». Status flyttet fra
`done` til `progress`.

### ⚠️ 2.3 F6-04s backend er halvferdig, ikke ferdig

Punktet krever fire ting. `AIProvider` (`packages/providers`) og logging (stream-events) finnes.
**`confidence-score` og `token-tak per tenant` finnes ikke i det hele tatt** — `grep` etter
`confidence`, `tokenCap`, `tokenBudget`, `maxTokens` gir ingen treff utenfor eskaleringsgrunnen
`low_confidence`. Roadmap sto allerede som `planned`, så det er premisset i bestillingen som var
feil, ikke roadmap.

Jeg har **ikke** tegnet tall for dem. De står som eksplisitt tomme felt («Mangler backend») med
forklaring på hvorfor de betyr noe. Det henger sammen med 2.4.

### ⚠️ 2.4 F6-05 mangler «terskel» og kan ikke vise historikk

Eskaleringsmotoren er ekte og god (`escalateToHuman`: deltaker inn, systemmelding i **samme tråd**,
SSE-event ut). Men:

- **«Terskel → eskaleringskø»** finnes ikke. Terskelen ville lest confidence-score, som ikke finnes
  (2.3). I dag eskalerer agenten kun på eget initiativ eller ved guardrail.
- **Historiske eskaleringer kan ikke listes.** `thread.escalated` skrives til `stream_events`, men
  ingen tRPC-rute leser den tabellen. Innboks-varselet er derfor **live-only** — det viser det som
  kommer inn mens siden er åpen. Det står i klartekst i UI-et, ikke skjult.

Status flyttet fra `done` til `progress`.

### Mindre funn

- **matrix-loaders manglet stilarket.** `styles.css` var aldri importert noe sted. Alle 93 loaderne
  ville rendret som en stillestående prikkerute — uten feilmelding, og usynlig for både typecheck
  og `next build`. Nøyaktig samme familie som `@source`-fella fra 16.07.
- **context7 MCP er ikke tilgjengelig** i denne konteksten (CLAUDE.md §3). I stedet for å gjette
  Better-Auths 2FA-API leste jeg det fra den installerte pakken
  (`better-auth@1.6.23/dist/plugins/two-factor/`) og verifiserte `sendOtp`/`verifyOtp`-signaturene
  + `twoFactorRedirect`-responsen mot kildekoden før jeg skrev klienten.

---

## 3. Hvilke fikser ble gjort

- **`@endwise/ui/matrix-loaders.css`** eksportert i `packages/ui/package.json` og importert i
  `apps/web/app/globals.css`. Verifisert i bygget CSS: `.dmx-root`, `.dmx-grid`, `.dmx-dot` er med.
- **`agent.list`** (ny `adminProcedure` i `apps/api/src/trpc/routers/agent.ts`) returnerer
  dataklasse, påkrevd region, leverandør, leverandørregion og `isConfigured` per agent. Alternativet
  var å gjenta rutingregelen i en klient-konstant — og en sikkerhetsregel som står to steder, står
  før eller siden ulikt to steder. Ingen nøkler eller endepunkter eksponeres.
- **matrix-loaders fargelegges med `color="var(--ew-accent)"`**, ikke `colorPreset`. Presetene er
  hardkodede farger/gradienter fra oppstrøms og bryter «ingen komponent hardkoder farge».
- **Tilgjengelighet:** uleste-telleren fikk `sr-only`-tekst (et tall alene sier ikke hva det
  teller), og innloggingsfeltene fikk ekte `htmlFor`/`id`-par.
- **Canvas-budsjettet (UI-PAKKER §2, ≤ 8 per skjerm):** `DitherAvatar` tegnes kun for *andres*
  meldinger — ikke for dine egne (initial-boks) og ikke for agenten (eget ikon). Innboksen bruker
  ingen avatarer i det hele tatt.

**Verifisert:** typecheck (web ✓ · api ✓ · ui ✓) · Biome ✓ (ingen nye funn; tre pre-eksisterende
i `min-dag/[id]` og `integrasjoner/quick` er ikke rørt) · `next build` ✓ — **42 ruter**, inkl.
`/meldinger` og `/meldinger/[id]` · dmx-/sr-only-/rounded-pill-klasser bekreftet i bygget CSS ·
roadmap-fila lastet i nettleser: F1-13-kortet folder ut 8 steg, ingen konsollfeil, ingen dupliserte
IDer (142 punkter).

**IKKE verifisert:** ingenting er kjørt mot en levende database eller en levende SSE-strøm — det
krever `pnpm dev` + Docker-Postgres hos deg. Ingen 2FA-innlogging er gjennomført ende-til-ende
(demo-brukerne har `twoFactorEnabled: false`, se 2.2). Ikke pushet, ingen commit.

---

## 4. Neste fase / neste steg

**Blokkerende for at det som er bygget skal virke i praksis:**

1. **Håndhev F1-11.** Bruk `ROLES_REQUIRING_2FA`: en `dealer_admin`/`dealer_staff`/`endwise_admin`
   uten `twoFactorEnabled` skal tvinges gjennom påslag før noe annet. Dette er punktets ordlyd, og
   uten det er 2FA-skjermen dekorasjon.
2. **Aktiver 2FA på seed-brukerne**, eller lag en påslagsflate under `/innstillinger` — ellers kan
   ikke steg 2 testes lokalt.

**For å lukke F6-04 og F6-05:**

3. **Confidence-score** ut av modellkallet og inn i `agent.done`-eventet → terskel → automatisk
   `escalateToHuman`. Da får både konfidenspanelet og «terskel»-halvdelen av F6-05 innhold.
4. **Token-teller + tak per tenant**, med tilhørende UI-panel.
5. **`messages.escalations`-rute** som leser `stream_events` gjennom RLS, så innboksen kan vise
   historiske eskaleringer og ikke bare live.

**For å lukke F6-01 helt:**

6. **Deltakernavn.** `listMessages` gir `author_id`; det finnes ingen rute som slår opp navn.
   UI-et viser derfor «Deltaker a1b2c3» for andre mennesker. En `messages.participants`-rute
   (navn + rolle, RLS-scopet) fjerner den halvveisheten.
7. **Opprette tråd fra UI** — `messages.createThread` finnes, knappen gjør ikke.

**Uavhengig, men bør avklares først:** hva skal skje med
`.claude/worktrees/determined-mestorf-53951c` (2.1)? Endringene er ucommittede på samme base-commit
og kan hentes over med `git -C .claude/worktrees/determined-mestorf-53951c diff > kms.patch` +
`git apply` i hovedtreet — men det er din beslutning, ikke min.

**F1-13 (Scaleway) er PARKERT** og skal ikke plukkes opp før du sier fra.

---

# Tillegg samme dag — eierens design-prinsipper innført

Prinsippene kom etter at flatene var bygget, med beskjed om at de har **forrang** over
`docs/UI-PAKKER.md`. Full logg i `docs/roadmap-endringer.md` (2026-08-03 (b)); kort her.

## Hva som ble gjort

**Token-laget skrevet om** (`packages/widget-tokens/src/tokens.css`): lyst tema er nå standard
(`#ffffff` / sidebar `#fafafa` / valgt `#ededed`), mørkt ligger komplett ved siden av
(`#171717` / `#1a1a1a` / `#292929`). Nye mål-tokens for knapp (32px/10px), rader (40/44px),
badge (20px/6px, `#CAFACE`/`#15B042`) og switch (24×14/10px, `#0077E6`).

**Typografi:** Google Sans Flex → **Inter**. Seks typetrinn → **tre**: `text-title` (16/20/500),
`text-label` (13/16/500), `text-body` (14/20/400), definert som `@theme`-verdier så størrelse,
linjehøyde og vekt følger utilityen og ikke kan skilles fra hverandre.

**Spec-en er lagt i komponentene, ikke på kallstedene.** `button.tsx` (shadcn),
`motion/button/base.tsx` (beUI) og `badge.tsx` (shadcn) avviker nå bevisst fra oppstrøms. En spec
som må huskes ved hvert kallsted, brytes ved den femte bruken.

**Ny komponent:** `Switch` (shadcn-oppskrift på `radix-ui`s primitiv, som allerede var
avhengighet). Ingen av de fire flatene trenger den — den finnes fordi spec-en definerer den.

**Opprydding som var en forutsetning:** `bg-[#0e0e0e]` (23 steder) → `bg-inset`, og `BEVEL` leser
nå `--ew-bevel-*`. Uten dette ville lyst tema vært umulig.

## Fire tolkninger — flagget, ikke gjettet i det stille

1. **«Titler 16/20px Medium»** lest som *størrelse/linjehøyde*, ikke to titteltrinn.
2. **Bare to tekstfarger er gitt.** `--ew-fg-faint` er **aliasert** til `#777777` framfor at jeg
   fant på et tredje nivå.
3. **Ingen meta-størrelse under 13px.** Tidspunkt/hjelpetekst bruker `text-[12px]`.
4. **Hårlinjer, hover, kortflate og hele den mørke tekstrampen** er utledet (merket i `tokens.css`).

## Aksenten måtte deles i to

`#1ED27D` mot hvitt gir ~1.8:1 kontrast og kan derfor **ikke** være tekst i lyst tema. Aksenten er
delt: `--ew-accent` (fyll, logogrønn) og `--ew-accent-strong` = **`#15B042`** — eierens egen
badge-tekstfarge, ikke en jeg fant på. I mørkt tema er de identiske.

## Verifisert i nettleser mot bygget app

`next start` → `/signin`, computed styles lest live: `data-theme="light"` · bakgrunn
`rgb(255,255,255)` · tekst `rgb(51,51,51)` · Inter aktiv (13 selvhostede woff2) · brødtekst 14/20 ·
H1 16/20/500 · label 13/16/500 i `rgb(119,119,119)` · input og knapp 32px/10px · badge 20px/6px
`rgb(202,250,206)`/`rgb(21,176,66)` · sidebar `rgb(250,250,250)` · valgt `rgb(237,237,237)` ·
rader 40/44px · switch 24×14 `rgb(0,119,230)` m/ 10px thumb. Begge temaer i bygget CSS.
typecheck (web/ui/api/widget-tokens) ✓ · Biome ✓ (kun 5 pre-eksisterende funn) · `next build` ✓.

**IKKE verifisert:** de innloggede flatene er ikke rendret mot ekte data — krever `pnpm dev` +
Docker-Postgres.

## Ikonliste

`docs/notater/ikoner-F1-11-F6-01-F6-04-F6-05.md` — 24 ikoner i tre grupper (kjerne / shell /
sidebar-nav), med format-krav og hva som IKKE trenger SVG.
