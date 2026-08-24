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
> `@endwise/ui` (f.eks. `h-full`, `fill-current`, `stroke-border`), og komponentene kollapser/mister
> styling. Gjelder ENHVER ny app som konsumerer `@endwise/ui` — også etter at dither-kit ble fjernet,
> siden shadcn/beUI-komponentene har samme problem.

> ### ⚠️ matrix-loaders-gotcha (03.08.2026)
> `apps/web/app/globals.css` MÅ ha `@import "@endwise/ui/matrix-loaders.css";`. Loaderne er **ren
> CSS-animasjon** — komponentene setter bare klasser (`.dmx-root`, `.dmx-dot`) og CSS-variabler,
> mens keyframene bor i pakkens egen `styles.css`. Uten importen rendrer alle 93 loaderne som en
> stillestående prikkerute: ingen feilmelding, ingenting i typecheck, ingenting i `next build` —
> bare noe som ser ødelagt ut. Samme familie som Tailwind-gotchaen over. Gjelder ENHVER ny app.
> Eksporten `./matrix-loaders.css` ble lagt til i `packages/ui/package.json` samtidig.

> ### ⚠️ REVERSERT: «New» er RØD igjen (20.08.2026)
> Mellom 20.08 morgen og 20.08 kveld var «New»-badgen på hjelpeartikler grønn, etter bestilling.
> **Det er omgjort på eiers eget initiativ samme dag** — §6 gjelder uten unntak: «New» er RØD,
> overalt. Begrunnelsen som ble skrevet for grønt (uleste meldinger venter på handling, en ny
> artikkel gjør ikke det) holdt ikke i praksis: etter at aksenten ble svart, er rødt det eneste
> som faktisk fanger blikket i sidebaren. Noten står her og ikke slettet, så neste person slipper
> å ta samme runde en gang til.
>
> Uleste MELDINGER beholder aksentfargen. De to tallene skal fortsatt kunne skilles.

> ### 🔴 EIERENS DESIGN-PRINSIPPER HAR FORRANG (03.08.2026, aksent endret 06.08)
> ⚠️ **AKSENTEN ER SVART, IKKE GRØNN** (fra 06.08.2026, «foreløpig»). Grønnen ble
> brukt så bredt at den sluttet å være en aksent. `--ew-accent`/`-strong` er
> `#111111` i lyst tema og `#ffffff` i mørkt; switch-track følger aksenten.
> Suksess-grønnen (`--ew-success`) er BEHOLDT — den er informasjon, ikke merkevare.
> «New»-badgen er RØD. Logogrønnen `#1ED27D` er urørt (bor i logo.svg).
> Inter · titler 16/20 Medium · labels 13/16 Medium · brødtekst 14 Regular · knapper 32px/10px ·
> rader 40px (data) og 44px (stores) · badge 20px/6px (farge fra aksent-tokenene) ·
> switch 24×14/10px (track følger aksenten) · tekst `#333333`/`#777777` · **LYST TEMA STANDARD** (`#ffffff`, sidebar
> `#fafafa`, valgt `#ededed`) · mørkt som toggle (`#171717`/`#1a1a1a`/`#292929`).
> **Full tabell + hva som er utledet: §6 «Design-prinsipper fra eier».** Kolliderer noe i denne
> fila med den seksjonen, er det den seksjonen som gjelder.

**Sist oppdatert:** 23. august 2026 (sidebar-avatar `alltid` + formvalg i Profil — ingen ny pakke) · 23. august 2026 (plattform-org + Se verkstedet + `/endwise/team` — ingen ny pakke, shadcn/beUI-komposisjon) · 23. august 2026 (F1-21/F1-22: gjenopprettingskoder + passord før 2FA av — ingen ny pakke) · 23. august 2026 (SMS-avkrysning synlig i Ny forhandler/Endre pakke — Jens overstyrer UI/UX P0 som skjulte den; shop forblir skjult) · 23. august 2026 (UI/UX P0: invite+2FA i samme skall, `/oppstart` uten avatar, `AvatarVelger` = 48px + Ny tilfeldig / always happy, varslingslyder som Switch-rad, pakkevelger 3 kolonner) · 23. august 2026 (F5-26: nivå+tillegg, `/oppstart`, `AvatarVelger` i `_avatar/` — ingen ny pakke, ingen cmdk) · 22. august 2026 (widget-fallbacks + PWA-manifest følger lyst tema og svart aksent `#111` — F4-20; stale «grønn aksent»-kommentarer rettet) · 20. august 2026 (bevegelse skrudd på selektivt — påkrevd `bevegelse`-prop på `Avatar`, tre verdier, se §10 · ⭐ **blobatar inn som avatarpakke** — F6-19, brukergodkjent §2-beslutning; se §10. Seed = stabil ID, aldri navn · tjenestekatalogen F2-05/F5-04 — ingen ny pakke, ren komposisjon; se §8. ⚠️ Første sted i appen med ekte radioknapper i stedet for pille-gruppe, fordi det er et skjemafelt og ikke et filter) · 7. august 2026 (dev-mode + forhandler-oppretting bygget — F5-26…F5-29; ingen nye UI-pakker, alt på shadcn/beUI som før: `Switch`, `StatefulButton`, `DropdownMenu`, `Badge`. Sidebar-mønsteret delt i to: **flyout for handlinger, inline utfolding for destinasjoner**) · 6. august 2026 (⚠️ **aksent grønn → svart** i token-laget · felles flyout-mønster m/ stiplet header-divider · ⭐ **F5-20 i gang** — 26 egne SVG-ikoner koblet inn via codegen · shell-justeringer: kollapsbar sidebar, tips-kort, bevel-handlinger · Analyse omformet: periodevelger, nye kort, paigraf · `Pie`/`Cell` eksponert) · 5. august 2026 (⭐ **Recharts inn som chart-motor** — brukergodkjent §2-beslutning; Analyse F5-18 bygget ferdig med søyle-, linje- og arealgrafer) · 4. august 2026 (sidebar-først shell bygget — F5-13: `dropdown-menu` + `dialog` hentet inn, ⌘K-palett på `Dialog` i stedet for `command`/cmdk) · 3. august 2026 (eierens design-prinsipper innført: Inter + lyst tema standard +
mål-tokens · matrix-loaders TATT I BRUK første gang på AI-diagnose · StatefulButton i 2FA-innlogging
og trådsvar · SSE-klient wiret · `Switch` hentet inn · ⛔ **dither-kit FJERNET fra UI-et og fra
barrel-eksporten**)

---

## Kartet

| Lag | Pakke | Jobb |
|---|---|---|
| **Tokens** | `@endwise/widget-tokens` | Farge, radius, spacing, typografi — én sannhet |
| **Struktur** | shadcn/ui | Knapper, tabeller, dialoger, skjema, sidebar |
| **Data** | Recharts (shadcn Chart-mønster) | Søyle-, linje- og arealgrafer. Kun rene typer — se §2 |
| **Bevegelse (tilstand)** | beUI | Knapper/kontroller som endrer tilstand (idle → loading → success) |
| **Bevegelse (venting)** | matrix-loaders | «AI tenker»-animasjoner, én loader per SSE-event |
| **Identitet** | blobatar | Deterministiske ansikter på personer. Kun admin-flater — se §10 |

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
| **Hentet inn** | `dropdown-menu` + `dialog` (04.08.2026 — kontekstbytte i sidebaren og ⌘K-paletten; skrevet etter shadcn-oppskriften på `radix-ui`, registry-CLI ikke tilgjengelig i miljøet), `button`, `badge` (shadcn Badge — erstattet primitiv-Badgen; `NewBadge`-wrapper i app-shellet), **`cuelume`** (08.08.2026 — varslingslyder, MIT, 0 avhengigheter, Web Audio; brukergodkjent §2. KUN innkommende meldinger; `bind()` brukes bevisst IKKE, se §8), **`switch`** (03.08.2026 — skrevet etter shadcn-oppskriften på `radix-ui`s `Switch`, som allerede var en avhengighet; registry-CLI var ikke tilgjengelig i miljøet) |
| **Kan hentes** | Hele katalogen — `table`, `dialog`, `sidebar`, `form`, `select`, `command`, `sheet`, `tabs`, `calendar` … |
| **⚠️ Avvik fra oppstrøms** | `button` og `badge` er tilpasset eierens mål (§6). Alt annet urørt |

---

## 2. Recharts — datavisualisering (ENESTE CHART-MOTOR fra 05.08.2026)

| | |
|---|---|
| **Brukes til** | Alle grafer. I dag: Analyse (F5-18) |
| **Installasjon** | `pnpm --filter @endwise/ui add recharts` · versjon `^3.10.1` |
| **Ligger i** | `packages/ui/src/components/chart.tsx` (shadcns Chart-mønster) |
| **Lisens** | MIT |
| **Runtime-avhengighet** | `recharts` i **både** `packages/ui` og `apps/web`. ⚠️ Samme felle som `motion` (§6): Next transpilerer UI-kildekoden i APPENS resolusjonskontekst, så pakken må være løsbar derfra |
| **Hentet inn** | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `CHART_COLORS`, `ChartConfig` + primitivene `BarChart`/`Bar`, `LineChart`/`Line`, `AreaChart`/`Area`, `XAxis`, `YAxis`, `CartesianGrid`, `ResponsiveContainer` |
| **Status** | ✅ Brukergodkjent §2-beslutning 05.08.2026. Erstatter tomrommet dither-kit etterlot |

### ⛔ Kun rene graftyper — dette er en regel, ikke en preferanse

**Eksponert:** søyle · linje · areal · **pai** (lagt til 06.08.2026 på eiers bestilling — til
fordelingen av trafikkilder, som er nettopp det pai er god til: andel av en helhet).
**Ikke eksponert:** radar, scatter, treemap, sankey, funnel, radialbar.

De er ikke fjernet fra pakken — de er utelatt fra barrel-en i `chart.tsx`. Målgruppen er en
ikke-teknisk forhandler som vil vite om det går bra, ikke en dataanalytiker. **En eksportert
komponent er en komponent noen tar i bruk.** Trenger du en av dem, er det en samtale, ikke en
import.

Samme grunn til at det ikke er glød, 3D-isometri, crosshatch eller animasjon:
`isAnimationActive={false}` er standard i alle kallsteder. En graf som beveger seg mens du leser
den, er vanskeligere å lese.

### Fargene er CSS-variabler, ikke props

Recharts tar farger som props (`fill`, `stroke`). Skriver du en hex der, snur ikke grafen med
lys/mørk-toggelen. Derfor: `ChartContainer` skriver ut `--color-<serie>` per graf fra `config`,
og seriene sier `fill="var(--color-fullfort)"`.

```tsx
const CFG: ChartConfig = {
  fullfort: { label: 'Fullførte saker', color: CHART_COLORS.accent },
  avlyst:   { label: 'Avlyste',         color: CHART_COLORS.muted },
};

<ChartContainer config={CFG} className="aspect-auto h-52 w-full">
  <BarChart data={data}>
    <CartesianGrid vertical={false} strokeDasharray="3 3" />
    <XAxis dataKey="dag" tickLine={false} axisLine={false} />
    <YAxis tickLine={false} axisLine={false} />
    <ChartTooltip content={<ChartTooltipContent config={CFG} />} />
    <Bar dataKey="fullfort" fill="var(--color-fullfort)" isAnimationActive={false} />
  </BarChart>
</ChartContainer>
```

`CHART_COLORS` peker inn i token-laget: `accent` → `--ew-accent-strong`, `blue` →
`--ew-switch-track-on`, `warn`, `danger`, `muted`. **Verifisert:** `--color-fullfort` løser til
`#15b042` i lyst tema og `#1ed27d` i mørkt, uten en eneste betinget farge i kallstedet.

### Regelen som overlevde dither-fjerningen

> **Visualiseringen bærer aldri informasjon alene.** Tallet/ordet står alltid i klartekst.

Analyse har derfor fire nøkkeltall i klartekst **over** grafene. Slår du av alle grafene, skal
skjermen fortsatt være brukbar.

### ⚠️ Recharts v3 SSR-rendrer ikke SVG-en

`renderToStaticMarkup` gir kun `<div class="recharts-wrapper">` — selve SVG-en tegnes først etter
montering, når `ResponsiveContainer` har målt bredden via `ResizeObserver`. Konsekvenser:

1. **Ingen graf i prerendret HTML.** Forventet, ikke en feil.
2. **En graf i en skjult container (`display:none`, uåpnet fane) tegner ingenting** før den vises,
   fordi `ResizeObserver` ikke fyrer i et skjult dokument. Husk det hvis grafer legges i faner.

---

## 3. dither-kit — ⛔ FJERNET FRA UI-ET (03.08.2026)

> ### Ikke bruk denne pakken uten ny beskjed fra eier.
>
> **Eier ba 03.08.2026 om at dither-kit fjernes fra UI-et.** All bruk i `apps/web` er borte, og
> komponentene er **ikke lenger eksportert** fra `@endwise/ui` — de kan ikke importeres.
> Skriver du `import { AreaChart } from '@endwise/ui'`, får du nå **Recharts'** AreaChart (§2),
> ikke dither-kits. Det er med vilje: navnet peker på den motoren som faktisk er i bruk.

**Hva som ble fjernet, og hva som erstattet det:**

| Var | Er nå |
|---|---|
| `AreaChart` (booking-flyt, 30 d) på `/dashboard` og `/admin` | `BookingsTable` — totaler per serie + tabell dag for dag |
| `AreaChart` (MRR, 12 mnd) på `/admin` | `RevenueTable` — MRR nå + vekst + tabell med endring per måned |
| `Sparkline` som KPI-kortbakgrunn | Ingenting. Kortet står, tallet bærer |
| `Sparkline` som rad-trend i forhandlerlista | Ingenting. Tallene sto allerede ved siden av |
| `DitherGradient` i `SupportCard`-headeren | Rolig aksentflate (`bg-accent-soft`) med ikonet |
| `DitherAvatar` i meldingstråden | `CircleUser`-ikon, samme som sidebarens profilrad |

**Merk:** tabellene på `/dashboard` og `/admin` ble IKKE gjort om til grafer da Recharts kom inn.
De er fine som de er — en tabell med eksakte dagstall er mer nyttig for en verkstedeier enn en
kurve. Grafer der de gir noe: Analyse.

### Hva som IKKE er gjort

- **Filene er ikke slettet.** `packages/ui/src/components/dither-kit/` (40 filer) og
  `packages/ui/dither-kit.json` ligger urørt.
- **Reversering** er én blokk: eksport-listen ligger utkommentert i `index.ts`. ⚠️ Den vil nå
  **kollidere** med Recharts-eksportene (`AreaChart`, `Area`, `Bar`, `Line`, `XAxis` …). Skal
  dither tilbake, må ett av settene aliaseres.

---

## 4. beUI — bevegelse og tilstand

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

**I bruk (03.08.2026):** innlogging + 2FA-bekreftelse (`/signin`, F1-11) · svar i meldingstråd
(`/innboks/[id]`, F6-01) · «Kjør»-knappen i AI-konsollen (`/integrasjoner/ai`, F6-04). Alle tre
endrer tilstand på serveren; «Send ny kode»-lenka på 2FA-steget gjør det også, men er bevisst en
tekstlenke fordi den er en *sekundær utvei*, ikke skjemaets handling.

---

## 5. matrix-loaders — venting

| | |
|---|---|
| **Brukes til** | «AI tenker»-animasjon, én loader per SSE-event (F6-02, F6-13) |
| **Installasjon** | **Vendorisert** (kopiert inn — ikke en npm-pakke) |
| **Kilde** | https://github.com/zzzzshawn/matrix |
| **Pin** | commit `e30b80a9c5e6fe388ecbbbac15abfd14f24d0dd3` |
| **Ligger i** | `packages/ui/src/vendor/matrix-loaders/` (124 filer) |
| **Lisens** | ⚠️ **Egendefinert proprietær.** Kommersiell bruk tillatt. **Forbudt** å publisere komponentene som frittstående/del av et annet komponentbibliotek. Derfor ligger de under `vendor/`, og `@endwise/ui` er `private: true`. Se `VENDOR.md` i mappa |
| **Hentet inn** | ✅ **HELE SETTET — 93 loadere**, alle re-eksportert fra `@endwise/ui`: `DotMatrixIcon` · `DotmSquare1–23` · `DotmCircular1–20` · `DotmTriangle1–20` · `DotmHex1–10` · `Dotm3x3`-familien (glyph-spin, diagonal-wave, path-wave) |
| **CSS** | ⚠️ **Påkrevd:** `@import "@endwise/ui/matrix-loaders.css";` i appens `globals.css`. Se gotchaen øverst i fila |
| **I bruk** | AI-diagnose (`/integrasjoner/ai`, F6-04): én loader per SSE-fase — `DotmCircular1` (starter) · `DotmHex1` (tenker) · `DotmSquare1` (henter data) |
| **Oppdatering** | Hent på nytt fra oppstrøms og bytt ut mappa. **Ikke rediger filene.** |

**Farge:** bruk `color="var(--ew-accent)"` — **ikke** `colorPreset`. Presetene (`solid-mint`,
`grad-sunset` …) er hardkodede farger/gradienter fra oppstrøms og bryter «ingen komponent
hardkoder farge». `color` tar en vilkårlig CSS-farge og defaulter til `currentColor`.

**Loaderen bærer aldri informasjon alene** — samme regel som §2 arvet fra dither-tiden. Fasen står alltid i
klartekst ved siden av: «Assistenten tenker …», ikke bare en animasjon.

---

## 6. Fundament

| Pakke | Rolle |
|---|---|
| `@endwise/widget-tokens` | `--ew-*`-tokens (lys/mørk/aksent). ✅ **Lyst tema er standard** (eier 03.08.2026); aksent er **svart `#111111`** i lyst og **hvit** i mørkt (06.08.2026). Logogrønnen `#1ED27D` er merkevare i logo.svg, ikke knappfarge. Nye tokens: `surface-2`, `border-strong`, `fg-faint`, `accent-dim`, `warn/danger/success`, `glass-*`, `radius-xl/pill` |
| Tailwind CSS 4 | `@theme inline` i `packages/ui/src/theme.css` |
| `radix-ui` | Primitivene shadcn bygger på |
| `lucide-react` | Ikoner. **Eneste ikonbibliotek**. Apper importerer via den kuraterte barrel-en `@endwise/ui/icons.ts` — aldri `lucide-react` direkte. ⚠️ **Fra 06.08.2026 er barrel-en delt:** 26 ikoner kommer fra EGNE SVG-er i `src/assets/icons/` via `scripts/build-icons.ts` → `icons.generated.ts` (F5-20); resten fra lucide inntil egne finnes. `createLucideIcon` gjør at typen er identisk, så ingen kallsteder merker forskjellen. Regenerer: `pnpm --filter @endwise/ui build:icons` |
| `maplibre-gl` | Kart/globe-motor (open-source, ingen API-nøkkel, mørk innebygd). Brukt til «Live besøkende»-globen på Marked. I mapcn-ånd (mapcn = shadcn-wrapper over MapLibre); mapcn.dev var utilgjengelig ved bygging, så vi bruker MapLibre GL direkte. Kilde: github.com/AnmolSaini16/mapcn · maplibre.org. Lisens: MapLibre GL = **BSD-3-Clause**, mapcn = MIT |
| `motion` | Animasjonsmotor (delt av beUI + dither-kit). ⚠️ Må også deklareres i **hver app** som bruker `@endwise/ui` (f.eks. `apps/web`) — Next transpilerer UI-kildekoden i appens resolusjonskontekst, så `motion/react` må være løsbar derfra. Lagt inn i `apps/web` 16.07.2026 |

### 🎨 DESIGN-PRINSIPPER FRA EIER — GJELDER HELE UI-ET (03.08.2026)

> **Disse verdiene har FORRANG over resten av denne fila der de kolliderer.**
> De er ikke et forslag. Alt under er gitt av eier; det som er utledet av meg er
> merket eksplisitt i `packages/widget-tokens/src/tokens.css`.

| Rolle | Verdi | Token / utility |
|---|---|---|
| **Font** | Inter (SIL OFL) | `--ew-font-sans` |
| **Titler** | 16px / 20px linjehøyde / Medium (500) | `text-title` |
| **Labels** | 13px / 16px / Medium (500) | `text-label` |
| **Brødtekst** | 14px / Regular (400) | `text-body` |
| **Knapper** | 32px høyde · 10px radius | `h-control` · `rounded-control` |
| **Datarad** | 40px | `h-row` |
| **«Stores»-rad** | 44px | `h-row-store` |
| **Badge** | 20px høyde · 6px radius · fyll `#CAFACE` · tekst `#15B042` | `h-badge` · `rounded-badge` · `bg-accent-soft` · `text-accent-strong` (eller shadcn `<Badge>`) |
| **Switch** | 24×14px track · 10px thumb · track-på `#0077E6` | `<Switch>` · `--ew-switch-*` |
| **Tekst** | `#333333` default · `#777777` subtle | `text-fg` · `text-fg-muted` |
| **Lyst (STANDARD)** | bakgrunn `#ffffff` · sidebar `#fafafa` · valgt i sidebar `#ededed` | `bg-bg` · `bg-sidebar` · `bg-sidebar-active` |
| **Mørkt (toggle)** | bakgrunn `#171717` · sidebar `#1a1a1a` · valgt i sidebar `#292929` | samme tokens, `[data-theme="dark"]` |

**Lyst tema er nå standard** (`<html data-theme="light">`). Mørkt ligger komplett ved siden av og
nås med `<ThemeToggle>`. Begge palettene bor i `packages/widget-tokens/src/tokens.css`.

**Tre tekst-utilities, ikke ni.** `text-title` / `text-label` / `text-body` bærer størrelse,
linjehøyde **og** vekt. Det finnes derfor ikke en variant der noen glemte vekten. Bruk dem — ikke
`text-sm`/`font-semibold`-kombinasjoner. Til meta/tidspunkt brukes `text-[12px]` (se «Hull» under).

**Tre komponenter avviker nå bevisst fra oppstrøms**, fordi en spec som må huskes ved hvert
kallsted er en spec som brytes ved den femte bruken:

| Fil | Avvik |
|---|---|
| `components/button.tsx` (shadcn) | `rounded-control` + `text-label` + `h-control` i stedet for `rounded-md`/`text-sm`/`h-9` |
| `components/motion/button/base.tsx` (beUI) | `SIZE_CLASS` gir 32px + 10px radius i stedet for beUIs 40px pill |
| `components/badge.tsx` (shadcn) | 20px høyde + 6px radius; `default`-varianten er spec-fargene |

`shadcn add` kan fortsatt brukes for NYE komponenter — kun disse tre er rørt.

#### ⚠️ Hull i spesifikasjonen — mine valg, lette å overstyre

1. **Bare to tekstfarger er spesifisert.** `--ew-fg-faint` er derfor **aliasert** til subtle
   (`#777777`) i stedet for at jeg fant på et tredje nivå. Vil du ha tre, sett verdien i
   `tokens.css` — ingen komponent trenger å endres.
2. **Ingen meta-størrelse under 13px er spesifisert.** Tidspunkt, hjelpetekst og
   sekundærforklaringer bruker `text-[12px]`. Skal de være 13px, er det ett søk-og-erstatt.
3. **Hårlinjer, hover-flate, kortflate og hele den mørke tekstrampen** er utledet. Se
   «UTLEDET»-merkingen i `tokens.css`.
4. **`Titler 16/20px`** er lest som *størrelse/linjehøyde*, ikke som to titteltrinn. Sier du at det
   var to trinn (16px H2, 20px H1), er det én linje i `theme.css`.

---

### 🎨 Merkevare-aksent

**Logofargen er `#1ED27D`** (`apps/web/public/logo/logo.svg`). Den er merkevare i logoen,
ikke UI-aksent. `--ew-accent` er **`#111111`** i lyst tema og **`#ffffff`** i mørkt
(eierbeslutning 06.08.2026). Primærknapper bruker svart/hvit — ikke grønn, og ikke
roadmap-rød `#EE2924`.

`--ew-success` (`#15B042` / `#1ED27D` i mørkt) er informasjon, ikke knappfarge.
`--ew-accent-soft` = **`#ededed`** i lyst tema (aksentfylt flate).

matrix-loaders fargelegges med `color="var(--ew-accent-strong)"` (se §4) — aldri med `colorPreset`,
som er hardkodede farger fra oppstrøms.

---

### ✍️ Typografi — INTER (03.08.2026)

**Erstatter Google Sans Flex** (som erstattet Plus Jakarta Sans). Historikken står i
`docs/roadmap-endringer.md`; dette er gjeldende.

| | |
|---|---|
| **Sans** | **Inter** · variabel · subsets `latin` + `latin-ext` (æøå ✓) |
| **Mono** | JetBrains Mono · vekter 400/500/600 · tall/tabeller (`tabular-nums`) |
| **Lisens** | **SIL Open Font License (OFL)** — begge |
| **Kilde** | Google Fonts via **`next/font/google`** i `apps/web/app/layout.tsx` — selvhostet ved build, ingen FOUT/layout-shift, ingen runtime-kall til Google |
| **Variabler** | `--font-inter`, `--font-jetbrains-mono` (på `<html>`) → `--ew-font-sans/-mono` → shadcn `--font-sans/-mono` |

Inter har ekte fallback-metrics i next/font-katalogen og trenger derfor **ikke**
`adjustFontFallback: false`, slik Google Sans Flex gjorde.

**Typeskala** — bor i `packages/ui/src/theme.css` som `@theme`-verdier, ikke som løse utilities:

| Rolle | Utility | Størrelse / linjehøyde | Vekt |
|---|---|---|---|
| Tittel (H1/H2) | `text-title` | 16 / 20 | 500 |
| Label, nav, knapp | `text-label` | 13 / 16 | 500 |
| Brødtekst | `text-body` | 14 / 20 | 400 |
| Meta *(utledet)* | `text-[12px]` | 12 | 400 |

> Bytte av font senere = kun `layout.tsx` + `--ew-font-sans`; hele skalaen står.

## 7. I techstacken, men ikke hentet inn ennå

Ikke skriv egne erstatninger for disse — hent dem når skjermen som trenger dem bygges.

| Pakke | Til hva | Hentes i |
|---|---|---|
| `slot-text` | Rullende KPI-siffer | F3-05 (DealerOverview). KPI-tallene på admin-oversikten er i klartekst inntil videre |
| `ai-elements` | Conversation, Message, PromptInput, Plan, Task, Voice | ⚠️ **OVERLAPPER NÅ MED §9** (12.08.2026). Chat-flaten ble bygget på shadcn sine `message`/`message-scroller`/`questionnaire` etter eierens beskrivelse, så `Conversation`/`Message`/`PromptInput` er allerede dekket. Igjen står `Plan`, `Task` og `Voice`. **Å ta inn `ai-elements` nå ville gitt to meldingskomponenter side om side** — det er en techstack-avklaring (§2), ikke noe som skal skje i forbifarten |

> ❌ **Recharts er FJERNET fra techstacken** (14.07.2026, brukergodkjent) — begrunnelsen var at
> dither-kit dekket alle chart-typene. ⚠️ **Etter 03.08.2026 er dither-kit ute av UI-et (§2), så det
> finnes ingen chart-motor.** Skal charts tilbake, må valget tas på nytt — det er en techstack-sak.
> chart-typene. Ser du `recharts` i en import, er det en feil som skal rettes.

---

## 8. Egenskrevet — og hvorfor

Kun disse. Hver enkelt har en grunn.

| Komponent | Hvorfor ikke en pakke? |
|---|---|
| `Btn`, `Badge`, `Chip`, `Card`, `Input` (`packages/ui/src/primitives/`) | Roadmap **F0-12** navngir dem eksplisitt som «primitiver fra komponentgalleriet». De er tynne skall over token-laget. **Når prototypen er inne bør de revurderes** — dekker shadcn dem, skal de bort |
| `LydProvider` / `useLyd` (`apps/web/app/(app)/_lib/lyd.tsx`) og `ProfilKort` (`_shell/profil-kort.tsx`) | **Ingen ny UI-pakke** — `cuelume` er en LYD-motor. Av/på er shadcn `Switch` i samme radmønster som Settings › Varsler (`h-row-store` i `rounded-xl border-border`). Track følger `--ew-accent`. ⛔ `bind()` fra cuelume brukes ikke: automatiske hover-/klikklyder over hele panelet er nettopp det som får folk til å skru av lyden helt, og da mister de varselet som betyr noe. `lyd.test()` spilles når bryteren skrus PÅ |
| `KanalMerke` / `KanalLinje` (`apps/web/app/(app)/innboks/_kanal.tsx`) | **Ingen ny pakke.** Kanal-indikatoren er sammensatt av det vi allerede har: badge-tokenene fra §5 (`h-badge` · `rounded-badge` · `bg-accent-soft`/`bg-warn-soft`/`bg-surface-2`) og ikoner fra `@endwise/ui`-barrelen (`Phone`, `Mail`, `MessageSquare`, `Globe`). shadcn `Badge` dekker ikke ikon + kanaltone + `title`-setning i ett, og resten av innboksen bruker allerede inline token-badger (`KIND_TONE`) — å blande to badge-mønstre i samme liste ville sett ut som to systemer. Kanalen bæres av IKONET, ikke fargen, så indikatoren fungerer også for fargeblinde |
| Admin-shell + oversikt-komposisjoner (`apps/web/app/(app)/…`: `TopBar` (m/ topbar-nav), `Sidebar`, `SupportCard` + `BevelButton`/`BEVEL` (TheFold-kortstil), `SectionCard`, `KpiCard`, `BookingsTable`, `RevenueTable`, `DealerList`; `_shell/nav.ts`, `_lib/use-org-role.ts` rollegate) | **Ikke** gjenbrukbare primitiver — de er app-nivå *komposisjoner* av eksisterende pakker (shadcn `Button` + `@endwise/ui`-ikoner + tokens). `BookingsTable`/`RevenueTable` er vanlige `<table>`-er skrevet 03.08.2026 da dither-grafene ble fjernet — shadcn `table` kan hentes inn og erstatte dem når noen orker. De hører til `apps/web`, ikke `@endwise/ui`, så de står her kun for sporbarhet. Ingen ny pakke tatt inn |
| Sidebar-først shellet (`apps/web/app/(app)/_shell/`: `nav.ts`, `sidebar.tsx`, `top-bar.tsx`, `context-switcher.tsx`, `command-palette.tsx`) + destinasjonene `saker/`, `samarbeid/`, `analyse/`, `endwise/` (inkl. `/endwise` oversikt, `/endwise/flagg`, `/endwise/team`, `/endwise/verksted/[slug]`, F1-07/F0-04/F5-11), `innstillinger/*`, `oppstart/` (F5-26 eier-veiviser) | App-nivå **komposisjoner** (F5-13). Bygget av `@endwise/ui`-komponenter: `DropdownMenu`, `Dialog`, `Switch`, `Badge`, `BevelButton` + ikon-barrel. **⌘K-paletten er egenskrevet** fordi shadcns `command` krever `cmdk` — ny pakke = §2-endring, ikke godkjent. Paletten er ~60 linjer filtrering over `nav.ts`; `cmdk` kan erstatte den senere uten at kallstedene endres. `/endwise` og `/endwise/flagg` er samme mønster: `CardShell` + `Badge` + `Switch`/`StatefulButton` — ingen ny primitiv, ingen mock-KPI. Ingen ny Admin-tab i forhandler-sidebaren. `/endwise/team` bruker `Field` + native radio (samme begrunnelse som tjenestekatalogen: skjemafelt, ikke filter) + `StatefulButton` + `Badge` «Hoved-admin». Se verkstedet-banneret er `h-row bg-warn-soft text-warn` — token-rad, ikke ny primitiv. `/oppstart` er visningsnavn · team (og Tillegg bare hvis `optional.length > 0`) på `CardShell` — ingen avatar-steg. `AvatarVelger` i Settings › Profil er 48px + «Ny tilfeldig» (humør always happy). shadcn har stepper, men den er ikke hentet inn, og to/tre steg er ikke grunn nok til ny pakke |
| Meldings- og AI-flatene (`apps/web/app/(app)/`: `innboks/page.tsx` + `innboks/[id]/page.tsx` + `_lib.ts` + `_chrome.tsx` / `_modus.tsx`, `endwise/innboks/`, `integrasjoner/ai/page.tsx`, `_lib/use-event-stream.ts`) | App-nivå **komposisjoner**, ikke primitiver: shadcn/beUI-knapper (`StatefulButton`) + matrix-loaders + `@endwise/ui`-ikoner + `CardShell`/`CardMedia`. F5-11 (23.08.2026): `/endwise/innboks` gjenbruker innboks-chrome (`modus=endwise`). `SupportKort` og `EndwiseForhandlerDetaljer` er lokale rader — shadcn har ingen innboksrad med forhandlernavn + muted utdrag + aksentprikk. «Se verkstedet» er en `Link` til `/endwise/verksted/[slug]` (ikke setActive). `use-event-stream.ts` er en **datahook**, ikke UI. Ingen ny pakke tatt inn |
| Kundewidget (`@endwise/widget-ui`: `EndwiseWidget` + `BookingPanel` + `mountEndwiseWidget`, F4-03) | **Frittstående, cross-origin embed** på forhandlerens (Framer-)nettside — den kan IKKE dra inn appens shadcn/Tailwind/dither-kit (ingen delt build, ingen `@source`-skanning på tredjepartssider). Derfor bevisst **avhengighetslett**: inline styles som leser `@endwise/widget-tokens` sine `--ew-*`-CSS-variabler (samme token-sannhet som resten). React er eneste runtime-avhengighet (peer). [ART50-UI]-opplysningen er egen markup her fordi widgeten ikke deler DOM/pakke med `@endwise/ui`. Nye deps: `react`/`react-dom` (widget-ui, peer), `framer-plugin`/`vite` (framer-plugin) |

| `Bildefelt` på markedssiden (`apps/web/app/page.tsx`, F5-35) | **Ingen ny pakke, og ingen pakke å hente.** Et bilde på en markedsside er `next/image` + token-laget — shadcn har ingen media-komponent, beUI er bevegelse og matrix-loaders er venting. Komponenten er ~20 linjer: `fill` + `object-cover` i en `aspect-[16/9]`/`aspect-[21/9]`-boks med `rounded-xl border-border bg-surface-2`. Den finnes kun for å holde de fire bildene identiske — et `sizes` som er feil ett sted laster dobbelt så store filer på mobil uten at noe ser galt ut. ⛔ Ingen tekst oppå bilde, med vilje: da måtte kontrasten holdt mot BEGGE temaene og mot et motiv som er lyst i midten |

| Tjenestekatalogen (`apps/web/app/(app)/innstillinger/tjenestekatalog/`: `page.tsx`, `_felter.tsx`, `_ny-tjeneste.tsx`, `_tjeneste-kort.tsx`, `_felles.ts`) | App-nivå **komposisjon** (F2-05/F5-04), ingen ny pakke. Bygget av `StatefulButton` (beUI), `CardShell` og ikon-barrelen, med de samme input-klassene som `kunder/_ny-kunde.tsx` — feltene er kopiert i klassestreng, ikke i komponent, fordi shadcn `form`/`input` ikke er hentet inn og resten av appen ikke bruker dem. ⚠️ Kjøretøytype-velgeren er **ekte `<input type="radio">`** og ikke pille-knapper med `role="radio"`, som ellers i appen: pillene andre steder er FILTRE (tablist er riktig der), denne er et skjemafelt, og biome avviste `role="radio"` med rette. Utseendet er likt. `_felter.tsx` finnes for at «opprett» og «ny versjon» skal dele ÉN definisjon av versjonsfeltene — to skjemaer for samme fire kolonner ville før eller siden fått ulik validering |

| Auth-feltene (`apps/web/app/_auth/felter.tsx`: `Field`, `INPUT`, `PassordFelt`, F1-15/F1-16/F1-18/F1-25) | **Ingen ny pakke.** `packages/ui` HAR en `Input`-primitiv, men den er `h-10`/`rounded-md` mens de uinnloggede skjermene bruker eierens kontrollspec (`h-control` 32px, `rounded-control` 10px) — å endre den delte primitiven for å treffe innloggingen ville flyttet spec-en for alle andre kallsteder. Klassestrengen lå allerede i `signin/page.tsx`; den er løftet ut ett hakk så `/glemt-passord`, `/nytt-passord`, `/2fa-oppsett` og `/invitasjon` (F1-10) arver den i stedet for å kopiere den. **`PassordFelt` (vis/skjul, F1-18) er egenskrevet fordi shadcn/ui ikke har en passordvariant** — der er passordfelt bare `Input type="password"`. ⚠️ Knappen er en sikkerhetsdetalj, ikke pynt: `/signin` sin feilmelding må i dag be folk «skrive passordet for hånd» fordi et limt inn mellomrom er usynlig bak prikkene. `tabIndex={-1}` med vilje — den skal ikke ligge mellom passordfeltet og «Logg inn». Nye ikoner i barrelen: `Eye`, `EyeOff` |

| `ByttPassordSkjema` / `ToFaktorRad` (`apps/web/app/(app)/_shell/`) | **Ingen ny pakke.** Passordbytte (F1-17), 2FA-status (F1-20) og slå-av med passord (F1-22) er komposisjon av `PassordFelt` + `StatefulButton` + token-rad. De bor i `_shell` fordi `_shell/profil-kort.tsx` allerede deles mellom Settings › Profil og mekanikerens «Meg» — to kopier av sikkerhetsfeltene ville fått hver sin validering. Gjenopprettingskoder (F1-21) vises på `/2fa-oppsett` med samme kort (`Field`, `StatefulButton`, Last ned/Kopier). Ingen ny Admin-tab. Reglene (`validerByttPassord`, `validerSlaaAv2fa`, `kanFullforeKoder`, `toFaktorStatusTekst`, `etter2faBekreftet`) ligger i `@endwise/auth` som rene funksjoner, samme grep som `password-reset.ts`. Nye ikoner i barrelen: `Copy`, `Download` |

Legger du til en rad her, skal den ha en setning som forklarer hvorfor ingen pakke holdt.

`@endwise/ui/icons.ts` er en **re-eksport** av en kuratert lucide-mengde — ikke egen kode, kun en
barrel så apper slipper å ta inn `lucide-react` direkte (og ingen kan smugle inn et annet ikonsett).

---

## 9. shadcn/ui — CHAT (hentet 12.08.2026, F6-18)

AI-chat-flaten. Hentet med `npx shadcn@latest view <navn>` og lagt i
`packages/ui/src/components/`, samme framgangsmåte som `dropdown-menu` og `dialog`.

| Komponent | Kilde | Avhengighet |
|---|---|---|
| `message.tsx` | ✅ Registeret, tilnærmet urørt | **Ingen** — ren struktur + CSS |
| `message-scroller.tsx` | ✅ Registeret, tilpasset | `@shadcn/react` |
| `questionnaire.tsx` | ⚠️ **Ikke i registeret** — stil-skall skrevet av oss | `@shadcn/react` |
| `tool-part.tsx` | ✍️ Egenskrevet — shadcn har ingen | Ingen |

### Nye pakker (§2-endring, brukergodkjent 12.08.2026)

| Pakke | Størrelse | Lisens | Hvorfor |
|---|---|---|---|
| `@shadcn/react` | 56 kB, **0 deps** | MIT | Bærer oppførselen i scroller + questionnaire |
| `@ai-sdk/react` | 305 kB | Apache-2.0 | `useChat`. Samme familie som `ai@7` vi alt har |
| `@shadcn/helpers` | 48 kB | MIT | `createChat()` — forhåndsskrevne demo-strømmer |

⛔ **Ingen Vercel AI Gateway.** Modellrutingen går som før gjennom
`resolveModelProvider(dataClass)`: kundevendt → Mistral (EU), internt → Fireworks.

### ⚠️ Tre avvik du må kjenne til

1. **Fire utility-klasser er fjernet fra `MessageScrollerViewport`** —
   `scroll-fade-b`, `scrollbar-thin`, `scrollbar-gutter-stable` og
   `data-autoscrolling:scrollbar-none`. De er shadcns egne og finnes ikke i vårt
   Tailwind-oppsett; beholdt ville de vært klasser som ikke gjør noe. Trenger vi
   dem, defineres de i `theme.css` som ekte utilities.

2. **`questionnaire` ligger ikke i det offentlige registeret.**
   `/r/styles/new-york-v4/questionnaire.json` → 404 (verifisert 12.08.2026); bare
   dokumentasjonssidene finnes. Oppførselen kommer fra `@shadcn/react`, så fila
   vår er **kun stil på et ekte shadcn-primitiv**. Blir komponenten publisert
   senere: **bytt den ut**, ikke vedlikehold vår videre.

3. **`MessageBubble` er ikke fra oppstrøms.** shadcn lar deg style
   `MessageContent` fritt, men da ville hvert kallsted gjentatt bakgrunn, radius
   og maksbredde — og den femte kopien ville sett litt annerledes ut.

### Hvorfor `tool-part.tsx` er egenskrevet

shadcn har ingen tool-part-komponent i registeret. Mønsteret finnes i
`chatbot-template` som **eksempelkode**, ikke som en installerbar komponent.
Fila er ~90 linjer stil over AI SDK sin `ToolUIPart`-tilstandsmaskin.

⚠️ **Tilstandsnavnene speiles ett-til-ett** (`input-streaming` →
`input-available` → `approval-requested` → `approval-responded` →
`output-available` / `output-error` / `output-denied`). En egen norsk
enum ville betydd at en ny SDK-tilstand stille falt ut av UI-et.

⛔ `output` rendres alltid som tekst, aldri som HTML — verktøy-output er data fra
en modell og en database, og behandles som utrygt (guardrail L4, F6-14).

### Godkjenn-før-agenten-skriver

`ToolPartGodkjenning` er der spørsmålet stilles — **ikke der sperren ligger**.
Sperren er `needsApproval: true` på verktøyet på serveren; AI SDK holder kallet
tilbake til svaret kommer. «Avvis» er like framtredende som «Godkjenn»: et
godkjenn-steg der det ene valget er en gråtone er ikke et valg, det er en
bekreftelsesdialog.

---

## 10. blobatar — avatarer (hentet 20.08.2026, F6-19)

| | |
|---|---|
| **Brukes til** | Deterministiske ansikter på PERSONER i admin-flatene |
| **Installasjon** | `pnpm --filter @endwise/ui add blobatar @blobatar/react` · versjon `^2.3.1` |
| **Ligger i** | `packages/ui/src/components/avatar.tsx` (wrapper `Avatar`) |
| **Lisens** | MIT |
| **Runtime-avhengighet** | `blobatar` + `@blobatar/react` i **både** `packages/ui` og `apps/web`. ⚠️ Samme felle som `motion` (§6) og `recharts` (§2): Next transpilerer UI-kildekoden i APPENS resolusjonskontekst |
| **Egne avhengigheter** | **Null.** `@blobatar/react` har kun peers (`blobatar` 2.x, `react` >=18) |
| **Status** | ✅ Brukergodkjent §2-beslutning 20.08.2026 |

### Hva som faktisk er tatt i bruk

`<Blobatar name size hue tone traits normalize title alt />` — statisk modus, som rendrer
**ett `<img>`** med en percent-enkodet data-URI. Ingenting hentes over nett; hele SVG-en regnes ut
i nettleseren.

⛔ **Ikke tatt i bruk, med vilje:**

| Funksjon | Hvorfor ikke |
|---|---|
| `expression` (poses) | Et ansikt som skifter uttrykk i en arbeidsinnboks påstår noe om personens humør som vi ikke vet noe om |
| `background` | Plata er vår (`bg-surface-2` + `rounded-control`), så token-laget eier lys/mørk. Stilen har uansett backdrop av som standard |
| `palette` | Ville omgått bibliotekets kontrastgaranti — den er eksplisitt dokumentert som «overridden colors bypass the contrast guarantee» |

### Bevegelse: `animate` er PÅ, men selektivt (20.08.2026)

`Avatar` har en **påkrevd** `bevegelse`-prop med tre verdier. Den er påkrevd med vilje: animasjon
koster ulikt på ulike flater, og med en default ville valget vært noe man arver uten å tenke — en
liste med 200 rader ville en dag fått animasjon fordi ingen skrev noe. Samme argument som
`requireSession(db)` fører for sitt påkrevde db-argument. **Nå nekter TypeScript å kompilere til
noen har tatt stilling.**

| Verdi | Rendring | Brukes på |
|---|---|---|
| `stille` | ett `<img>` | Samtalelista · kundelista · de 24 valgknappene i profilen |
| `hover` | inline SVG, amplitude 0 til `:hover` | Meldingene i tråden · Detaljer-panelet · kundekortet |
| `alltid` | inline SVG, alltid i bevegelse | Brukerraden i sidebaren (ett ansikt) · forhåndsvisningen i Settings › Profil |

`hover` er ikke en halvveis `alltid` — det er bibliotekets eget standpunkt: «ambient motion seen
constantly is motion worth removing», og «animates one blobatar at a time», som er både det
estetiske og det ytelsesmessige svaret. En tråd med tretti meldinger står helt i ro til du peker på
et ansikt.

`alltid` er dokumentert som unntaket for «the single-blobatar case — a profile header». Det er
nøyaktig profil-forhåndsvisningen: der ER bevegelsen innholdet, siden du står og ser på ansiktet
mens du endrer det. **Bruk den ikke på noe som kan opptre i flertall.**

⚠️ **`@import "blobatar/motion.css";` i `apps/web/app/globals.css` er PÅKREVD** for begge de
animerte modusene. Samme familie som matrix-loaders-gotchaen i toppen av denne fila: uten importen
er det ingen feilmelding, ingenting i typecheck og ingenting i byggesteget — bare avatarer som står
stille der de skulle puste.

Gratis fra biblioteket: `prefers-reduced-motion: reduce` slår av all animasjon, og på enheter uten
ekte hover pauses `hover`-modus helt. Ingen av delene håndteres av oss.

### ⛔ Seeden er en ID, aldri et navn

`Avatar` tar `seed` (ID) og `navn` (kun `title`/`alt`). Retter noen «Kari Nordmman» → «Kari
Nordmann», skal ikke kunden bytte ansikt; og to kunder som begge heter «Ola Hansen» skal ikke dele
det. **Serveren bestemmer seeden** (`directory.participants.seed`): kunde → `customers.id`,
mekaniker → `mechanics.id`, ansatt → `user.id`. Ellers ville samme menneske hatt ett ansikt i
innboksen og et annet på kundekortet.

`normalize={false}` er satt: biblioteket trimmer og lowercaser navnet sitt som standard, hvilket er
riktig når seeden ER et navn. Vår seed er en UUID vi eier selv.

### Redigerbart: tilfeldig form/farge/tone — humør er always happy

Pakken eksponerer 39 trait-nøkler. **Vi pinner ikke fire lister.** Ett ansikt per person
(seed = `user.id`). Humør er **alltid happy**. Form, farge og tone er seed-default til noen
velger form i Settings › Profil (10 knapper) eller trykker «Ny tilfeldig» (48px,
`bevegelse="alltid"`). Sidebaren bruker samme `alltid` — ett ansikt, bevegelsen er innholdet.
Ikke på widget/kunde.

⚠️ Vi lagrer **formnavnet**, ikke 0–1-tallet: tallbåndene er frosset per major i blobatar, men et
band kan flytte seg i neste major, og da ville et lagret tall stille gitt en annen form. Navn kan
remappes. Kartleggingen navn → band ligger i `avatar.tsx`; vokabularet speiles i
`@endwise/modules/profil` (zod) og i en CHECK-constraint i basen.

### Hvor den brukes

Innboksens samtaleliste · meldingene i tråden · Detaljer-panelet (kunde og mekaniker) ·
kundelista · kundekortet · **brukerraden nederst i sidebaren** · forhåndsvisningen i
Settings › Profil.

⛔ **Ikke** på kjøretøy (F2-03 eier modellbilder med ekte silhuetter), **ikke** på forhandleren som
organisasjon (den er ikke en person), **ikke** i widgeten eller på kundevendte flater.
