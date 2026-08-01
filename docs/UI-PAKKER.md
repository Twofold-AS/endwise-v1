# UI-pakker — les denne FØR du bygger UI

> ## Regelen
>
> **Endwise bygger UI av eksterne pakker. Ikke av egne primitiver.**
>
> Før du lager en komponent:
> 1. **Sjekk denne fila.** Dekker en av pakkene under behovet? Bruk den.
> 2. Dekker ingen av dem det? Sjekk om pakken har komponenten men vi ikke har hentet den
>    inn ennå (se «Kan hentes» under hver pakke). Hent den.
> 3. **Først når ingen pakke dekker behovet** skriver du egen kode — og noterer i
>    §«Egenskrevet» nederst *hvorfor* ingen pakke holdt.
>
> Fila oppdateres **hver gang** en ny UI-pakke tas inn. Ingen unntak.

> ### ⚠️ Tailwind-gotcha (16.07.2026)
> `apps/web` MÅ ha `@source "../../../packages/ui/src/**/*.{ts,tsx}"` i `globals.css`. Tailwind v4
> skanner ikke workspace-pakker automatisk — uten dette genereres ikke klasser som brukes KUN inne i
> `@endwise/ui` (f.eks. dither-kit sin `h-full`/`fill-current`/`stroke-border`), og komponentene
> kollapser/mister styling. Dette var rotårsaken til at dither var «usynlig». Gjelder ENHVER ny app
> som konsumerer `@endwise/ui`.

**Sist oppdatert:** 15. juli 2026 (admin-shell + oversikt bygget · token-verdier satt: mørkt default + grønn aksent · dither-kit AKTIVT på admin-dashboard)

---

## Kartet

| Lag | Pakke | Jobb |
|---|---|---|
| **Tokens** | `@endwise/widget-tokens` | Farge, radius, spacing, typografi — én sannhet |
| **Struktur** | shadcn/ui | Knapper, tabeller, dialoger, skjema, sidebar |
| **Data** | dither-kit | Charts + sparklines i signatur-estetikken |
| **Bevegelse (tilstand)** | beUI | Knapper/kontroller som endrer tilstand (idle → loading → success) |
| **Bevegelse (venting)** | matrix-loaders | «AI tenker»-animasjoner, én loader per SSE-event |

Alt renner gjennom `packages/ui/src/theme.css`: shadcn-semantikk (`--primary`, `--border` …)
peker inn i `--ew-*`-tokens. **Ingen komponent hardkoder farge.**

---

## 1. shadcn/ui — struktur

| | |
|---|---|
| **Brukes til** | Knapper, data-tabeller, dialoger, skjema, sidebar, kort |
| **Installasjon** | shadcn CLI: `pnpm dlx shadcn@latest add <navn> -c packages/ui` |
| **Ligger i** | `packages/ui/src/components/` |
| **Konfig** | `packages/ui/components.json` |
| **Versjon** | CLI 4.13.0 · style `new-york` · baseColor `neutral` |
| **Lisens** | MIT |
| **Runtime-avhengighet** | `radix-ui` ^1.6.2, `class-variance-authority`, `clsx`, `tailwind-merge` |
| **Hentet inn** | `button`, `badge` (shadcn Badge — erstattet primitiv-Badgen; `NewBadge`-wrapper i app-shellet) |
| **Kan hentes** | Hele katalogen — `table`, `dialog`, `sidebar`, `form`, `select`, `command`, `sheet`, `tabs`, `calendar` … |

---

## 2. dither-kit — datavisualisering

| | |
|---|---|
| **Brukes til** | Alle charts og sparklines. Signatur-estetikken på forhandler- og admin-dashboard |
| **Installasjon** | Egen CLI: `npx @dither-kit/cli add <navn> --dir packages/ui` (source-mode) |
| **Ligger i** | `packages/ui/src/components/dither-kit/` (22 filer) |
| **Konfig / pin** | `packages/ui/dither-kit.json` (lockfile) · CLI `0.1.1` · registry `https://tripwire.sh` |
| **Lisens** | Se oppstrøms (tripwire.sh / `@dither-kit/cli`) |
| **Runtime-avhengighet** | `motion`, `d3-scale`, `d3-shape`, `clsx`, `tailwind-merge` |
| **Hentet inn** | **ALT** (40 filer): `area-chart` (`AreaChart`, `LineChart`, `Area`, `Line`, `Sparkline`) · `bar-chart` (`BarChart`, `Bar`) · `pie-chart` (`PieChart`, `Pie`) · `radar-chart` (`RadarChart`, `Radar`) · delene `Grid`, `XAxis`, `YAxis`, `Legend`, `Tooltip`, `Dot`, `ActiveDot` · standalone `DitherAvatar`, `DitherButton`, `DitherGradient` |
| **Status** | ✅ **ENESTE CHART-MOTOR.** Recharts er ute av techstacken (§1 «Døde valg», brukergodkjent 14.07.2026) |
| **I bruk** | Admin-oversikten (`apps/web/app/(app)/dashboard`): `AreaChart` (stablet, `bloom="aura"`) som bærende element, `Sparkline` som KPI-kortbakgrunn og som rad-trend i forhandlerlista |

**API:** recharts-stil — `data`-array + `config`-objekt som mapper serie → label + farge.

```tsx
<AreaChart data={data} config={config} bloom="aura">
  <XAxis dataKey="month" /><YAxis />
  <Legend isClickable /><Tooltip labelKey="month" />
  <Area dataKey="bookinger" variant="gradient" />
</AreaChart>
```

- `variant`: `gradient | dotted | hatched | solid`
- `color`: green · blue · purple · pink · orange · red · grey
- `bloom`: `off | low | high | aura`

**Dosering (se `docs/notater/UI-forslag.md` v2):** **symmetrisk.** Forhandler og admin får samme
dither-behandling — samme motor, samme tetthet. Dither er ikke pynt på toppen av UI-et; det ER
UI-et der data vises. Unntaket er mekaniker-PWA (F7): der bærer `matrix-loaders` uttrykket i
bevegelse i stedet.

**To harde regler som følger med:**
1. **≤ 8 samtidige canvas per skjerm**, og flater utenfor viewport pauses (`IntersectionObserver`).
   Hver dither-flate er en RAF-løkke.
2. **Dither bærer aldri informasjon alene.** Tetthet forsterker; tallet/ordet står alltid i
   klartekst. Slår du av alle flatene, skal skjermen fortsatt være fullt brukbar.

**API-detaljer som ikke er åpenbare** (funnet ved kompilering — ikke gjett):
- `<PieChart>` krever `dataKey` **og** `nameKey` på chart-nivå; `<Pie>` tar kun `variant`.
- `<RadarChart>` krever `nameKey`; `<Radar>` tar `dataKey`.
- Alle chartene krever `children` — de er komposisjons-API-er, ikke enkeltkomponenter.
- `<Sparkline data={number[]} color=… variant=… bloom=… />` er tynn-wrapperen for det
  dekorative tilfellet (ingen akser/tooltip). `config` bygges internt fra `color`.

---

## 3. beUI — bevegelse og tilstand

| | |
|---|---|
| **Brukes til** | Kontroller som *endrer tilstand*: lagre-knapper, send-knapper, bekreftelser |
| **Installasjon** | **shadcn-registry** (namespaced): `pnpm dlx shadcn add @beui/<navn> --cwd packages/ui` |
| **Registry** | `"@beui": "https://beui.dev/r/{name}.json"` i `packages/ui/components.json` |
| **Ligger i** | `packages/ui/src/components/motion/` + `src/lib/ease.ts` + `src/lib/hooks/` |
| **Lisens** | Se beui.dev |
| **Runtime-avhengighet** | `motion`, `lucide-react`, `clsx`, `tailwind-merge` |
| **Hentet inn** | `button-stateful` → `StatefulButton` (idle → loading → success/error, morphing bredde), `MotionButton` (base, m/ ripple + press-spring) |
| **Kan hentes** | Hele beUI-katalogen via `@beui/<navn>` (f.eks. `animated-toast-stack`) — se beui.dev |

```tsx
<StatefulButton state={state} loadingText="Lagrer…" successText="Lagret">
  Lagre booking
</StatefulButton>
```

beUI ga oss også `lib/ease.ts` — **de kanoniske bevegelses-tokenene** (`SPRING_PRESS`,
`SPRING_SWAP`, `SPRING_PANEL`, `EASE_OUT` …). Bruk dem. Ikke funn opp egne fjærer.

**Merk:** beUI eier nå `src/lib/utils.ts` (`cn()`), som er shadcn-konvensjonen. `src/lib/cn.ts`
er kun en re-eksport for bakoverkompatibilitet.

**Bruksdisiplin:** `StatefulButton` er reservert for *tilstandsendrende* handlinger (lagre/send).
Nav-lenker og rene handlingsknapper (f.eks. «Ny booking»-lenka på oversikten) bruker shadcn
`Button` — ikke StatefulButton — nettopp fordi de ikke endrer tilstand.

---

## 4. matrix-loaders — venting

| | |
|---|---|
| **Brukes til** | «AI tenker»-animasjon, én loader per SSE-event (F6-02, F6-13) |
| **Installasjon** | **Vendorisert** (kopiert inn — ikke en npm-pakke) |
| **Kilde** | https://github.com/zzzzshawn/matrix |
| **Pin** | commit `e30b80a9c5e6fe388ecbbbac15abfd14f24d0dd3` |
| **Ligger i** | `packages/ui/src/vendor/matrix-loaders/` (124 filer) |
| **Lisens** | ⚠️ **Egendefinert proprietær.** Kommersiell bruk tillatt. **Forbudt** å publisere komponentene som frittstående/del av et annet komponentbibliotek. Derfor ligger de under `vendor/`, og `@endwise/ui` er `private: true`. Se `VENDOR.md` i mappa |
| **Hentet inn** | ✅ **HELE SETTET — 93 loadere**, alle re-eksportert fra `@endwise/ui`: `DotMatrixIcon` · `DotmSquare1–23` · `DotmCircular1–20` · `DotmTriangle1–20` · `DotmHex1–10` · `Dotm3x3`-familien (glyph-spin, diagonal-wave, path-wave) |
| **Oppdatering** | Hent på nytt fra oppstrøms og bytt ut mappa. **Ikke rediger filene.** |

---

## 5. Fundament

| Pakke | Rolle |
|---|---|
| `@endwise/widget-tokens` | `--ew-*`-tokens (mørk/lys/aksent). ✅ **Verdier satt 15.07.2026** (F0-11): mørkt tema som default (TheFold-base — svart side, `#151515` surface), grønn `#1ED27D` aksent, lyst tema beholdt som toggle. Nye tokens: `surface-2`, `border-strong`, `fg-faint`, `accent-dim`, `warn/danger/success`, `glass-*`, `radius-xl/pill` |
| Tailwind CSS 4 | `@theme inline` i `packages/ui/src/theme.css` |
| `radix-ui` | Primitivene shadcn bygger på |
| `lucide-react` | Ikoner. **Eneste ikonbibliotek**. Apper importerer via den kuraterte barrel-en `@endwise/ui/icons.ts` (re-eksport) — ikke `lucide-react` direkte |
| `maplibre-gl` | Kart/globe-motor (open-source, ingen API-nøkkel, mørk innebygd). Brukt til «Live besøkende»-globen på Marked. I mapcn-ånd (mapcn = shadcn-wrapper over MapLibre); mapcn.dev var utilgjengelig ved bygging, så vi bruker MapLibre GL direkte. Kilde: github.com/AnmolSaini16/mapcn · maplibre.org. Lisens: MapLibre GL = **BSD-3-Clause**, mapcn = MIT |
| `motion` | Animasjonsmotor (delt av beUI + dither-kit). ⚠️ Må også deklareres i **hver app** som bruker `@endwise/ui` (f.eks. `apps/web`) — Next transpilerer UI-kildekoden i appens resolusjonskontekst, så `motion/react` må være løsbar derfra. Lagt inn i `apps/web` 16.07.2026 |

### 🎨 Merkevare-aksent + palett — SATT (15.07.2026)

**Logofargen er `#1ED27D`** (grønn), hentet fra `apps/web/public/logo/logo.svg` (`fill="#1ED27D"`).
Den er **merkevare-aksenten**: `--ew-accent`.

**Mapping mot dither-kit:** dither-kits `green`-seed er `[40, 210, 110]` = `#28D26E`. Logoen er
`[30, 210, 125]` = `#1ED27D`. **Praktisk talt samme smaragdgrønn** (begge G=210) — forskjellen er
knapt synlig. To valg når dither-flatene skal fargelegges:

1. **Bruk `color="green"`** direkte — nær nok, null ekstra arbeid. **Valgt** (admin-oversikten
   bruker `color="green"`).
2. **Overstyr `green`-seedet** i `palette.ts` til logoens `[30, 210, 125]` for eksakt
   merkevare-match. Gjøres kun hvis pixel-perfekt betyr noe. *(Merk: `palette.ts` er dither-kit sin
   vendorkode — en overstyring skal noteres i §7 med begrunnelse.)*

✅ **Oppdatert 15.07.2026:** hele grunnpaletten er nå satt (ikke bare aksenten). Base er TheFold V2 sitt EKTE app-shell (`(main)/_shell/app-shell.tsx`, `C`-paletten, rettet 16.07):
flater `#1a1a1a`, kort `#141414`, kant/active `#262626` — med grønn `#1ED27D` som aksent i stedet for TheFolds provisoriske blå.
Mørkt er default (`<html data-theme="dark">`), lyst er en toggle. Verdiene bor i
`packages/widget-tokens/src/tokens.css`; shadcn-semantikken mappes i `packages/ui/src/theme.css`.
Typografi er nå satt — se «✍️ Typografi» rett under.

---

### ✍️ Typografi — SATT (15.07.2026, oppdatert med Google Sans Flex)

**Brukeren ba først om «Google Sans», så om «Google Sans Flex».** Begge verifisert mot kilden
(Google Fonts metadata-endepunkt, `fonts.google.com/metadata/fonts/…`):

- **Google Sans** (uten «Flex») = Googles **proprietære merkevarefont**, ikke i OFL-katalogen,
  ikke i `next/font/google`. **Ikke brukt** (lisensrisiko for tredjepart).
- **Google Sans Flex** = «neste generasjon av Googles merkevare-typesnitt», men publisert som
  **`"license": "ofl"` / `"isOpenSource": true`** — altså **SIL Open Font License**, fritt
  embeddbar for kommersiell tredjepartsbruk. **Dette er det vi bruker.** ✅

**Valg: `Google Sans Flex` (SIL OFL)** — variabel font (akser: vekt, bredde, optisk størrelse,
helning, runde terminaler). Lastes via **`next/font/google`** (finnes i Next 16-katalogen) —
selvhostet ved build, ingen FOUT/layout-shift, ingen runtime-kall til Google. Mono: **`JetBrains
Mono`** (OFL, next/font).

| | |
|---|---|
| **Sans** | Google Sans Flex · **variabel** (wght 1–1000, hele aksen) · subsets `latin` + `latin-ext` (æøå ✓) |
| **Mono** | JetBrains Mono · vekter 400/500/600 · tall/tabeller (`tabular-nums`) |
| **Lisens** | **SIL Open Font License (OFL)** — verifisert 15.07.2026 (`license: "ofl"`, `isOpenSource: true`) |
| **Kilde** | Google Fonts. Satt opp i `apps/web/app/layout.tsx` via `next/font/google` (selvhostet, ikke runtime-import) |
| **Variabler** | `--font-google-sans-flex`, `--font-jetbrains-mono` (på `<html>`) → `--ew-font-sans/-mono` → shadcn `--font-sans/-mono` |

**Typeskala** (rolle → Tailwind-utility → px/vekt). Fastsatt her; komponentene følger den:

| Rolle | Utility | Størrelse | Vekt |
|---|---|---|---|
| Display / KPI-tall | `text-2xl` | 24px | 600 |
| Sidetittel (H1) | `text-xl` | 20px | 600 |
| Seksjonstittel (H2) | `text-sm` | 14px | 600 |
| Brødtekst | `text-sm` | 14px | 400 |
| Sekundær / etikett | `text-xs` | 12px | 500 |
| Mikro / meta | `text-[11px]` | 11px | 500 |

> Fonten er variabel, så alle vektene i skalaen dekkes av én fil. Bytte av font senere = kun
> `layout.tsx` + de to `--ew-font-*`-verdiene; resten av skalaen står.

## 6. I techstacken, men ikke hentet inn ennå

Ikke skriv egne erstatninger for disse — hent dem når skjermen som trenger dem bygges.

| Pakke | Til hva | Hentes i |
|---|---|---|
| `slot-text` | Rullende KPI-siffer | F3-05 (DealerOverview). KPI-tallene på admin-oversikten er i klartekst inntil videre |
| `ai-elements` | Conversation, Message, PromptInput, Plan, Task, Voice | F6-13 (agent-fundament) |
| `cuelume` | Mikro-lyder. Valgfri polish, **av som default** | Når som helst |

> ❌ **Recharts er FJERNET fra techstacken** (14.07.2026, brukergodkjent). dither-kit dekker alle
> chart-typene. Ser du `recharts` i en import, er det en feil som skal rettes.

---

## 7. Egenskrevet — og hvorfor

Kun disse. Hver enkelt har en grunn.

| Komponent | Hvorfor ikke en pakke? |
|---|---|
| `Btn`, `Badge`, `Chip`, `Card`, `Input` (`packages/ui/src/primitives/`) | Roadmap **F0-12** navngir dem eksplisitt som «primitiver fra komponentgalleriet». De er tynne skall over token-laget. **Når prototypen er inne bør de revurderes** — dekker shadcn dem, skal de bort |
| Admin-shell + oversikt-komposisjoner (`apps/web/app/(app)/…`: `TopBar` (m/ topbar-nav), `Sidebar`, `SupportCard` + `BevelButton`/`BEVEL` (TheFold-kortstil), `SectionCard`, `KpiCard`, `BookingsArea`, `DealerList`; `_shell/nav.ts`, `_lib/use-org-role.ts` rollegate) | **Ikke** gjenbrukbare primitiver — de er app-nivå *komposisjoner* av eksisterende pakker (shadcn `Button` + `@endwise/ui`-ikoner + dither-kit + tokens). De hører til `apps/web`, ikke `@endwise/ui`, så de står her kun for sporbarhet. Ingen ny pakke tatt inn |
| Kundewidget (`@endwise/widget-ui`: `EndwiseWidget` + `BookingPanel` + `mountEndwiseWidget`, F4-03) | **Frittstående, cross-origin embed** på forhandlerens (Framer-)nettside — den kan IKKE dra inn appens shadcn/Tailwind/dither-kit (ingen delt build, ingen `@source`-skanning på tredjepartssider). Derfor bevisst **avhengighetslett**: inline styles som leser `@endwise/widget-tokens` sine `--ew-*`-CSS-variabler (samme token-sannhet som resten). React er eneste runtime-avhengighet (peer). [ART50-UI]-opplysningen er egen markup her fordi widgeten ikke deler DOM/pakke med `@endwise/ui`. Nye deps: `react`/`react-dom` (widget-ui, peer), `framer-plugin`/`vite` (framer-plugin) |

Legger du til en rad her, skal den ha en setning som forklarer hvorfor ingen pakke holdt.

`@endwise/ui/icons.ts` er en **re-eksport** av en kuratert lucide-mengde — ikke egen kode, kun en
barrel så apper slipper å ta inn `lucide-react` direkte (og ingen kan smugle inn et annet ikonsett).
