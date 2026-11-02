# Board UI-audit — inspirasjon innenfor Mobbin-låsene

**Dato:** 2. november 2026  
**Type:** Undersøkelse. Ingen kodeendringer i produktet.  
**Mål:** Hvordan Board UI ([boardui.com](https://boardui.com)) kan forbedre *hele* Endwise — uten å bytte designretning.  
**Relaterte roadmap-ID-er:** F0-11 (tokens), F0-12 (`@endwise/ui`), F5-13 (shell). Ingen av dem endrer status her.

---

## 0. Metode og kilder

### Hva som faktisk er lest

Board UI ble hentet 2. november 2026 som markdown (sidene svarer på `Accept: text/markdown`). Følgende sider lastet og er sitert med konkrete verdier:

| Side | URL | Status |
|------|-----|--------|
| Forside | https://boardui.com / https://www.boardui.com | Lest |
| `llms.txt` (katalog + Pro-liste) | https://www.boardui.com/llms.txt | Lest |
| Installation + full `theme.css` | https://www.boardui.com/installation | Lest (hele token-kilden) |
| Color | https://www.boardui.com/components/color | Lest |
| Typography + full `typography.css` | https://www.boardui.com/components/typography | Lest |
| Button, Input, Search Field, Input OTP | `/components/button` · `/input` · `/search-field` · `/input-otp` | Lest (kilde + API) |
| Modal, Drawer | `/components/modal` · `/drawer` | Lest (kilde + motion) |
| Skeleton, Tabs, Segmented Control, Table, Toast, Chip, Theme Toggle | tilsvarende `/components/*` | Lest |
| Sidebar | https://www.boardui.com/components/sidebar | Lest (intro + sidebar-kilde) |
| Registry-index | https://www.boardui.com/r/registry.json | Lest (alle frie item-navn) |
| Getting started / CLI (søk-snippets) | `/getting-started` · `/docs/cli` | Delvis (søketreff + forside) |

### Ukjent / ikke lastet

- **`sitemap.xml`** → HTTP 500. Sidekartet er derfor `llms.txt` + `registry.json`, ikke sitemap.
- **Context.dev MCP** var ikke autentisert i denne økten. Innholdet er hentet via WebFetch mot Board UI sine egne markdown-svar.
- **Live Figma-preview / pixel-måling i nettleser** er ikke kjørt. Alle mål under er fra Board UI sin *publiserte kildekode og docs*, ikke fra skjermmåling.
- **Pro-komponenter** (Composer, Task List, Calendar, chart-kort, templates): kun katalogtekst i `llms.txt`. Kildekode er bak lisens og er **ikke** lest. Beskrivelser merkes «Pro — kun katalog».
- **`llms-full.txt`** ble ikke lastet (for stor). Hver komponent er hentet som egen side i stedet.
- **Accordion, Spinner, Progress, Command Palette, Notification, Auth Card, Data Table, Stat Cards, Empty-illustrationer** er i katalogen, men kildefilen er ikke lastet i denne økten. API-en under er fra `llms.txt`-beskrivelsen, merket *ikke kilde-verifisert* der det gjelder.

### Endwise-kilder

`packages/widget-tokens/src/tokens.css`, `packages/ui/src/theme.css`, `packages/ui/src/lib/ease.ts`, `docs/UI-PAKKER.md`, `apps/web/app/(app)/_shell/*`, produktflatene under `apps/web/app/(app)/` (innboks, jobber/saker, kunder, organisasjon, lager, butikk, bookinger/ny, innstillinger), `_auth/*`, `_markeds/*`, `packages/widget-ui`.

---

## 1. Låste rammer — og der Board UI strider mot dem

Board UI skal brukes som **inspirasjon og forbedring innenfor** disse rammene, ikke som ny retning. Der Board UI default er et annet system, står det **⛔ STRID** under. De verdiene skal *ikke* kopieres.

| Lås | Endwise (gjeldende) | Board UI default | Dom |
|-----|---------------------|------------------|-----|
| Canvas | `#ffffff` | `--color-background-full` = `white` | Samme intensjon. Behold Endwise-token. |
| Ink | `#141414` | `--color-text-primary` = `neutral-950` | Nær, men ikke lik. Behold `#141414`. |
| Soft / valgt | `#f3f3f3` (`--ew-sidebar-active`, `--ew-surface-2`) | `--color-neutral-100` = `#f7f7f7`; secondary bg = `neutral-100` | **⛔ STRID mot hex.** Ikke bytt soft til `#f7f7f7`. |
| Felt | `#f0f0f0` | Input-felt = `background-tertiary` = `neutral-200` `#ebebeb` | **⛔ STRID.** Behold inset `#f0f0f0`. |
| Hairline | `#e0e0e0` | `--color-separator-border` = `neutral-200` `#ebebeb` | Nær. Behold `#e0e0e0`. |
| CTA | Ink `#141414` / mørkt `#ffffff`. **Aldri** blå knapp | Primary = **blå gradient** `accent-500 → accent-600` (`#3392ff` / blue-500) | **⛔ STRID. Hard.** Ikke ta Board UI-primary. |
| Aksent `#0066ff` | Kun kommersielt (Popular / savings / dagsbue-viz) | Aksent-ramp styrer CTA, fokusring, valgt nav, tabs, checkbox, switch | **⛔ STRID.** Aksent-rollen er motsatt av Endwise. |
| Aktiv nav | Canvas-soft tint. **Ingen** border-left / accent-pip | `--shadow-nav-selected`: `0 0 0 1px accent-500` + inset hvit highlight | **⛔ STRID. Hard.** Ikke blå ring på valgt dest/sidebar. |
| Radius kort | **24px** | Kort/modal: `radius/3xl` (typisk 24 i Tailwind) + `radius-2-5xl` **20px** + `radius-2lg` **10px** på knapper | Kort 24 kan beholdes. **Ikke** krymp kort til 10/20. |
| Piller | **9999** | Search default `rounded-full`; knapper `10 / 8 / 4` | Piller i chrome beholdes 9999. Knapper: se §5. |
| Typografi | Inter **650 / 450 / 300**. Tre utilities: `text-title` 16/20/650, `text-label` 13/16/450, `text-body` 17/1.38/450 | Inter **400 / 500 / 600 / 700**. 13 familier × 4 vekter. Body er **14/20** | **⛔ STRID.** Ikke bytt til 14px body eller 4 vekter. |
| Skygge | Tint-elevering. `--ew-bevel-shadow: none` | `--shadow-card`, `--shadow-sidebar`, `--shadow-dropdown`, `--shadow-xs` på knapper | **⛔ STRID mot prinsipp.** Ikke innfør skyggesystem. Unntak: fjerne *eksisterende* `shadow-lg` på profilmeny. |
| Telefon-chrome | Top-bar 1: logo **32** · søk **h-8** · Ronny **28** · profil **28**. Top-bar 2: dest-piller + hairline. Ingen sidebar | Flytende sidebar med team-meny, announcement, user-meny. Valgt = aksent-ring | **⛔ STRID mot IA.** Ingen sidebar på telefon. Ingen ny chrome-struktur. |
| Desktop | 389 / 598 / 452 | Board UI app-shell er fribredde + flytende sidebar | **⛔ STRID mot geometri.** Kolonnene røres ikke. |
| `FORHANDLER_NAV` | Destinasjoner urørt | Board UI har egen nav-katalog (Home, Chat, Calendar, …) | **⛔ STRID.** Ingen nye destinasjoner, ingen omdøping. |
| Ikoner | Lucide + egne SVG via `@endwise/ui/icons.ts` | `@remixicon/react` | **⛔ STRID mot stack.** Ikke bytt ikonsett. |
| Primitiver | Radix + shadcn + beUI | React Aria Components | **⛔ STRID mot techstack** (`docs/endwise-techstack.md`). Ny runtime-dep krever vedtak. |
| Dark canvas | `#141414` | `--color-neutral-925` = `#121212` | **⛔ STRID mot hex.** Polaritet beholdes, ikke `#121212`. |

**Konklusjon på pakkenivå:** Board UI skal **ikke** `npx boardui init` / `add` inn i Endwise. Det ville dra inn `react-aria-components`, `@remixicon/react`, blå CTA, skygger og en annen typeskala. Alt under er *mønstre å stjele* inn i eksisterende `--ew-*` / shadcn / beUI.

---

## 2. Board UI — kartlagt (kun det som er lest)

### 2.1 Hva Board UI er

React 19 + Tailwind v4-designsystem for dashboards og agent-UI. **103** frie komponenter (inkl. 19 chart-kort i katalogen; flere er Pro), **400+** semantiske tokens, Figma først. Komponenten installeres som *kilde du eier* (shadcn-schema), ikke som runtime-pakke. CLI: `npx boardui@latest init` / `add`. MCP: `https://www.boardui.com/mcp`. Ikoner: Remix Icon. A11y-motor: React Aria. Font: Inter via `--font-inter`, opsz-akse (Inter Display på store størrelser).

### 2.2 Fargeprimitiver (fra `theme.css` på /installation)

Overstyringer mot Tailwind v4-default:

| Token | Verdi |
|-------|--------|
| `--color-slate-200` | `#ebeff5` |
| `--color-neutral-100` | `#f7f7f7` |
| `--color-neutral-200` | `#ebebeb` |
| `--color-neutral-925` | `#121212` |
| `--color-blue-400` | `#3392ff` |

Aksent-ramp: `--color-accent-50` … `--color-accent-950` peker på `blue-*`. CTA, fokus, valgt nav, tabs, checkbox, switch, slider *re-tintes* ved å overstyre disse elleve. Datablå (charts, status-chips) peker bevisst på `blue-*`, ikke `accent-*`.

### 2.3 Semantiske farger (utvalg, 1:1 Figma-navn)

**Tekst (lys → mørk):**

| Token | Lys | Mørk |
|-------|-----|------|
| `--color-text-primary` | `neutral-950` | `neutral-50` |
| `--color-text-secondary` | `neutral-500` | `neutral-500` |
| `--color-text-tertiary` | `neutral-400` | `neutral-600` |
| `--color-text-disabled` | `neutral-300` | `neutral-800` |
| `--color-text-placeholder` | `neutral-400` | `neutral-400` |
| `--color-text-error-primary` | `red-500` | `red-400` |

**Flater:**

| Token | Lys | Mørk |
|-------|-----|------|
| `--color-background-full` | `white` | `neutral-925` `#121212` |
| `--color-background-primary-default` | `white` | `neutral-800` |
| `--color-background-primary-hover` | `neutral-100` | `neutral-700 / 60%` |
| `--color-background-primary-active` | `neutral-200` | `neutral-800` |
| `--color-background-secondary-default` | `neutral-100` | `neutral-900` |
| `--color-background-tertiary-default` | `neutral-200` | `neutral-800` |
| `--color-background-tertiary-error` | `red-100` | `red-950 / 60%` |

**Kanter / fokus:**

| Token | Lys | Mørk |
|-------|-----|------|
| `--color-border-button-default` | `neutral-200` | `neutral-700` |
| `--color-border-button-hover` | `neutral-300` | `neutral-500` |
| `--color-border-button-active` | `neutral-400` | `neutral-600` |
| `--color-border-error-default` | `red-500` | `red-400` |
| `--color-border-focus-ring` | `accent-500` | (arves, accent) |
| `--color-separator-border` | `neutral-200` | `neutral-800` |

**Hover / active / disabled som egne tokens** er Board UI sitt største token-fortrinn mot Endwise. Endwise har nesten bare *hvileverdier*.

### 2.4 Radius, skygge, motion (Board UI)

| Token | Verdi | Bruk |
|-------|--------|------|
| `--radius-2lg` | **10px** | Medium-knapp, segmented track |
| `--radius-2-5xl` | **20px** | Store inset-paneler / kanban |
| `--radius-notification-card` | **10px** | Toast/notification |
| `--shadow-card` | `0 1px 1px 0 rgb(0 0 0 / 0.05)` | Kort på secondary bg |
| `--shadow-dropdown` | `0 1px 1px / 0.04` + `0 4px 4px / 0.02` | Menyer |
| `--shadow-sidebar` | tre lag (1px + 12px + 1px halo) | Flytende sidebar |
| `--shadow-nav-selected` | **1px accent-500-ring** + inset hvit | ⛔ pip |
| `--button-transition-ms` | **150ms** | Farge/border |
| `--input-transition-ms` | **150ms** | Felt-ring |
| `button-press-motion` | `scale(0.98)` · farge 150ms · transform 420ms ut / 220ms inn · `cubic-bezier(0.4, 0, 0.2, 1)` | Knapper |
| Modal / Drawer | **300ms** `cubic-bezier(0.32, 0.72, 0, 1)` · start `scale 0.85` + **4px blur** · backdrop `bg-black/40` | Overlay |
| Pill-tab thumb | **300ms** `cubic-bezier(0.34, 1.2, 0.64, 1)` (overshoot) | Segment |
| Underline-tab | **200ms ease**, 2px `accent-600` | ⛔ blå strek |
| Theme reveal | **820ms** `cubic-bezier(0.16, 1, 0.3, 1)` View Transition + sirkelmaske | Tema |
| `prefers-reduced-motion` | Slide → fade, sheen → opacity-pulse, theme-reveal av | A11y |

Drawer: inset **8px telefon / 12px ≥sm**, `radius/3xl`, størrelser **320 / 400 / 600**, bottom/top **max-h 85%**.

### 2.5 Typografi (Board UI, Inter)

Composite utilities: `text-{familie}-{vekt}` setter størrelse + linjehøyde + tracking + vekt. Farge er separat (`text-text-primary`).

| Familie | Størrelse / lh | Tracking |
|---------|----------------|----------|
| Large Title | 64 / 80 | 0 |
| Display 1–4 | 56/72 · 48/64 · 40/54 · 32/44 | 0 |
| Title 1–3 | 24/34 · 20/26 · 18/24–26 | 0 |
| Headline | 16 / 22 | 0 |
| Body | **14 / 20** | 0 |
| Body 2 | **13 / 18** | 0 |
| Caption 1 | **12 / 16** | **0.15px** |
| Caption 2 | **11 / 15** | **0.2px** |

Vekter: Regular 400 · Medium 500 · Semibold 600 · Bold 700.  
Label på Input: Body Medium 14/20. Hint: Caption 1 Medium 12/16.

### 2.6 Komponent-API-er (frie, kilde-lest)

**Button** (`variant` × `size`, `leadingIcon` / `trailingIcon` som *komponentreferanse*, `iconOnly` krever `aria-label`):

| Size | Høyde | Radius | Ikon | Tekst |
|------|-------|--------|------|-------|
| medium (default) | **36** | 10 (`rounded-2lg`) | 20 | Body Medium 14/20/500 |
| small | **32** | 8 | 18 | Body Medium |
| xs | **24** | 4 | 14 | Caption 1 Semibold |

Varianter: `primary` (blå gradient + `shadow-xs`) · `secondary` (hvit + hairline) · `ghost` (accent-100 flate) · `danger` (rød gradient). `ButtonLink` er `<a>`-tvilling.

**Input:** React Aria `TextField`. `size` medium **36** / small **32**. Felt `rounded-2lg` (10), `ring-2 ring-inset` (transparent → hover `border-button-hover` → fokus `border-button-active`). API: `label`, `hint`, `errorMessage`, `leadingIcon`, `trailingIcon`, `leadingAddon`, `isRequired`, `isInvalid`, `isDisabled`. Hint byttes mot error når invalid. Label + input + hint er `aria-labelledby` / `aria-describedby`.

**Search Field:** Input-skall + søkeikon 20px + `CloseButton` som *fader inn* (150ms, `scale-50 → 100`) når det er tekst. Escape tømmer. `isLoading` kryssfader ikon → Spinner (200ms). `shape`: `pill` (default) eller `rounded`. Størrelse 36 / 32.

**Input OTP:** En boks per siffer, `size-12` (48), `rounded-2lg`, mono `text-title-3-medium`. Paste + autofill fordeles. `length` (default 6), `groupEvery`, `onComplete`, `isInvalid`. Hver boks `autoComplete="one-time-code"`.

**Modal:** Header (tittel + beskrivelse + close) · scroll-body · footer-actions. Enter: 300ms, scale 0.85 + 4px blur. `AlertDialog` for destruktiv bekreftelse, `pendingLabel` mens promis-en kjører.

**Drawer:** Samme header/body/footer som Modal. `placement` start/end/top/bottom (logisk, følger leseretning). Backdrop `bg-black/40`.

**Skeleton:** Blokk tintet `text-primary/8` (synlig på alle flater). Sheen i `.bui-skeleton`. `shape` rect (radius 12) / text (6) / circle. `isLoaded` kryssfader + skjerper fra 4px blur (300ms). `SkeletonText lines={n}` — siste linje 60 %. Regionen merkes `aria-busy`.

**Tabs:** Underline (2px `accent-600` som *glir* 200ms) + count-badge. Pill-tabs med glidende thumb. ⛔ underline er blå.

**Segmented Control:** Track `p-1` `rounded-2lg` (10) `bg-segmented-control-background`. Thumb `rounded-md` (6) `shadow-2xs` 200ms ease. React Aria `ToggleButtonGroup`, `disallowEmptySelection`. Variant `solid` | `plain`.

**Table:** React Aria Table, størrelse `md` (rader **h-16** = 64) / `sm` (**h-12** = 48). Stil i `.bui-table`. Data Table (TanStack) er eget item.

**Toast:** `toast.success/info/error`, `toast.update`, `toast.dismiss`. `<Toaster limit={3} duration={5000} />`. Pause på hover/fokus. `aria-live="polite"`. Bygget på Notification-kort.

**Chip:** `bold` / `subtle` / `caption`, radius **6px**, farger lime/rose/yellow/cyan/blue/purple/neutral (status-par med egne dark-tokens).

**Theme Toggle:** ⛔ *ingen* `prefers-color-scheme` — kun manuell light/dark + localStorage. View Transition-sirkel 820ms. Segmentert (sol/måne) eller switch-rad. Endwise har tre modi (Lyst / Mørkt / System) — **behold tre**, stjel ev. reveal.

**Sidebar (katalog + kilde):** Flytende panel, team-meny, announcement, user-meny, ThemeToggle. Valgt rad = aksent-ring. ⛔ Ikke telefon-modell, ikke 389-låsen.

### 2.7 Frie komponenter i registry (navn, ikke alle kilde-lest)

`theme`, `typography`, `globals`, `cx`, `direction`, `modal`, `drawer`, `popover`, `combobox`, `toast`, `accordion`, `spinner`, `progress`, `meter`, `skeleton`, `command-palette`, `context-menu`, `search-field`, `number-field`, `time-field`, `tag-group`, `date-calendar`, `color-picker`, `tree-view`, `button`, `icon-button`, `link-button`, `button-group`, `close-button`, `input`, `textarea`, `checkbox`, `checkbox-card`, `radio`, `radio-card`, `switch`, `switch-card`, `theme-toggle`, `select`, `slider`, `social-button`, `dropdown`, `divider`, `file-upload`, `tabs`, `table`, `tooltip`, `badge`, `chip`, `status-dot`, `avatar`, `breadcrumb`, `pagination`, `carousel`, `input-otp`, `segmented-control`, `announcement`, `notification`, `kbd`, `date-picker`, `date-range-picker`, `meeting-scheduler`, `agent-runtime`, `agent-chat`, `agent-thinking`, `composer-loader`, `sidebar`, `settings-modal`, `auth-card`, `notification-center`, `data-grid`, `data-table`, `stat-cards`, `revenue-chart-card`, `orders-chart-card`, `important-alerts-card`, `patient-info-card`, `app-shell`.

**Ingen egen «EmptyState»-komponent** i den frie katalogen. Tom-illustrasjoner finnes som tokens på Project Board (`--color-project-board-empty-*`) — Pro / ikke kilde-lest.

### 2.8 Pro (kun katalog — ikke kilde)

Composer / Composer Panel / Attachments, Agent Progress, Task List, Web Search, Questionnaire, Calendar (måned + event-chips), 15+ chart-kort, Project Board, Multi-agent Chat, 10 templates. **Ikke anbefalt å kjøpe inn** uten stack-vedtak. Mønstrene (composer-status, sliding questionnaire, empty-illustration) kan etterlignes i eksisterende Ronny/PromptInput/Amicro.

---

## 3. Endwise i dag — kartlagt

### 3.1 Tokens (`packages/widget-tokens/src/tokens.css` + `packages/ui/src/theme.css`)

| Rolle | Lys | Mørk | Utility |
|-------|-----|------|---------|
| Canvas | `#ffffff` | `#141414` | `bg-bg` |
| Soft / valgt | `#f3f3f3` | `#262626` | `bg-sidebar-active` · `bg-surface-2` |
| Felt | `#f0f0f0` | `#262626` | `bg-inset` · `.ew-felt` |
| Hairline | `#e0e0e0` | `#262626` (= flate — **forsvinner**) | `border-border` |
| Sterk kant | `#e0e0e0` | `#3d3d3d` | `border-border-strong` |
| Ink | `#141414` | `#ffffff` | `text-fg` |
| Muted | `#707070` | `#adadad` | `text-fg-muted` |
| Faint | `#adadad` | `#707070` | `text-fg-faint` · `.ew-haarlinje` |
| CTA | `#141414` | `#ffffff` | `--ew-ink-utility` / `--primary` |
| Aksent | `#0066ff` | `#0066ff` | `--ew-accent` — kun Popular/viz |
| Fokus | `#141414` | `#ffffff` | `--ew-focus` / `--ring` |
| Danger / warn / success | `#c8332b` / `#b45309` / `#15b042` | lysere / `#15b042` | |

**Mål:** kontroll 32 · rad 40 · stores-rad 44 · badge 20/6 · switch 24×14/10 · felt-radius 16 · kort 24 · pille 9999. Spacing 4/8/12/16/24/32.

**Typeskala (kanon):** `text-title` 16/20/650 · `text-label` 13/16/450 · `text-body` 17/1.38/450. Inter variabel. **300 er spesifisert men har ingen utility** — landing bruker `font-[300]` ad hoc.

**Hull mot Board UI:** ingen hover/active/disabled/error-* tokens for flate/kant. Ingen `--ew-space` i praktisk bruk på felt-states. Mørk `--ew-border` = `--ew-surface` (`#262626`) — hårlinje dør; workaround `.ew-haarlinje` bruker `--ew-fg-faint`.

**Felt:** `.ew-felt` inset, 2px transparent border, fokus **`#ffffff`** (hardkodet, ikke `--ew-focus`). Variantar `FELT_LG` 52/17 · `FELT_MD` 40/17 · `FELT_SM` 32/16.

### 3.2 `@endwise/ui` (`docs/UI-PAKKER.md`)

| Lag | Hva |
|-----|-----|
| Struktur | shadcn New York: `Button`, `Badge`, `Dialog`, `DropdownMenu`, `Switch` |
| Tilstand | beUI `MotionButton` / `StatefulButton` + `ease.ts` |
| Chat | `Message`, `PromptInput`, matrix-loaders |
| Charts | Amicro dither (ikke dither-kit) |
| Identitet | bloub `Avatar` / `RonnyBot` |
| Ikoner | lucide + 62 egne SVG |
| **Ikke hentet** | shadcn `table`, `sheet`, `tabs`, `calendar`, `form`, `select`, `command`, `input`, `checkbox` |
| **Paralleller** | F0-12 `Btn` / primitiv-`Badge` / `Chip` / `Card` / `Input` lever ved siden av shadcn |

**Motion vi allerede har** (`packages/ui/src/lib/ease.ts`) — *samme kurve som Board UI drawer*:

| Token | Verdi |
|-------|--------|
| `EASE_OUT` | `[0.16, 1, 0.3, 1]` (= Board theme-reveal) |
| `EASE_DRAWER` | `[0.32, 0.72, 0, 1]` (= Board modal/drawer) |
| `SPRING_PRESS` | 500 / 30 / 0.6 |
| `SPRING_PANEL` | 420 / 40 / 0.5 |

**Ikke brukt konsekvent:** Ronny-sheet bruker `EASE_DRAWER` i 200ms (Board bruker 300ms + blur). De fleste tom-lister har null motion. Dialog har ingen enter-animasjon.

### 3.3 Telefon-chrome (urørt struktur)

`apps/web/app/(app)/_shell/phone-shell.tsx` + `phone-chrome.ts`:

| Element | Mål | Fil |
|---------|-----|-----|
| Top-bar 1 | `h-row` 40 · `gap-2` · `px-3` | `phone-shell.tsx` |
| Logo | **32×32** `bg-fg` mask | `PHONE_LOGO_PX` |
| Søk | `.ew-felt-sm` **h-8** · ikon 16 · `text-label` | `phone-sok-felt.tsx` |
| Ronny | **size-7 / 28** · `RonnyBot` 44 | `PHONE_AVATAR_PX` |
| Profil | **28** `.ew-profil-sirkel` | samme |
| Top-bar 2 | `PHONE_BAR2` `py-2.5` · piller `h-8 rounded-full px-3 text-label` · aktiv `bg-sidebar-active` | dest fra `FORHANDLER_NAV` |
| Hairline | `h-px bg-border` | under bar 2 |
| Side-under | tittel `text-title` · underline-faner `border-b-2` | `PHONE_SIDE_UNDER` |

**Søk-overlay** (`phone-sok-overlay.tsx`): `z-80`, Avbryt, nylige `h-11`, dest-ikoner `size-11`, tom «Ingen treff». Ingen tøm-knapp, ingen spinner-ikon.

**Profilmeny** (`phone-profil-meny.tsx`): 260px, `rounded-[16px]`, **`shadow-lg`** (⛔ mot tint-regel), «Ditt abonnement» **`bg-[#0066ff]`** (⛔ CTA-lås — `#0066ff` er kommersielt, men her er det en knapp). Modus = 3 segmenter (`phone-tema-rad.tsx`).

**Ronny-sheet** (`ronny-sheet.ts` + `workshop-bloub.tsx`): 80/100 dvh, radius **16** topp, scrim `bg-fg/25`, høyde 200ms `EASE_DRAWER`. Desktop-panel max **400px**.

### 3.4 Desktop (urørt geometri)

`desktop-shell.ts`: sidebar **389** (chrome 275 / inner 259) · boks 2 **598×53** top-bar · boks 3 **452×53** standby. Aktiv rad = `bg-sidebar-active`, ingen pip. Oppgrader = Galaxy + `bg-primary` (ink), desktop 233×52.

### 3.5 Produktflater (kort)

| Flate | Mønster i dag | Fil-anker |
|-------|----------------|-----------|
| **Pulse / hjem** | Kort 24, hero `bg-surface-2`, ikonplate **alltid `#ffffff`**, PPF `text-[28px] font-semibold`, dagsbue Amicro `#0066ff`, Analyser to bokser | `_shell/pulse-kort.tsx` |
| **Innboks** | Settings-chrome + top-bar 2 (Ny melding · Sortering · Slett). Rader `border-b py-4`. Tom: ikon 56 + `Button`. Composer = `PromptInput` + `StatefulButton` | `innboks/_chrome.tsx`, `_top-bar2.tsx` |
| **Timeplan / Jobber / Endringer** | `SideChromeSkall` underline. `/jobber` = `/saker`. Endringer = Avvik \| Forespørsler | `jobber/`, `saker/` |
| **Kunder** | `SideChromeSkall` + `PhoneSokFelt` + `SorteringArk` + tabell-liste + `InnstillingRad`-skjema | `kunder/` |
| **Organisasjon** | `OrgRad` ≈ innstillingsrader. `FELT_MD` + `StatefulButton` | `organisasjon/` |
| **Lager** | Egen `max-w-[1000px]` (ikke SideChrome). Tabell + custom modal `bg-black/40` | `lager/` |
| **Butikk** | Samme tabell som lager. `Button variant="outline"` (avvik). Widget-embed | `butikk/` |
| **Ny jobb** | `InnstillingSeksjon` + `FELT_MD` + `aria-pressed`-rader + `StatefulButton` | `bookinger/ny/page.tsx` |
| **Sign-in** | Ingen kort. `FELT_LG` 52. Labels `text-[15px]`. `StatefulButton` `py-5`. 5-sifret kode i *ett* felt (ikke OTP-bokser) | `_auth/felter.tsx`, `signin/` |
| **Landing** | Hero 44/64 `font-[650]`, ingress `font-[300]`. Kort 24. CTA ink-pille. `#0066ff` kun Popular | `_markeds/` |
| **Widget** | Inline `--ew-*`, radius-fallback **12**, input radius **8**, faner 2px `--ew-accent` (blå underline — ⛔ i produkt, OK i embed?) | `packages/widget-ui` |
| **Innstillinger** | Speiler SideChrome. Konto-rader. Destruktiv `bg-danger`. Team = Dialog 420 | `innstillinger/` |

### 3.6 Tom / loading i dag

Ingen felles `Tomt`/`Laster`/`Feil`. Kopier: `kunder/_delt.tsx` ≈ `lager/_delt.tsx` (CardShell `p-10`). Innboks: 56px-ikon. Pulse: `animate-pulse bg-border`. Timeplan: «Laster timeplan …» `text-body`. Mange `text-[12px]`-linjer uten `role="status"` / `aria-busy`.

### 3.7 Dark mode-hull (konkrete)

| Sted | Problem |
|------|---------|
| `--ew-border` mørk `#262626` | = surface. Hairline usynlig. |
| `.ew-felt:focus` `#ffffff` | Hardkodet. |
| `pulse-kort.tsx` ikonplate | Alltid `#ffffff` / `#141414`. |
| `phone-home-pulse.ts` | Hairline `#e0e0e0`, spark `#141414` uten dark-variant. |
| `phone-profil-meny.tsx` | `bg-[#0066ff] text-white` CTA. |
| Dialog overlay | `bg-black/25` (Board: `black/40` — vi kan tokenisere, ikke kopiere hex). |
| Switch-thumb | `bg-white` hardkodet. |
| `SorteringArk` scrim | `bg-transparent` — ingen dimming, ingen fokusfelle. |

---

## 4. Komponent for komponent

Innsats: **S** = isolert token/CSS eller én fil · **M** = flere kallsteder, samme mønster · **L** = ny primitiv + migrering.  
Risiko: **lav** = innenfor Mobbin · **midt** = a11y/fokus · **høy** = IA/stack/låst chrome.

| Endwise i dag | Board UI-ekvivalent | Konkret forbedring (innenfor lås) | Innsats | Risiko |
|---------------|---------------------|-----------------------------------|---------|--------|
| `--ew-*` hvile-tokens | Semantisk hover/active/disabled/error + secondary/tertiary flater | Legg `--ew-surface-hover`, `--ew-border-hover`, `--ew-border-error`, `--ew-fg-disabled` i `tokens.css`. Ikke ny hex-palett — utled av ink/soft/hairline. | S | lav |
| `text-title/label/body` + ad hoc `text-sm`/`text-[12px]`/`font-semibold` | Composite `text-body-medium` osv. | **Ikke** 13×4-skala. Håndhev de tre. Ev. *én* ny: `text-meta` = 12/16/450 (erstatter `text-[12px]`). Landing `font-[300]` → dokumenter som `text-display` uten å åpne 400/500/600/700. | S | lav |
| shadcn `Button` pill 32 `text-label` + `StatefulButton` + F0-12 `Btn` | Button 36/32/24, ikon-props, press 0.98 | Behold 32 / 9999 / ink. Stjel `leadingIcon`/`trailingIcon` + `iconOnly` krever `aria-label`. Utfas `Btn`. Press: bruk `SPRING_PRESS` / `button-press-motion`-idé uten blå gradient. | M | lav |
| Egne piller `h-control rounded-control border` overalt | `Button variant="secondary"` | Én `SekundærPille` (allerede nesten `Button outline`) — slutt å kopiere klassestreng. | M | lav |
| `.ew-felt` uten label/hint/error-API | Input `label`+`hint`+`errorMessage` | Utvid primitiv-`Input` med de tre + `aria-describedby`. Behold `FELT_*` / radius 16 / inset `#f0f0f0`. Fokus = `--ew-focus` (ink), **ikke** hvit 2px og **ikke** `accent-500`. | M | midt |
| `PhoneSokFelt` h-8, ingen tøm/loading | Search Field (pill, clear fade, spinner, Escape) | **Behold h-8, radius 16, inset.** Legg tøm-knapp (fade) + `isLoading` på ikonplass + Escape. Overlay uendret i IA. | S | lav — telefon, samme utgangspunkt |
| Sign-in 5-siffer i ett `FELT_LG` | Input OTP, `length={5}` | Fem Mobbin-bokser (inset, 16 radius, Inter 17/450, ikke 48/mono/10-radius). Paste/autofill-logikk stjeles. | M | lav |
| Native `<select>` / radio-piller | Select, Radio, Checkbox, Number Field | Hent **shadcn** `select`/`checkbox` (allerede i «kan hentes»), styled til `.ew-felt`. Ikke React Aria. | M | midt |
| shadcn `Dialog` uten motion, overlay `black/25` | Modal 300ms scale 0.85 + 4px blur, header/body/footer | Animer eksisterende Dialog med `EASE_DRAWER` 300ms + blur. Tokeniser scrim `--ew-scrim`. Alert-mønster til slett-forhandler / slett-tråd. **Ikke** 10px radius. | S | lav |
| Ronny-sheet + `SorteringArk` + lager-modal (egne) | Drawer 80/100, 300ms, 4px blur, 320/400/600 | Behold 80/100 og 16-radius. Hev 200→300ms + blur-in. `SorteringArk`: dimmet scrim + fokusfelle (i dag transparent). Ikke vaul, ikke ny dest. | M | midt på z-index (header og scrim begge z-60) |
| `SideChromeSkall` / Innboks / Innstillinger underline `border-b-2 border-fg` | Tabs med *glidende* 2px underline | Behold **ink**-underline (⛔ ikke `accent-600`). Legg thumb som glir 200ms `EASE_OUT`. Samme API (`?fane=`). | M | lav |
| Dest-piller + `NySamtaleKnapperad` + `PhoneTemaRad` | Segmented Control / PillTabList med glidende thumb | Glidende **canvas-soft** thumb (⛔ ikke blå). Telefon dest-piller: samme h-8 / `rounded-full` / `FORHANDLER_NAV`. | S | lav — kun polish |
| `kunder/_delt` + `lager/_delt` + innboks-tom | *(ingen Empty-item; Skeleton + illustration-tokens)* | Én `TomtFlate` / `LasterFlate` / `FeilFlate` i `_shell`. Ikon + `text-body` + valgfri ink-CTA. `aria-live`. | S | lav |
| `animate-pulse bg-border` | Skeleton sheen + `isLoaded` blur-in | Egen `.ew-skjelett` med `text-fg/8` + sheen. Pulse-tall, innboks-liste, kunder-tabell. | S | lav |
| Native `<table>` kopiert 5 steder | Table `sm` 48 / `md` 64 + Data Table | Én liste-rad: `h-row-store` 44, `rounded-xl`, header `text-meta`. Valgfritt hent shadcn `table`. Ikke 64px-rader (for høyt mot Mobbin 40/44). | M | lav |
| Ingen toast | Toast + Notification | beUI har `animated-toast-stack` i «kan hentes». Alternativ: tynn `toast()` over eksisterende `Badge`/kort, `aria-live`. Brukes etter lagre (org, kunde, lager). | M | midt (ny flate — ikke ny dest) |
| `Badge` 20/6 rød «Ny» + `CountBadge` | Chip + Badge + Kbd | Behold rød Ny (eier-lås). Stjel *status-par* for lime/rose som **tokens** til KPI-delta (Analyser allerede grønn/rød). Ikke 10 farger på chips. | S | lav |
| `TemaToggle` 2-veis + `PhoneTemaRad` 3-veis | Theme Toggle 2-veis + 820ms reveal | **Behold System.** Stjel View Transition-sirkel (820ms `EASE_OUT`) på begge. Segment-thumb som Board `sidebar-segmented`, men canvas-soft / ink-ikon. | S | lav |
| ⌘K på `Dialog` | Command Palette (React Aria Autocomplete) | Polish eksisterende Dialog: seksjoner, `Kbd`, skjelett. Ikke cmdk (forbudt tidligere). | M | midt |
| Dropdown 24 radius, items `h-row rounded-control` | Dropdown / Context Menu | OK. Stjel ikon+snarvei-rad og `useDismiss`. Ikke 10px. | S | lav |
| Switch 24×14 ink-track | Switch (skeuomorf, 2 størrelser) + Switch Card | Behold ink-track. `SwitchCard` = InnstillingRad + Switch (varsler). | S | lav |
| Timeplan egen kalender 07–18 | Date Calendar / Date Picker / Meeting Scheduler | Ikke bytt verksted-raster. Stjel «i dag»-markør + disabled-dager til starttid-velger. | L | midt |
| Innboks egen liste | Notification Center (tabbet feed) | Mønster: grupperte uleste, inline actions. Ikke erstatt innboks. | L | høy hvis IA røres |
| Ronny `PromptInput` | Composer / Composer Loader / Agent Thinking (**Pro**) | Stjel: rim-loader mens stream, elapsed på «tenker», stop-knapp. Ikke model-picker / vedlegg (Mikael-forbud). | M | midt |
| Amicro dither-kort | Stat Cards + Revenue/Orders Chart (**delvis Pro**) | Behold Amicro. Stjel count-up + delta-chip-layout på Analyser — uten nye graftyper. | S | lav |
| `Avatar` bloub | Avatar (initialer/bilde) + Agent Avatar (**Pro**) | Ikke bytt bloub. | — | — |
| Ikon-barrel lucide | Remixicon | Ikke bytt. | — | — |
| Widget inline styles | Auth Card / Input | Harmoniser widget-radius til 16/24 via tokens (fallback er 12/8). Fane-underline: ink, ikke `--ew-accent`. | S | lav |
| `min-dag` knapper `h-10 rounded-md bg-primary` | Button small | Rett til `h-control rounded-pill` — ren konsistens. | S | lav |

---

## 5. Anbefalinger gruppert

Hver gruppe sier **hva vi tar**, **hva vi ikke tar**, og **hvor det lander**.

### 5.1 Farger / tokens

**Ta:** Et *state-lag* oppå Mobbin-hex: `--ew-surface-hover`, `--ew-surface-active`, `--ew-border-hover`, `--ew-border-error`, `--ew-fg-disabled`, `--ew-scrim` (f.eks. `color-mix(ink 25%, transparent)`). Rett mørk hairline: `--ew-border` mørk skal ikke være `#262626`.  
**Ikke ta:** `#f7f7f7`, `#121212`, `#3392ff`, accent som CTA/fokus/pip, skygge-tokens, 400+ Figma-navn.  
**Filer:** `packages/widget-tokens/src/tokens.css`, `packages/ui/src/theme.css`, `packages/widget-tokens/test/tokens.test.ts`.

### 5.2 Typografi og tekstvisning

**Ta:** Disiplin. Drep `text-sm` / `font-semibold` / `text-[12px]` i produktflater. Innfør `text-meta` (12/16/450, tracking 0 — ikke Board 0.15). Bruk `text-title` der titler i dag er `text-[16px] font-[650]`. Landing 44/64 + `font-[300]` får egne utilities uten å åpne 13 trinn.  
**Ikke ta:** Body 14, vekter 400/500/600/700, Caption-tracking.  
**Filer:** `theme.css` `@theme`, `message.tsx` (`text-sm`), `_auth/felter.tsx` (`text-[15px]`), pulse `font-semibold`.

### 5.3 Knapper / kontroller

**Ta:** Ikon-API + `aria-label` på icon-only. Felles sekundærpille. Press-motion fra `ease.ts`. Utfas `Btn`. Rett `min-dag` `rounded-md`.  
**Ikke ta:** Blå/rød gradient, 36px som default, 10px radius, `shadow-xs` på CTA.  
**Filer:** `packages/ui/src/components/button.tsx`, `primitives/btn.tsx`, kallsteder med `inline-flex h-control rounded-control`.

### 5.4 Kort / flater

**Ta:** Ett kort-skall: 24 radius, `bg-card`, hairline eller tint, `shadow-none`. Pulse-ikonplate: token `bg-bg` / `text-fg` i *light-locked* klasse (bevisst hvit på hjem — dokumenter, ev. `canvas` i begge temaer).  
**Ikke ta:** `shadow-card`, 20px kanban-radius, farget border-left.  
**Filer:** `phone-kort.tsx`, `pulse-kort.tsx`, `CardShell`.

### 5.5 Lister / tabeller

**Ta:** Felles `ListeTabell` (header 12/450 muted, rad 44, hover `bg-surface-2`). Sorterbare kolonner senere via shadcn `table`.  
**Ikke ta:** 64px-rader, Data Grid, CSV/undo.  
**Filer:** `kunder/_delt.tsx`, `lager/deler/page.tsx`, `butikk/page.tsx`, `innstillinger/team/_liste.tsx`.

### 5.6 Sheets / dialoger

**Ta:** 300ms `EASE_DRAWER` + 4px blur på Dialog og Ronny-sheet. Token-scrim. Sortering/profil: synlig scrim + Escape + fokusfelle. AlertDialog-mønster for slett.  
**Ikke ta:** 10px modal, 12px inset «floating» panel som ny chrome, vaul, shadcn Sheet som erstatning for telefon top-bar.  
**Filer:** `packages/ui/src/components/dialog.tsx`, `ronny-sheet.ts`, `sortering-ark.tsx`, `phone-profil-meny.tsx`, `lager/deler/_bevegelse-dialog.tsx`.

### 5.7 Navigasjon

**Ta:** Glidende soft-thumb på dest-piller og underline-faner (ink/soft). `Kbd` på ⌘K.  
**Ikke ta:** Flytende sidebar, team-meny, announcement-footer, aksent-ring, nye destinasjoner, telefon-sidebar. Desktop 389/598/452 urørt.  
**Filer:** `phone-shell.tsx`, `side-chrome-skall.tsx`, `innboks/_top-bar2.tsx`, `sidebar.tsx` (kun rad-hover-token).

### 5.8 Animasjoner / motion

**Ta:** Bruk `ease.ts` overalt. Modal/drawer 300ms. Segment-thumb 200–300ms. Theme View Transition 820ms `EASE_OUT`. Skeleton sheen. `prefers-reduced-motion` som Board (fade, stop sheen).  
**Ikke ta:** Overshoot-fjær på dest-piller som gjør chrome «sprettete». Galaxy/Grainient tilbake på Ronny.  
**Filer:** `ease.ts` (allerede), `globals.css`, Dialog, Ronny, `tema-*.tsx`.

### 5.9 Tomtilstander / loading

**Ta:** `TomtFlate` + `LasterFlate` + `FeilFlate` + `.ew-skjelett`. Innboks / kunder / lager / timeplan / butikk bytter til samme. `aria-busy` / `role="status"`.  
**Ikke ta:** Project Board-empty-illustrasjon som ny merkevare. Matrix-loaders på vanlige lister (de er AI-venting).  
**Filer:** ny `_shell/tom-flate.tsx`; slett duplikat i `kunder/_delt` og `lager/_delt`.

### 5.10 Ikoner

**Ta:** Strammere bruk: 16 chrome, 18 rader, 20 dest-overlay, 22 pulse — allerede delvis slik. Egne chevron-strokes (Board har egne chevrons) kan speiles i `icons.generated` hvis lucide-chevron ikke matcher 1.75.  
**Ikke ta:** Remix Icon.  
**Filer:** `packages/ui/src/icons.ts`.

### 5.11 Dark mode

**Ta:** Synlig mørk hairline (`#3d3d3d` eller faint). Felt-fokus = `--ew-focus`. Pulse-dither-farger som tokens med dark-par. Profil-CTA: ink eller Existing Galaxy-pille — **ikke** `#0066ff` som knapp. Theme-reveal.  
**Ikke ta:** Board `#121212`, «ingen system-tema», `dark:` per komponent.  
**Filer:** `tokens.css` mørk-blokk, `pulse-kort.tsx`, `phone-profil-meny.tsx`, `tema-provider`.

### 5.12 Tilgjengelighet

**Ta:** Input-assosiasjon (label/hint/error). Search Escape + tøm utenfor tab-rekkefølge. Toast `aria-live`. Skeleton `aria-busy`. Modal fokusfelle (Dialog har det; SorteringArk har det ikke). `iconOnly` + `aria-label`.  
**Ikke ta:** React Aria som ny motor — Radix dekker dialog/menu/switch.  
**Filer:** `sortering-ark.tsx`, `Input`, `phone-sok-felt.tsx`, Dialog.

### 5.13 Duplikater / opprydding

| Duplikat | Gjør |
|----------|------|
| `Btn` vs `Button` vs `MotionButton` | Utfas `Btn`. `Button` = statisk, `StatefulButton` = lagre/send. |
| Primitiv-`Badge` vs shadcn `Badge` | Primitiv er allerede ute av barrel — slett eller intern-only. |
| `kunder/_delt` ↔ `lager/_delt` | Én modul. |
| `OrgRad` ≈ `InnstillingRad` | Én rad-API. |
| `PhoneKort` (mekaniker) vs `Pulse*` | Bevisst to hjem — dokumenter, ikke merge uten Mikael. |
| Underline-faner × 4 skall | Én `UnderstrekFaner` med glidende ink-strek. |
| `PhoneTemaRad` vs `TemaToggle` | Del thumb-mønster; behold 3 vs 2 modi. |
| Profil `#0066ff` vs sidebar Galaxy-ink | Samme CTA-rolle, to farger — rett profil til ink/Galaxy. |
| Preview-sider som kopierer phone-bar | La dem importere `PhoneShell`, ikke duplisere mål. |

---

## 6. Prioritert rekkefølge

### Topp 10 raske gevinster (S, innenfor lås, synlig kvalitet)

1. **Synlig mørk hairline** — `--ew-border` mørk ≠ `#262626`. Én linje i `tokens.css`. Låser «dual theme» som faktisk leses.
2. **`text-meta` + slå ned `text-[12px]`/`text-sm`/`font-semibold`** i produktflater. Typografi slutter å se ut som to systemer.
3. **Søk: tøm + Escape + loading-ikon** i `PhoneSokFelt` (h-8, radius 16, inset uendret). Overlay og top-bar 1 uendret.
4. **Glidende canvas-soft thumb** på dest-piller (top-bar 2) og Modus-segment. Samme piller, mindre «hopp».
5. **Glidende ink-underline** på `SideChromeSkall` / Innboks / Innstillinger. ⛔ ikke blå.
6. **Dialog + Ronny-sheet: 300ms `EASE_DRAWER` + 4px blur-in.** Vi har kurven; vi bruker den ikke.
7. **`SorteringArk` / profil: dimmet scrim + fokusfelle.** Fjern `shadow-lg` på profil (tint-regel).
8. **Profil «Ditt abonnement»:** vekk `bg-[#0066ff]`. Bruk ink-pille eller eksisterende `OppgraderPille`.
9. **Felles `TomtFlate` / `LasterFlate` / `.ew-skjelett`.** Bytt innboks + kunder + lager i samme PR.
10. **Felt-fokus → `--ew-focus`** (ikke `#ffffff`) + `Input` med `hint`/`errorMessage`. Sign-in og Ny jobb først.

### Større løft (M/L, etter topp 10)

1. **State-tokens** (hover/active/disabled/error) gjennom `tokens.css` + knapper/felt/rader. Fundamentet Board UI har, Mobbin-farget.
2. **Én liste/tabell-primitiv** (44px) på Kunder, Lager, Butikk, Team, Kjøretøy. Deretter ev. shadcn `table`.
3. **Toast** (beUI-stack eller tynn egen, ikke sonner/cmdk) for lagre-feedback. `StatefulButton` blir ikke eneste suksess-signal.
4. **OTP-bokser** på 5-sifret innlogging (Mobbin-felt, ikke Board 48/10).
5. **Theme View Transition** (820ms `EASE_OUT`) i `TemaProvider` — Lyst/Mørkt/System beholdes.
6. **Skjema-løft:** shadcn `select`/`checkbox` hentet og kledd i `.ew-felt`. Ny jobb, lager-bevegelse, org.
7. **Ronny-tenker:** rim-loader + elapsed (Board Composer Loader / Agent Thinking som *idé*). Ingen Pro-kjøp, ingen model-picker.
8. **Widget-harmonisering:** radius 16/24, fane-underline ink, samme tom/feil-språk som appen.
9. **Utfas F0-12-duplikater** (`Btn`, død primitiv-Badge) og samle `InnstillingRad`/`OrgRad`.
10. **Kalender-polish** (i dag-markør, disabled) uten å bytte 07–18-raster eller hente Board Calendar (Pro).

---

## 7. Telefon og desktop — hva som *ikke* endres

**Telefon (kun forenkling av samme utgangspunkt):**

- Top-bar 1: logo 32 · søk h-8 · Ronny 28 · profil 28 — **målene står**.
- Top-bar 2: `FORHANDLER_NAV`-piller + hairline — **destinasjoner og plassering står**.
- Ingen sidebar, ingen tilbake-i-bar-1, ingen midtstilt logo, ingen ny dest.

Tillatte telefon-forbedringer: tøm i søk, thumb på piller, scrim på menyer, motion på sheet, token-fokus, tom-flater i *innholdet* under chrome.

**Desktop:** 389 / 598 / 452 og sidebar-innhold (275/259, nav-rader, Galaxy-CTA) står. Tillatt: hover-token, hairline, theme-reveal, dialog-motion i boks 2.

---

## 8. Stack-vedtak som *ikke* tas her

Følgende ville krevd stopp-og-spør mot `docs/endwise-techstack.md` / `docs/UI-PAKKER.md` §2:

- `npx boardui init` / `add` (skriver `react-aria-components` + Remixicon + egne `styles/*`).
- Board UI Pro-lisens.
- Ny ikonpakke.
- shadcn `command` / cmdk (tidligere avvist).
- Skyggesystem som token.

**Anbefalt holdning:** Board UI er referanse, ikke avhengighet. Alt som lander i Endwise går gjennom `--ew-*`, Inter 650/450/300, ink-CTA, tint, eksisterende shadcn/beUI.

---

## 9. Verifikasjon mot roadmap-ordlyd

Oppgaven er eier-bestilt undersøkelse, ikke et F-punkt med `status: planned`. Relaterte ferdige punkt: F0-11 (tokens, Mobbin-lås 07.09), F0-12 (primitiver — nettopp de som nå bør revurderes), F5-13 (shell). Ingen status er endret i `docs/endwise-roadmap.html`.

---

## 10. Økt-rapport

1. **Hva er gjort:** Kartlagt Board UI (docs + kilde på tokens, typografi, knapper, felt, søk, OTP, modal, drawer, skeleton, tabs, segmented, table, toast, chip, theme-toggle, sidebar, registry) og Endwise (tokens, `@endwise/ui`, chrome, alle navngitte flater). Rapport i denne fila.
2. **Hva gikk galt:** Context.dev MCP krevde auth (omgått med Board UI markdown). `sitemap.xml` 500. Pro-kilde og noen frie sider (accordion, spinner, command-palette, auth-card) er ikke kilde-lest — merket. Ingen visuell pixel-måling i nettleser.
3. **Hvilke fikser:** Ingen produktkode. Ingen stack-tillegg.
4. **Neste steg:** Hvis Mikael sier ja — start topp 10, punkt 1–3 (hairline, typografi-disiplin, søk-tøm) i en egen, liten PR. Ikke `boardui add`.
