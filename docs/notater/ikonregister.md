# Ikonregister — sidebar-først-shellet (F5-20)

Komplett liste over ikonene den nye sidebaren og dens destinasjoner trenger, per 04.08.2026.
Hører til roadmap-punkt **F5-20** (innkobling) og **F5-13** (strukturen som bestiller dem).

Eieren tegner SVG-ene selv. Denne fila er bestillingen: hva som trengs, hvor det legges,
og hvilket format som kan kobles inn.

---

## 1. Krav til filene — les før du tegner

| Krav | Verdi |
|---|---|
| Mappe | `packages/ui/src/assets/icons/` |
| Filnavn | kebab-case = lucide-slug, f.eks. `shield-check.svg` |
| viewBox | `0 0 24 24` |
| Fyll | `fill="none"` |
| Strek | `stroke="currentColor"` — **ingen hardkodet farge** |
| Strekbredde | `stroke-width="1.75"` |
| Endeform | `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Tillatte elementer | `path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`, `g` |

**Ikke tillatt:** `defs`, `mask`, `clipPath`, gradienter, `style`, `filter`, tekst.
Disse kan ikke representeres i målformatet (`createLucideIcon`-ikonnoder) og vil bli forkastet
av codegen-steget.

**⛔ Ikke `apps/web/public/`.** En SVG lastet via `<img>`/`<Image>` er isolert fra sidens CSS og
kan ikke arve `currentColor`. Ikonene ville blitt døde svarte firkanter som ikke snur med
tema-toggelen.

**Rendres i:** 16px i nav, knapper og statuslinjer. 24px i tomme tilstander.

---

## 2. Innkobling (F5-20 — bygges senere, ikke nå)

```
packages/ui/src/assets/icons/*.svg
        │
        ▼  packages/ui/scripts/build-icons.ts
           (node --experimental-strip-types, samme mønster som packages/db/scripts/grants.ts)
        │
        ▼
packages/ui/src/icons.generated.ts    ← ett createLucideIcon(slug, iconNode)-kall per fil
        │
        ▼
packages/ui/src/icons.ts              ← ÉN import-linje bytter kilde: 'lucide-react' → './icons.generated.ts'
```

**Null kallsted-endringer.** `createLucideIcon` er allerede eksportert fra `lucide-react` og
returnerer nøyaktig typen `LucideIcon`, så de fire filene som typer `icon: LucideIcon`
(`nav.ts`, `sidebar.tsx`, `top-bar.tsx`, `mobile-shell.tsx`) trenger ikke røres.
Reversering = bytte importlinja tilbake.

---

## A. 27 NYE ikoner — må tegnes

### A1. Destinasjoner i sidebaren (10)

| # | Slug | Brukes til |
|---|---|---|
| 1 | `inbox` | **Innboks** (F5-14) — nav-rad, bærer uleste-telleren |
| 2 | `clipboard-list` | **Saker** (F5-15) — nav-rad |
| 3 | `list` | Saker › visningsbytte **liste** (motstykket til kalender) |
| 4 | `handshake` | **Samarbeid** (F5-17) — nav-rad |
| 5 | `book-open` | Samarbeid › rutiner og fremgangsmåter |
| 6 | `receipt` | Samarbeid › tjenester og prisliste |
| 7 | `chart-line` | **Analyse** (F5-18) — nav-rad |
| 8 | `globe` | Analyse › live besøkende (dagens `/marked/live`) |
| 9 | `brain` | **AI-innsikt** (F5-22) — nav-rad |
| 10 | `life-buoy` | **Kundestøtte** (F5-23) — nav-rad |

> **Dashboard**, **Kunder** og **Settings** bruker `layout-dashboard`, `users` og `settings` —
> se del C, allerede bestilt i forrige runde.

### A2. Toppseksjon og kontekstbytte (5)

| # | Slug | Brukes til |
|---|---|---|
| 11 | `building-2` | Kontekst-dropdown: **forhandlervisning** |
| 12 | `hard-hat` | Kontekst-dropdown: **mekanikervisning** |
| 13 | `arrow-left-right` | Kontobytte forhandler/mekaniker i Settings (F5-19) — samme handling, roligere inngang |
| 14 | `chevron-down` | Dropdown-indikator: kontekst, Innboks, Kunder |
| 15 | `bell` | Varsler — teller i toppseksjonen (F5-08) + Settings › Varsler |

### A3. Quick actions (3)

| # | Slug | Brukes til |
|---|---|---|
| 16 | `file-plus` | **Ny sak** → `/bookinger/ny` |
| 17 | `message-square-plus` | **Ny melding** → ny tråd (F6-01) |
| 18 | `user-plus` | **Ny kunde** |

Vises i bevel-utførelse (`BevelButton`/`BEVEL` fra `_shell/cards.tsx`) med snarvei-ikon.

### A4. Shell-mekanikk (5)

| # | Slug | Brukes til |
|---|---|---|
| 19 | `panel-left-close` | Kollaps sidebaren |
| 20 | `panel-left-open` | Utvid sidebaren |
| 21 | `chevron-right` | Breadcrumb-separator i topbaren (destinasjon › undervisning) |
| 22 | `command` | Kommandopaletten (⌘K) — synlig inngang, siden topbar-søket fjernes |
| 23 | `log-out` | Logg ut. **Erstatter dagens feilbruk av tannhjul** — se merknaden i `ikoner-F1-11-F6-01-F6-04-F6-05.md` |

### A5. Settings-underseksjoner (4)

| # | Slug | Brukes til |
|---|---|---|
| 24 | `user-cog` | Settings › **Team & tilgang** (brukere, roller, invitasjoner) |
| 25 | `key-round` | Settings › tilgangsnøkler og API-nøkler (F1-07 Quick-nøkkel, F4-02 widget-nøkler) |
| 26 | `circle-help` | Kundestøtte › helpdesk og hjelpeartikler (F5-23) |
| 27 | `filter` | Filtrering **på sidene** — bærer prinsippet i F5-19 visuelt: konfigurasjon i Settings, filtrering der arbeidet skjer |

---

## B. 7 GJENBRUKT fra forrige runde — tegnes ikke på nytt

Disse ble bestilt i `ikoner-F1-11-F6-01-F6-04-F6-05.md` og brukes uendret i det nye shellet:

| Slug | Brukes til nå |
|---|---|
| `activity` | Sanntidspilla (Sanntid / Kobler til … / Frakoblet) — synlig i alle kontekster |
| `loader-2` | `StatefulButton`-spinner (Logger inn… / Sender… / Kjører…) |
| `check` | Suksesstilstand i `StatefulButton` + «Region OK» i AI-innsikt |
| `x` | Feiltilstand i `StatefulButton` + lukk-knapper |
| `triangle-alert` | Eskaleringsvarsel i Innboks (F6-05) + regionsbrudd i AI-innsikt |
| `shield-check` | 2FA-steget (F1-11) + server-håndhevet ruting (F6-04) |
| `mail` | E-postkode (F1-11) + Resend-integrasjonen |

---

## C. Øvrige ikoner fra forrige runde som fortsatt er i bruk

Disse står i `ikoner-F1-11-F6-01-F6-04-F6-05.md` og er **ikke** en del av
«27 nye + 7 gjenbrukt»-tellingen. De må finnes for at shellet skal være komplett, men de er
allerede bestilt der:

`layout-dashboard` (Dashboard) · `users` (Kunder) · `car` (Kjøretøy) · `settings` (Settings) ·
`credit-card` (Abonnement) · `calendar-days` (Saker › kalendervisning) · `calendar-check` (Quick) ·
`message-square` (Innboks › kundetråder) · `search` (søk på sidene) · `sparkles` (agent-avatar) ·
`blocks` (Integrasjoner) · `tags` (Tjenester) · `wrench` (mekanikerflaten) · `lock` (innlogging) ·
`circle-user` (profilrad) · `sun` / `moon` (tema-toggle) · `plus` (generisk legg-til) ·
`megaphone` (Marked — **avhenger av den åpne Marked-avklaringen i F5-13**)

---

## Trenger IKKE SVG

- **matrix-loaders** (`DotmCircular1`, `DotmHex1`, `DotmSquare1`) — animerte prikkeruter av
  DOM + CSS, ikke ikoner.
- **`DitherAvatar`** — genereres på canvas fra deltaker-ID.
- **Logoen** — `apps/web/public/logo/logo.svg`. Egen oppgave: **F5-21** (hvit → svart,
  invert-regelen snus samtidig).

---

## Åpent punkt

**XML-parsing i `build-icons.ts`.** Scriptet må lese SVG-barna. Enten en devDependency
(krever godkjenning — CLAUDE.md §2) eller en enkel uttrekker som utnytter at filene er våre egne
med kjent form. Avgjøres når SVG-ene finnes, ikke før.

---

# 📦 LEVERANSE 1 — 26 ikoner mottatt 06.08.2026

**Kilde:** `Untitled.zip` (Downloads, lagret 04.08.2026 20:22), 26 SVG-er med norske filnavn.
**Plassert i:** `packages/ui/src/assets/icons/` med kebab-case slugger.
**Koblet inn:** `scripts/build-icons.ts` → `src/icons.generated.ts` → `src/icons.ts`.
**Null kallsteder endret.**

## ⚠️ Alle 26 brøt formatkravene — normalisert av codegen

| Krav | Status | Hva ble gjort |
|---|---|---|
| 24×24 viewBox | ✅ alle | — |
| `fill="none"` på rot | ✅ alle | — |
| `stroke="currentColor"` | ❌ **alle hadde `stroke="black"`** | Byttet til `currentColor` i codegen |
| Kun tillatte elementer | ❌ **24 av 26 hadde `<defs>` + `<clipPath>`** | Wrapper strippet i codegen |
| `stroke-width="1.75"` | ❌ alle har `2` | Strippes — wrapperen setter bredden fra `strokeWidth`-propen |

**Tre ikoner er FYLTE, ikke strekbaserte:** `globe`, `clock`, `timer` bruker `fill="black"` på
path-en i stedet for stroke. Codegen setter `fill: currentColor` + `stroke: none` på dem, så de
virker — men de vil se **visuelt tyngre** ut enn de 23 andre. Verdt å se på.

**Neste eksport:** slå av «Include "id" attribute» og clip-wrapperen i Figma, og sett stroke til
`currentColor`. Da trengs ingen normalisering. Codegen håndterer det uansett — den er bevisst
tolerant nettopp fordi rå Figma-eksporter ser slik ut.

## (a) DEKKET — 26 slugger

**Fra register-delen «27 nye» (6 av 27):**
`inbox` · `clipboard-list` · `chart-line` · `globe` · `circle-question-mark` (fra `Hjelp.svg`) ·
`funnel` (fra `Filter.svg`)

**Fra «7 gjenbrukt» (1 av 7):** `mail`

**Fra «øvrige i bruk» (7):**
`layout-dashboard` · `users` · `calendar-days` · `message-square` · `sparkles` · `wrench` ·
`circle-user`

**Bonus — ikke bestilt, men nyttige (12):**
`circle-alert` · `image` · `info` · `clock` · `zap` · `refresh-cw` · `send` · `panel-left` ·
`alarm-clock-off` · `timer` · `phone` · `clock-arrow-up`

> `timer`, `phone` og `clock-arrow-up` ble tatt i bruk umiddelbart i de to prototypene
> («Be om mer tid» og kanal-indikatoren i innboksen).

## (b) MANGLER FORTSATT — 27 slugger

**Destinasjoner og nav (4):** `list` · `handshake` · `book-open` · `receipt` · `brain` ·
`life-buoy`

**Toppseksjon og kontekst (5):** `building-2` · `hard-hat` · `arrow-left-right` · `chevron-down` ·
`bell`

**Quick actions (3):** `file-plus` · `message-square-plus` · `user-plus`

**Shell-mekanikk (5):** `panel-left-close` · `panel-left-open` · `chevron-right` · `command` ·
`log-out`

**Settings (2):** `user-cog` · `key-round`

**Statusikoner (6):** `activity` · `loader-2` · `check` · `x` · `triangle-alert` · `shield-check`

**Øvrige i bruk (11):** `car` · `settings` · `credit-card` · `calendar-check` · `search` ·
`blocks` · `tags` · `lock` · `sun` · `moon` · `plus` · `megaphone` · `chart-column`

Alle disse kommer fortsatt fra lucide — se den nederste blokka i `src/icons.ts`.

## (c) Filer som ikke matchet et registernavn

Ingen ble forkastet. De 12 «bonus»-ikonene over hadde ikke et navn i registeret, men er åpenbare
og fikk lucide-ekvivalente slugger. `Tidsforandring.svg` → `clock-arrow-up` er den eneste hvor
navnet krevde tolkning.

## ⚠️ Blandet ikonsett inntil videre

26 egne (strektykkelse 2) + 44 lucide (1.75) side om side. Det er synlig i nav-kolonnen, og
forsvinner først når lucide-blokka i `icons.ts` er tom.

---

# 📦 LEVERANSE 2 — 65 filer mottatt 07.08.2026

**Kilde:** `packages/ui/src/assets/icons-v2/` (eiers egen mappe).
**Resultat:** 37 nye slugger kopiert inn i `packages/ui/src/assets/icons/` → **63 egne ikoner**.
**Koblet inn:** `build:icons` → `icons.generated.ts` → `icons.ts`. **Null kallsteder endret.**

## Format — alle 65 er rene

| Krav | Status |
|---|---|
| `viewBox="0 0 24 24"` | ✅ **65/65** |
| Ingen gradient / `mask` / `style` / `filter` / `<text>` | ✅ **65/65** |
| `stroke="currentColor"` | ❌ alle har `stroke="black"` — byttes av codegen |
| Kun tillatte elementer | ❌ 59/65 har `<defs>` + `<clipPath>` + `<g>` — strippes av codegen |

**Ingen filer måtte forkastes.** Codegen er tolerant for rå Figma-eksport, som er nettopp det
den ble skrevet for.

**11 er FYLTE, ikke strekbaserte:** `chevron-down` · `arrow-left-right` · `camera` · `globe` ·
`clock` · `handshake` · `timer` · `tags` · `user-plus` (+ `Avslå`/`Klode` som ikke ble brukt).
Codegen setter `fill: currentColor` + `stroke: none` på dem, så de virker — men de ser **visuelt
tyngre** ut enn de strekbaserte. Samme observasjon som i leveranse 1, nå på flere ikoner.

## Navn avgjort av FORMEN, ikke filnavnet

Der filnavn og form var uenige, vant formen:

| Fil | Slug | Hvorfor |
|---|---|---|
| `save-1.svg` | **`bell`** | Formen er en bjelle med kolv — ikke en diskett |
| `avtaler.svg` | **`folder-open`** | Formen er en åpen mappe |
| `Bekreft.svg` | **`circle-check`** | Hake INNE i en sirkel (`check.svg` er den bare haken) |
| `procentage.svg` | `circle-percent` | Prosenttegn i sirkel |
| `Bilde vedlegg.svg` | `image-plus` | Bilderamme med pluss |
| `Reciett.svg`/`Settigs.svg` | `receipt`/`settings` | Feilstavede filnavn |
| `Message-*.svg` | `message-circle-*` | **SIRKEL-varianter**, ikke square — se ⚠️ under |

## (a) DEKKET — 40 av registerets 54 slugger

`activity` · `arrow-left-right` · `bell` · `blocks` · `brain` · `calendar-days` · `car` ·
`chart-line` · `check` · `chevron-down` · `circle-question-mark` · `circle-user` ·
`clipboard-list` · `credit-card` · `file-plus` · `funnel` · `globe` · `handshake` · `inbox` ·
`key-round` · `layout-dashboard` · `list` · `loader-2` · `lock` · `log-out` · `mail` ·
`message-square` · `moon` · `receipt` · `search` · `settings` · `shield-check` · `sparkles` ·
`sun` · `tags` · `triangle-alert` · `user-plus` · `users` · `wrench` · `x`

**+ 23 bonus utenfor registeret:** `alarm-clock-off` · `camera` · `chart-pie` · `circle-alert` ·
`circle-check` · `circle-percent` · `clock` · `clock-arrow-up` · `folder-open` · `image` ·
`image-plus` · `info` · `message-circle-plus` · `message-circle-warning` · `message-circle-x` ·
`panel-left` · `phone` · `refresh-cw` · `save` · `send` · `timer` · `trash-2` · `zap`

## (b) MANGLER FORTSATT — 14 slugger

| Slug | Brukes til |
|---|---|
| `book-open` | Samarbeid › rutiner |
| `life-buoy` | Helpdesk — nav-rad |
| `building-2` | Kontekst-dropdown: forhandler |
| `hard-hat` | Kontekst-dropdown: mekaniker |
| `message-square-plus` | Quick action «Ny melding» ⚠️ se under |
| `panel-left-close` / `panel-left-open` | Kollaps/utvid sidebaren |
| `chevron-right` | Breadcrumb-separator |
| `command` | ⌘K-inngang |
| `user-cog` | Settings › Team & tilgang |
| `calendar-check` | Quick |
| `plus` | Generisk legg-til |
| `megaphone` | Marked (parkert) |
| `chart-column` | Analyse › søylegraf |

**I tillegg, ikke i det opprinnelige registeret men i bruk i dag:** `map-pin` (Lager ›
Lokasjoner) · `package` (Lager) · `store` (Butikk) · `arrow-up-right` · `gauge` · `newspaper` ·
`trending-up`/`trending-down` · `upload`. Disse kommer fortsatt fra lucide.

## (c) Filer uten treff i registeret

Ingen ble forkastet. 23 fikk lucide-ekvivalente slugger som «bonus» (lista over).
**28 filer ble IKKE kopiert** fordi sluggen fantes fra før — de er nytegninger av ikoner vi
allerede har, og eksisterende filer ble **ikke overskrevet**:

- **21 er byte-identiske** med det vi har: `Alert` `Analyse` `Bilde` `Bruker` `Brukere`
  `Dashboard` `Filter` `Hjelp` `Info` `Kalender` `Klode` `Klokke` `Kundestøtte` `Lyn` `Mail`
  `Melding` `Refresh` `Send` `Snooze` `Stoppeklokke` `Wrench`
- **6 er nytegnet, men sluggen var tatt:** `Inbox`→`inbox` · `Saker`→`clipboard-list` ·
  `Sidebar`→`panel-left` · `Telefon`→`phone` · `Tidsforandring`→`clock-arrow-up` ·
  `AI - Nettside`→`sparkles` (to firkantstjerner = sparkles)
- **1 duplikat:** `Avslå.svg` er en FYLT variant av samme kryss som `x.svg`. Strekvarianten ble
  valgt — den matcher resten av settet.

⚠️ `Hjelp.svg` og `Kundestøtte.svg` er **identiske filer**. Det betyr at `life-buoy` (Helpdesk)
ikke er levert — helpdesk-ikonet er en kopi av hjelp-ikonet.

## (d) Filer som brøt formatet

**Ingen.** Alle 65 kunne kobles inn.

## ⚠️ To ting verdt å vite

**1. `message-square-plus` mangler fortsatt.** `Messages-plus.svg` er **sirkel**-varianten
(`message-circle-plus`). Quick action «Ny melding» bruker `MessageSquarePlus`, som fortsatt
kommer fra lucide. Enten tegn square-varianten, eller bytt kallstedet til circle — men da bør
`message-square` i innboksen byttes samtidig, ellers står to meldingsformer side om side.

**2. Blandet sett, men mindre nå.** 63 egne (strektykkelse 2) + 23 lucide (1.75).
Var 26 + 44. Forskjellen er fortsatt synlig i nav-kolonnen.

---

# 🔧 JUSTERINGER 07.08.2026 (etter leveranse 2)

## Erstatninger — eiers nytegnede versjoner overtok

Seks slugger var «tatt» av leveranse 1, men eier hadde tegnet dem på nytt i `icons-v2`.
De gamle ble **overskrevet med de nye**:

| Fil i icons-v2 | Slug | Erstattet |
|---|---|---|
| `Inbox.svg` | `inbox` | leveranse 1 |
| `Saker.svg` | `clipboard-list` | leveranse 1 |
| `Sidebar.svg` | `panel-left` | leveranse 1 |
| `Telefon.svg` | `phone` | leveranse 1 |
| `Tidsforandring.svg` | `clock-arrow-up` | leveranse 1 |
| `AI - Nettside.svg` | `sparkles` | leveranse 1 |

**Ikke erstattet:** `Avslå.svg` (fylt variant av `x` — strekvarianten beholdt, den matcher
resten av settet) og `Kundestøtte.svg` (byte-identisk med `Hjelp.svg`; å installere den som
`life-buoy` ville gitt to identiske ikoner for Hjelp og Helpdesk).

## ⛔ `brain.svg` FJERNET — den var en dott

`AI-main.svg` inneholder **kun én liten sirkel**: en path med spennvidde **4,8 av 24**, altså
en prikk midt i ruta. Den ble importert som `brain` i leveranse 2, og nav-punktet **AI-verktøy
rendret som en dott**.

Filen er slettet. `Brain` kommer nå igjen fra lucide og rendrer som en ekte hjerne (8 delelementer,
20×20 bbox — verifisert i nettleser). **En ekte hjerne må tegnes** — se lista under.

**Lærdom for neste leveranse:** filnavnet sier hva ikonet skal BRUKES til, ikke hva det
FORESTILLER. Alle nye SVG-er sjekkes nå for bounding box; dekker tegningen under ~14 av 24
enheter, er den mistenkelig. Kun `check` (9,6) og `x` (12) er legitimt små — de er glyffer.

---

# 📋 IKONER SOM FORTSATT KOMMER FRA LUCIDE

**24 eksporteres, 21 er i aktiv bruk.** Sortert etter hvor mange steder de brukes.

## Bør tegnes — i aktiv bruk (21)

| Slug | Brukes til |
|---|---|
| `chevron-right` | Breadcrumb-separator i topbaren |
| `life-buoy` | **Helpdesk** — nav-rad |
| `package` | **Lager** — kontekst-fane og nav |
| `store` | **Butikk** — kontekst-fane + AI-verktøy › Nettbutikk |
| `user-cog` | Settings › Team & tilgang · Profil |
| `map-pin` | Lager › Lokasjoner |
| `plus` | Generisk legg-til |
| `trending-up` / `trending-down` | Delta-piler i Analyse-kortene |
| `building-2` | Kontekst-dropdown: forhandler |
| `chart-column` | Analyse › søylegraf |
| **`brain`** | **AI-verktøy — nav-rad** ⚠️ prioritet, se over |
| `calendar-check` | Quick · Verkstedet-teller |
| `message-square-plus` | Quick action «Ny melding» ⚠️ se merknad i leveranse 2 |
| `book-open` | Samarbeid › rutiner |
| `upload` | Opplasting |
| `gauge` | Måler/status |
| `hard-hat` | Kontekst-dropdown: mekaniker |
| `megaphone` | Marked (parkert) |
| `panel-left-close` / `panel-left-open` | Kollaps/utvid sidebaren |

## Lav prioritet — eksportert, men ikke i bruk (3)

`arrow-up-right` · `command` · `newspaper`

---

## ⭐ Ikonsettet nå

**62 egne** + **24 lucide**. Var 26 + 44 før leveranse 2.
`stateful.tsx` (beUI) importerte `Check`/`Loader2`/`X` direkte fra lucide — den henter dem nå
fra vår barrel, så StatefulButton har samme strektykkelse som resten.
