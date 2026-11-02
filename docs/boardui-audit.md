# Board UI — innhentingsplan

**Dato:** 2. november 2026  
**Type:** Undersøkelse. Ingen `init`/`add` er kjørt. Ingen produktkode er endret.  
**Mål:** Hvilke Board UI-komponenter vi skal **hente inn** i `@endwise/ui` (registry / `npx boardui add`, kilde vi eier), hvilke av våre filer hver erstatter eller forbedrer, nøyaktig kommando, avhengigheter, stack-passform, og hvordan de restyles til Mobbin-look.  
**Relaterte roadmap-ID-er:** F0-11 (tokens), F0-12 (`@endwise/ui`), F5-13 (shell). Ingen av dem endrer status her.

**Vedtak i denne runden (Mikael):** Board UI er et komponentbibliotek vi henter inn — ikke en fargepalett å kopiere, og ikke bare «inspirasjon å stjele for hånd». Første batch installeres i en senere økt. Denne fila er planen.

---

## 0. Metode

### Hva som faktisk er lest

| Kilde | URL / sti | Status |
|-------|-----------|--------|
| Forside (hva Board UI er, MIT, CLI) | https://www.boardui.com | Lest |
| Installation + monorepo + `boardui.json` | https://www.boardui.com/installation | Lest |
| CLI (`init`, `add --yes`, `--overwrite`) | https://www.boardui.com/docs/cli | Lest |
| Registry-index | https://www.boardui.com/r/registry.json | Lest 2. nov 2026 |
| Alle 88 frie registry-items inkl. kilde | `https://www.boardui.com/r/<navn>.json` | Lastet (0 tomme) |
| Ekstrahert kilde | `/tmp/boardui-src/` (179 filer) | Lest per komponent under |
| Agent-regler Board skriver ved `init` | `rules` → `docs/agent-rules.md` | Lest |
| `theme.css` (token-navn vi må omkoble) | `theme` → `styles/theme.css` | Lest |
| Pro-lisens (sist oppdatert 31. okt 2026) | https://www.boardui.com/license | Lest |
| Vilkår (sist oppdatert 21. aug 2026) | https://www.boardui.com/terms | Lest |
| Pro-install (`init --pro`, `login`, env) | https://www.boardui.com/components/pro-installation | Lest |
| Pro-index (40 items, metadata + usage, aldri kilde) | https://www.boardui.com/r/registry-pro.json | Lest 2. nov 2026 |
| Agent Creator, Questionnaire, Getting started | `/components/agent-creator` · `/questionnaire` · `/getting-started` | Lest (docs + public usage; **ingen Pro-kilde**) |
| Agent-sett (Composer, Task List, …) | https://www.boardui.com/blog/react-design-system-for-agentic-products (28. okt 2026) | Lest |
| Pris (euro) | Samme blogg + `/blog/best-react-design-systems` | Lest. `/pricing` svarte i denne økten med forsidetekst uten beløp. |

`sitemap.xml` svarte HTTP 500. Fri katalog: `registry.json` (88). Pro-katalog: `registry-pro.json` (40: 30 komponenter/blokker + 10 maler). Getting-started sier «73 free + 30 Pro + 10 templates»; forsiden sier 103 unike — tallene stemmer når maler telles separat. **Pro-`.tsx` er ikke lastet** (krever nøkkel; vi har ikke kjøpt). Alt om API utover public usage er merket ukjent.

Context.dev MCP var `needsAuth` i denne økten; kildene over er Board UI sine egne sider + `registry-pro.json`.

### Endwise-kilder som er sammenlignet linje for linje

`packages/ui/package.json`, `components.json`, `src/index.ts`, `src/theme.css`, `src/lib/utils.ts`, `src/lib/ease.ts`, `src/components/{button,dialog,dropdown-menu,switch}.tsx`, `src/primitives/input.tsx`, `src/components/prompt-input.tsx`.  
`apps/web/package.json`, `_auth/felter.tsx`, `_shell/phone-sok-felt.tsx`, `_shell/sortering-ark.tsx`, kallsteder for `Input` / `Dialog` / `Switch` / `Field` / TOTP.  
`docs/endwise-techstack.md`, `docs/UI-PAKKER.md`.

### Hva denne fila *ikke* er

- Ikke en fargeaudit. Mobbin-låsene (canvas `#fff`, ink `#141414`, soft `#f3f3f3`, aksent `#0066ff` kun kommersielt, Inter 650/450/300, piller 9999, kort 24, tint ikke skygge, ingen accent-pip) står. De restyles *etter* `add`, de kopieres ikke inn.
- Ikke en installasjon. Kommandoene under er klare til neste økt. De er **ikke kjørt**.

---

## 1. Hva vi henter inn

Board UI er et React 19 + Tailwind v4-designsystem. Komponenten installeres som **kilde vi eier** (shadcn registry-schema), ikke som en runtime-pakke vi oppgraderer:

```bash
npx boardui@latest init
npx boardui@latest add <navn>
# eller: npx shadcn@latest add https://www.boardui.com/r/<navn>.json
```

Etter `add` ligger `.tsx` i `packages/ui`. Board UI er da ikke en avhengighet — det er kode vi redigerer.

- **Lisens (fritt):** MIT uten konto. `license`-feltet i registry-JSON er tomt; MIT står på forsiden. Pro (chart-kort, agent-maler) er lisensiert og utenfor denne planen.
- **A11y-motor:** `react-aria-components` ^1.17.0 (RAC). Det er *grunnen* til å hente dem: label↔input↔hint, `aria-invalid`/`aria-required`, fokusfelle, Escape, skjermleser, tastatur, `prefers-reduced-motion`.
- **Default-ikoner:** `@remixicon/react` ^4.9.0 i noen defaults. Produktet fortsetter med lucide. Remixicon lander i `node_modules` fordi defaults importerer den — vi bytter ikon-props etter `add`.

---

## 2. Stack-passform

| | Endwise nå | Board UI krever | Passform |
|--|------------|-----------------|----------|
| React | 19.2.7 (`apps/web` + peer `@endwise/ui`) | 19+ | Ja |
| Next | 16.2.11 App Router | «first-class», også Vite/RR/Astro | Ja |
| Tailwind | 4.3.2, `@theme` | v4 | Ja |
| PostCSS | `@tailwindcss/postcss` ^4.3.2 | `init --postcss` bare hvis Tailwind ikke kompileres | Ikke nødvendig |
| `tailwind-merge` | ^3.4.0 i `@endwise/ui` | `cx` ber om ^3.6.0 | Bump ved `add` |
| `motion` | ^12.42.2 | ^12.42.2 (toast → notification) | Allerede inne |
| Ikoner | lucide-react ^0.548.0 (kanonisk, techstack §2) | Remixicon i defaults | Avhengighet lander; produkt bruker lucide |
| Primitiver i dag | shadcn New York på `radix-ui` ^1.6.2 | RAC | **To motorer side om side** i migreringsvinduet. OK. |
| `cn()` | `src/lib/utils.ts` kjenner `text-title` / `text-label` / `text-body` | `cx` kjenner Board-composite (`text-body-medium` …) | Behold begge. Utvid `cx` med våre tre størrelser etter `add`. |

**Ny npm som første batch drar inn** (unike, verifisert mot registry-meta + rdeps):

| Pakke | Versjon i registry | Allerede hos oss? |
|-------|--------------------|-------------------|
| `react-aria-components` | ^1.17.0 | Nei — **ny** |
| `@remixicon/react` | ^4.9.0 | Nei — **ny** (defaults; ikke produkt-ikonsett) |
| `tailwind-merge` | ^3.6.0 | Ja, bump 3.4 → 3.6 |
| `motion` | ^12.42.2 | Ja, samme pin |

Ikke i første batch: `@internationalized/date` (date-picker), `@tanstack/react-table` (data-table), `recharts` / `ai` / `@ai-sdk/react` (allerede inne, men chart/agent-items hoppes over).

**Techstack-notat:** `docs/endwise-techstack.md` sier «lucide-react — eneste ikonbibliotek» og lister shadcn + beUI, ikke RAC. Å hente Board UI er et §2-vedtak (Mikael, denne runden). Når batchen kjøres: oppdater techstack + `docs/UI-PAKKER.md` i **samme økt**. Remixicon dokumenteres som transitiv default, ikke som nytt produkt-ikonsett.

**Radix vs RAC:** Dialog, dropdown og switch på Radix dekker grunnleggende open/close og `data-state`. RAC-utgavene vinner på skjema (label/hint/`aria-invalid`), SearchField (Escape tømmer, clear utenfor tab-rekkefølge, `isLoading`), Select (ListBox + tastatur), Tooltip (`aria-describedby`, Escape), Modal (`AlertDialog` + `pendingLabel` + reduced-motion + fokus tilbake), Command Palette (⌘K, piler, Enter, Escape tømmer så lukker). Vi sletter ikke Radix-filene før siste kallsted er flyttet.

---

## 3. Init — nøyaktig oppskrift (ikke kjørt)

Kjør **fra `packages/ui`**, slik CLI-docs krever for monorepo. Da lander npm-deps i `@endwise/ui`, ikke i `apps/web`.

### 3.1 `boardui.json` først

Ny fil `packages/ui/boardui.json` (ved siden av `package.json`). Aliaser peker på `@endwise/ui`, ikke Board-eksemplets `@workspace/ui`:

```json
{
  "paths": {
    "components": "src/components",
    "utils": "src/utils",
    "hooks": "src/hooks",
    "styles": "src/styles",
    "lib": "src/lib"
  },
  "aliases": {
    "components": "@endwise/ui/components",
    "utils": "@endwise/ui/utils",
    "hooks": "@endwise/ui/hooks",
    "styles": "@endwise/ui/styles",
    "lib": "@endwise/ui/lib"
  }
}
```

`styles` er `src/styles`, **ikke** `src`. Da skriver `init` `src/styles/theme.css` og `src/styles/globals.css` — de kolliderer ikke med vår `src/theme.css`. Board-komponenter lander under `src/components/base/…` og kolliderer ikke med `src/components/button.tsx` / `dialog.tsx` / `avatar.tsx`.

### 3.2 Eksporter i `packages/ui/package.json`

Legg til (samme økt som init):

```json
"./utils/*": "./src/utils/*.ts",
"./styles/*": "./src/styles/*"
```

`./components/*` og `./lib/*` og `./hooks/*` finnes allerede. `tsconfig` har allerede `"@endwise/ui/*": ["./src/*"]`.

### 3.3 Kommandoer

```bash
cd packages/ui

# 1) Tailwind-tokens, globals, cx, agent-regler.
#    --yes: installer deps, behold filer som allerede finnes, ikke spør.
npx boardui@latest init --yes

# 2) STOPP. Ikke add ennå.
#    a) Slett eller skriv om AGENTS.md + .cursor/rules/boardui.mdc
#       som init dropper (de pålegger Remixicon + Board-typeskala +
#       Board-semantikk som alwaysApply — det strider mot Endwise-regler).
#    b) Koble Board-tokens til --ew-* (se §5). Ikke importer
#       src/styles/globals.css som app-stylesheet.
#    c) Utvid src/utils/cx.ts med text-title / text-label / text-body
#       (samme felle som cn() allerede fikser).

# 3) Første batch (CLI trekker rdeps automatisk).
npx boardui@latest add --yes \
  input textarea search-field input-otp \
  checkbox radio switch select number-field \
  modal drawer tooltip toast \
  skeleton spinner \
  tabs segmented-control dropdown command-palette \
  button icon-button close-button
```

`--overwrite` brukes **ikke**. Våre eksisterende filer skal stå. Board skriver til `base/`-stier.

Uten `--yes` stopper CLI med exit 1 i agent/CI (den spør før den skriver).

### 3.4 Hva `add` faktisk skriver (inkl. rdeps)

Eksplisitt 22 navn. Registry trekker automatisk:

`avatar` (Board, under `base/avatar` — **ikke** vår bloub-`Avatar`), `chevrons`, `cx`, `direction`, `directional-icon`, `globals`, `kbd`, `notification`, `scroll-fade`, `template-copy`, `theme`, `typography`, `use-dismiss-on-outside-press`.

**Kollisjon som ikke er en kollisjon:** `toast` → `notification` → Board-`Avatar` (`src/components/base/avatar/avatar.tsx`). Vår `src/components/avatar.tsx` (bloub) er urørt. **Ikke** re-eksporter Board-avatar fra `src/index.ts`.

### 3.5 Hva vi *ikke* gjør ved init

- Ikke bytt `apps/web` layout-font-setup. Inter er allerede der; vi mapper `--font-inter` hvis Board krever det, uten å røre 650/450/300.
- Ikke `@import "@endwise/ui/styles/globals.css"` i app-CSS. Board-globals er et helt stylesheet. Vi importerer kun den **omkoblede** `src/styles/theme.css` fra vår `src/theme.css`, slik at `bg-button-primary` og `text-text-primary` finnes som utilities, men peker på `--ew-*`.
- Ikke `add --all`. 88 items inkluderer sidebar, app-shell, agent-chat, chart-kort — det er chrome- og stack-brudd.

---

## 4. Første batch — prioritert plan

Installer de 22 i **én** `add` (over), så vi får a11y-motoren én gang. **Koble til produktet** i denne rekkefølgen. Barrel (`src/index.ts`) flippes ikke i batch 1 — kallsteder importerer `@endwise/ui/components/base/…` eksplisitt til de er restylet.

### P0 — må skje før noen komponent synes

1. `boardui.json` + exports.  
2. `init --yes`.  
3. Slett/overskriv Board-agentregler.  
4. Token-omkobling §5. Uten den blir første render blå CTA, accent-fokus og Board-body 14/20.

### P1 — skjema (størst menneskelig gevinst)

| # | `add`-navn | Erstatter / forbedrer | Hva vi får som vi mangler |
|---|------------|------------------------|---------------------------|
| 1 | `input` | `packages/ui/src/primitives/input.tsx` (naken `<input>` + `FELT_MD`). Forbedrer `apps/web/app/_auth/felter.tsx` (`<label htmlFor>` uten hint/error/`aria-invalid`). Kallsteder: `signin/signin-skjema.tsx`, `2fa-oppsett/page.tsx`, `invitasjon/[token]/page.tsx`, `_shell/bytt-epost.tsx`, `endwise/forhandlere/page.tsx`, `endwise/team/page.tsx`, `integrasjoner/{quick,vegvesen}/page.tsx`, `chat/page.tsx`, `organisasjon/forhandleren/_kort.tsx`, `innstillinger/tjenestekatalog/_felter.tsx` (lokal `INPUT = FELT_MD`). | `TextField` + `Input` med `label` / `hint` / `errorMessage`. RAC setter `aria-labelledby`, `aria-describedby`, `aria-invalid`, `aria-required`. Render-prop: `isFocusWithin`, `isHovered`, `isDisabled`, `isInvalid`. `leadingIcon` / `trailingIcon` som **komponent-referanse** (lucide, ikke Remix). |
| 2 | `textarea` | Egen `<textarea>` + `FELT_*` i Ny melding / skjemaer (`innboks/_ny-samtale.tsx` m.fl.). `PromptInput` (`packages/ui/src/components/prompt-input.tsx`) **beholdes** — det er chat-composer (Enter-submit, composition-aware), ikke et skjemafelt. | Samme felt-skall som Input, `aria-invalid`, hint/error. |
| 3 | `search-field` | **Forbedrer, erstatter ikke geometrien i** `apps/web/app/(app)/_shell/phone-sok-felt.tsx`. I dag: `aria-label="Søk"`, ingen clear, ingen Escape-tøm, ingen `isLoading`. Samme mønster i kjøretøy/lager-lister med naken `Search` + `<input>`. | RAC `SearchField`: Escape tømmer, Enter → `onSubmit`, clear-knapp **utenfor tab-rekkefølge**, `isLoading` bytter ikon mot `Spinner`. **Telefon:** `size="small"` (32px = `h-8`), `shape="rounded"` (ikke default `pill`), `icon={Search}` (lucide), `clearLabel="Tøm søk"`, `aria-label="Søk"`. Logo 32 / Ronny 28 / profil 28 / dest-piller / ingen sidebar røres **ikke**. |
| 4 | `input-otp` | Naken `inputMode="numeric"` + `tracking-[0.35em]` i `signin/signin-skjema.tsx` (magic + TOTP), `2fa-oppsett/page.tsx`, `_shell/bytt-epost.tsx`, `innstillinger/team/_detaljer.tsx` (slå av 2FA), `endwise/forhandlere/page.tsx`. | Per-siffer-bokser, piltaster, Backspace som går bakover, lim inn, autofill (`autoComplete="one-time-code"` på hver boks — iOS/Chrome leverer hele koden i én boks). `onComplete`, `isInvalid`, `groupEvery`, `aria-label`. Ingen RAC-dep. |
| 5 | `checkbox` | Finnes **ikke** som primitiv. Native `<input type="checkbox">` der det brukes. | RAC Checkbox, `aria-checked="mixed"` ved indeterminate, tastatur, label via `children`. Restyle: checked-gradient → ink, ikke accent. |
| 6 | `radio` | Finnes **ikke**. Sortering-valg er `<button role="option">` i `sortering-ark.tsx` — **ikke** radio; la dem være til P2 dropdown. | `Radio` + `RadioGroup`, piltaster i gruppa, `aria-*`. |
| 7 | `switch` | `packages/ui/src/components/switch.tsx` (Radix, 24×14, ink-track). Kallsteder: `innstillinger/varsler/_innhold.tsx`, `endwise/innstillinger/page.tsx`, `bot/page.tsx`, `_shell/profil-kort.tsx` (cuelume). | RAC Switch (tastatur, `aria-checked`, valgfri label). **Mål etter restyle:** 24×14 / thumb 10 — *ikke* Board-default sm 28×16 / md 42×24 / lg 56×32. På-state = `--ew-switch-track-on` (ink), ikke blå gradient + chip. |
| 8 | `select` | Finnes **ikke**. Native `<select>` / egen knapp+liste. | RAC Select + ListBox + Popover. Tastatur, typeahead, `aria-labelledby`. Restyle: ink-fokus, ingen skygge, lucide-chevron via `chevrons` eller egen `ChevronDown`. |
| 9 | `number-field` | `inputMode="numeric"` i kapasitet, kompetanse, tjenestekatalog, team. | RAC `NumberField`, stepper, locale, `aria-*`. Default stepper-ikon er Remix — bytt. |

### P2 — overlay og tilbakemelding

| # | `add`-navn | Erstatter / forbedrer | Hva vi får |
|---|------------|------------------------|------------|
| 10 | `modal` | `packages/ui/src/components/dialog.tsx` — tynn Radix, **uten** posisjonering/header/footer/`AlertDialog`/pending (kommentaren sier bevisst: kommandopalett skal ligge øverst). Kallsteder: `innboks/_inviter-ansatt.tsx`, `organisasjon/_ansatte.tsx`, `organisasjon/_opprett-dialog.tsx`, `innstillinger/team/_detaljer.tsx` (slå av 2FA), `lager/deler/_bevegelse-dialog.tsx`. Behold Radix-`Dialog` til kommandopaletten er på Board. | Fokusfelle + restore, `isDismissable`, Escape, `role="alertdialog"` på `AlertDialog`, `pendingLabel` + `aria-busy`, reduced-motion (fade uten scale/blur). Easing `cubic-bezier(0.32,0.72,0,1)` = vår `EASE_DRAWER`. Restyle: `rounded-3xl` (24) ok; `bg-black/70` → vår scrim; `shadow-xs` → `none`; CTA ink. |
| 11 | `drawer` | Ingen felles drawer. Telefon-sheets (Ronny, ev. profiler) er app-komposisjon. **Ikke** `sortering-ark` — det er et lite panel under en knapp, ikke et slide-in. | Samme RAC-modal-motor, slide + reduced-motion. Brukes når vi trenger ekte sheet, ikke til Sortering. |
| 12 | `dropdown` | Forbedrer `packages/ui/src/components/dropdown-menu.tsx` (Radix, rader 40 / radius 10 / label 13/16 — behold målene). **Erstatter oppførselen i** `apps/web/app/(app)/_shell/sortering-ark.tsx`: Escape + gjennomsiktig scrim, `role="dialog"`, **ingen** fokusfelle, ingen restore, `role="option"` uten listbox. | RAC Dialog + Popover, fokus inne, restore, outside-press via `use-dismiss-on-outside-press`. Visuelt: 16px radius, `shadow-none`, `text-label`, ingen «Sortering»-heading. |
| 13 | `tooltip` | Finnes **ikke** i produkt (dither-kit-tooltip er avstengt). | Hover **og** fokus åpner, Escape lukker, `aria-describedby` på trigger, collision flip. Restyle: `text-label`, ingen `shadow-dropdown`, caret ok. Trigger må være focusable (Board-`Button` eller `useFocusable`). |
| 14 | `toast` | Finnes **ikke** (ingen sonner/toast). | `toast.success/error/update/dismiss`, `<Toaster />` som polite live region (error = alert), countdown pauser ved hover/fokus. Drar `notification` + `motion` (allerede inne) + Board-`avatar` (ikke eksporter). Status-ikoner er Remix — bytt til lucide etter `add`. |
| 15 | `skeleton` | Ad-hoc pulser. | `aria-busy` / `aria-hidden`, reduced-motion (statisk i stedet for shimmer). |
| 16 | `spinner` | matrix-loaders / beUI-loader der det passer — **behold** for Ronny/AI. Board-`Spinner` er felt-spinner (`SearchField isLoading`, modal pending). | RAC `ProgressBar`, `aria-label`, reduced-motion. |

### P3 — navigasjon inne på en flate (ikke chrome)

| # | `add`-navn | Erstatter / forbedrer | Hva vi får |
|---|------------|------------------------|------------|
| 17 | `tabs` | Underline-faner i Innstillinger-chrome er app-komposisjon (F5-13). Board-tabs er for **innhold** (team-detaljer, innstillinger-seksjoner), ikke dest-piller. | RAC Tabs, piltaster, `aria-selected`. Restyle: valgt = ink/soft, **ikke** accent-underline. |
| 18 | `segmented-control` | Egne piller/segment der vi har 2–3 valg på en flate (ikke `FORHANDLER_NAV`). | RAC `ToggleButtonGroup`. Restyle: soft tint, ikke accent. |
| 19 | `command-palette` | `docs/layout-copy/top-bar.tsx` refererer en palett som **ikke** finnes i produkt. `Dialog` er bevisst uposisjonert «fordi kommandopaletten vil ligge øverst». | ⌘K / Ctrl+K, piler, Enter, Escape tømmer så lukker, fokus tilbake, locale-aware filter, `useTemplateCopy` for NB-tekst. Default-ikoner Remix — bytt. **Ikke** endre telefon-chrome. |

### P4 — knapper (kommer som rdeps av modal uansett)

| # | `add`-navn | Erstatter / forbedrer | Hva vi får |
|---|------------|------------------------|------------|
| 20 | `button` | **Ikke** erstatt `src/components/button.tsx` (shadcn, pille-CTA, `h-control`) eller beUI `StatefulButton` i batch 1. Board-knappen bor i `base/buttons/button.tsx` og brukes av Modal-footer. | `leadingIcon`/`trailingIcon` som referanse, `iconOnly` + påkrevd `aria-label`, `aria-disabled`, `button-press-motion`. Restyle: `bg-button-primary`-utility → solid ink (se §5). Radius/høyde: pille + `h-control` på produkt-CTA; Board 36/10px kun inne i Board-modal til vi restyler. |
| 21 | `icon-button` | Egne `size-control`-ikonknapper. | `aria-label` påkrevd. |
| 22 | `close-button` | `X` fra lucide i modaler/toasts. | Egen SVG per størrelse (stroke i ekte CSS-px). `aria-label` påkrevd. Ingen Remix-dep. |

`StatefulButton` (beUI) forblir submit-knapp med pending/success. Board-`Button` har ikke det state-API-et. Modal-pending dekkes av `AlertDialog` `pendingLabel`, ikke ved å kaste beUI.

---

## 5. Restyle til vår look (etter `add`, før synlig bruk)

Board-kilden bruker **semantiske class-navn** (`bg-button-primary`, `text-text-primary`, `ring-border-focus-ring`, `shadow-xs`). Vi eier fila og tokenene. Restyle = koble tokenene til `--ew-*`, ikke skriv om hver komponent først.

### 5.1 Token-omkobling i `packages/ui/src/theme.css`

Etter init, `@import` den omkoblede Board-fila og overstyr interaktive tokens. Ikke rør `--ew-*`. Ikke remap hele `accent-*`-rampen til ink — `#0066ff` skal fortsatt kunne brukes på Popular / savings / dagsbue-viz.

```css
@import "./styles/theme.css"; /* Board-utilities, etter --ew-* */

:root {
  /* CTA: Board @utility bg-button-primary leser denne gradienten. Solid ink. */
  --gradient-button-primary-default: var(--ew-ink-utility);
  --gradient-button-primary-hover: var(--ew-ink-hover);
  --gradient-button-primary-active: var(--ew-ink-utility);
  --gradient-button-primary-disabled: var(--ew-surface-2);

  /* Fokus / valgt kontroll — ink, ikke accent-500 (#3392ff). */
  --color-border-focus-ring: var(--ew-focus);

  /* Flater Board-komponentene faktisk maler */
  --color-background-full: var(--ew-bg);
  --color-background-primary-default: var(--ew-surface);
  --color-background-secondary-default: var(--ew-surface-2);
  --color-background-tertiary-default: var(--ew-inset);
  --color-text-primary: var(--ew-fg);
  --color-text-secondary: var(--ew-fg-muted);
  --color-text-tertiary: var(--ew-fg-faint);
  --color-separator-border: var(--ew-border);

  /* Switch / checkbox / radio «on» — ink, ikke blå gradient */
  --color-switch-on-chip-start: var(--ew-ink-utility);
  --color-switch-on-chip-end: var(--ew-ink-utility);
  --shadow-checkbox-selected: none;

  /* Tint, ikke skygge */
  --shadow-xs: none;
  --shadow-sm: none;
  --shadow-card: none;
  --shadow-dropdown: none;
  --shadow-sidebar: none;
}
```

Presise variabelnavn i Board-fila er verifisert (`--gradient-button-primary-*`, `--color-border-focus-ring`, `--shadow-checkbox-selected`). Hvis `init` skriver en nyere `theme.css`, diff mot denne lista før merge.

### 5.2 Typoskala

Board-komponenter bruker composite utilities (`text-body-medium` = 14/20/500). Vi beholder Inter **650 / 450 / 300** og `text-title` / `text-label` / `text-body`. Etter `add`: i de installerte `base/`-filene, bytt Board-typeclassene til våre tre. Ikke ta inn `typography.css` som sannhet.

### 5.3 Ikoner

I kilden vi eier, bytt default-importer:

| Fil | Default nå | Bytt til |
|-----|------------|----------|
| `search-field.tsx` | `RiSearchLine` | `Search` fra `@endwise/ui` / lucide |
| `command-palette.tsx` | `RiSearchLine`, `RiCornerDownLeftLine` | lucide `Search`, `CornerDownLeft` |
| `modal.tsx` | `RiErrorWarningLine` på AlertDialog | lucide `CircleAlert` |
| `notification.tsx` | `RiCheckboxCircleFill` m.fl. | lucide-statusikoner |
| `number-field.tsx` | Remix stepper | lucide `ChevronUp` / `ChevronDown` |
| `input` / knapper | `leadingIcon={Ri…}` i eksempler | `leadingIcon={Plus}` osv. |

`@remixicon/react` blir værende i `package.json` til siste default er borte. Produktkode skal ikke importere den.

### 5.4 Switch-mål

I `base/switch/switch.tsx`: legg inn Endwise-størrelse (`h-[var(--ew-switch-h)] w-[var(--ew-switch-w)]`, thumb `--ew-switch-thumb`, travel 10px) som default, eller overstyr `sm` til 24×14. Board-defaults (28×16 / 42×24 / 56×32) skal ikke vises i produktet.

### 5.5 Telefon-søk (oppførsel, ikke chrome)

```tsx
<SearchField
  size="small"
  shape="rounded"
  icon={Search}
  aria-label="Søk"
  placeholder="Søk"
  clearLabel="Tøm søk"
  className="h-8 min-w-0 flex-1"
/>
```

Ikke `pill`. Ikke endre top-bar 1/2, dest-piller, 389/598/452, `FORHANDLER_NAV`.

### 5.6 `cx` vs `cn`

`src/utils/cx.ts` (Board) må kjenne `text-title` / `text-label` / `text-body` — ellers gjentar vi farge-vs-størrelse-bugen som `cn()` allerede fikser. `src/lib/utils.ts` (`cn`) forblir shadcn/beUI-konvensjonen.

---

## 6. Per-komponent: fil → Board → svakhet → innsats

| Vår fil | Board-item | Svakhet i vår kode (verifisert) | Vedtak | Innsats | Risiko |
|---------|------------|----------------------------------|--------|---------|--------|
| `packages/ui/src/primitives/input.tsx` | `input` | Ingen label/hint/error, ingen `aria-invalid`/`describedby`. Bara native attrs. | Erstatt som primitiv etter restyle | S | Lav — ny sti, gammel `Input` kan alias-es |
| `apps/web/app/_auth/felter.tsx` | `input` (`label`+`hint`+`errorMessage`) | `htmlFor` ok; ingen feil/hint/`aria-invalid` | Forbedre: `Field` blir tynn wrapper eller droppes | S | Auth-utseende (`FELT_LG` 52/17) må bevares via `size` + class |
| `signin-skjema.tsx`, `2fa-oppsett`, `bytt-epost`, team-TOTP, forhandler-slett | `input-otp` | Ett felt + letter-spacing. Ingen per-siffer, lim/autofill-edge | Erstatt TOTP/magic-kode | M | Autofill + iOS zoom (vi har test for 16px) |
| `_shell/phone-sok-felt.tsx` | `search-field` | Ingen clear/Escape/loading | Forbedre oppførsel; **behold h-8** | S | Chrome-lås |
| `packages/ui/src/components/dialog.tsx` | `modal` | Ingen posisjon, header, AlertDialog, pending, reduced-motion | Ny fil i `base/`; flytt bekreft-dialoger. Behold Radix til palett er flyttet | M | Fokus/scroll på telefon |
| `_shell/sortering-ark.tsx` | `dropdown` | Escape + scrim, ingen fokusfelle/restore | Forbedre a11y; behold 16px / `text-label` / ingen heading | M | Anker i 390-kolonnen (`absolute`) |
| `packages/ui/src/components/switch.tsx` | `switch` | Radix dekker toggle; mangler label-API; Board-default er feil mål/farge | Hent + restyle til 24×14 ink; så bytt kallsteder | S | Visuell regressjon hvis default sm vises |
| `packages/ui/src/components/dropdown-menu.tsx` | `dropdown` | Radix OK for meny; Sortering er ikke denne fila | Parallell i `base/`; ikke mass-replace menyer i batch 1 | S | To meny-API-er |
| `packages/ui/src/components/button.tsx` + `StatefulButton` | `button` | shadcn + beUI dekker CTA/pending | **Behold.** Board-button kun som modal-dep i batch 1 | — | Lav hvis vi ikke flipper barrel |
| `packages/ui/src/components/prompt-input.tsx` | — | Enter-submit + composition | **Behold.** Ikke `textarea` | — | — |
| `packages/ui/src/components/avatar.tsx` | `avatar` (rdep av toast) | bloub er vedtak | **Ikke eksporter** Board-avatar | S | Navnekollisjon hvis noen importerer feil sti |
| Ingen produkt-tooltip | `tooltip` | — | Hent, bruk på ikon-only | S | Trigger må være focusable |
| Ingen produkt-toast | `toast` | — | Hent + `<Toaster />` i app-layout | S | Remix-statusikoner til lucide |
| Ingen Select/Checkbox/Radio | `select` / `checkbox` / `radio` | Native eller knapp | Hent | M | Select-popover vs telefon |
| Ingen Command Palette | `command-palette` | Layout-copy peker på noe som ikke finnes | Hent; desktop først | M | ⌘K vs telefon; NB-copy via `template-copy` |
| matrix-loaders / beUI | `spinner` / `skeleton` | AI-lastere er vedtak | Hent som *felt*-laster, ikke Ronny | S | Feil spinner på feil flate |
| Innstillinger-faner / dest-piller | `tabs` / `segmented-control` | Dest-piller er låst chrome | Bare innhold-faner | S | Noen limer dem i top-bar 2 |
| Ronny-sheet / telefon-IA | `drawer` / `sidebar` / `app-shell` | Chrome låst | `drawer` ok som primitiv; **ikke** sidebar/app-shell | — | IA-brudd hvis noen `add`er shell |

---

## 7. Ikke i første batch

| Item | Hvorfor ikke nå |
|------|-----------------|
| `sidebar`, `app-shell`, `theme-toggle` | Telefon: ingen sidebar. Desktop: 389/598/452 + `FORHANDLER_NAV`. Theme-toggle er vår `_lib/tema-toggle.tsx`. |
| `avatar` som produkt | Allerede inne via toast-rdep. bloub forblir `Avatar`. |
| `agent-chat`, `agent-runtime`, `agent-thinking`, `agent-log`, `composer-loader` | Vi har `_chat/agent-chat.tsx` + shadcn message/scroller + `PromptInput`. Overlap uten gevinst. Drar `ai` / `@ai-sdk/react` (allerede inne) + hele app-shell. |
| `revenue-chart-card`, `orders-chart-card`, `stat-cards`, … | Amicro er chart-motor. ⛔ Recharts som ny motor. Flere er Pro. |
| `data-table`, `data-grid` | Drar `@tanstack/react-table`. Egne `<table>`-er kan byttes senere. |
| `date-picker`, `date-range-picker`, `date-calendar`, `time-field`, `meeting-scheduler` | `@internationalized/date`. Egen økt. |
| `file-upload`, `color-picker`, `tree-view`, `accordion`, `slider`, `tag-group`, `combobox`, `pagination`, `carousel`, `breadcrumb` | Ingen akutt kallsted, eller dekkes av P1 Select/Input. |
| `auth-card`, `settings-modal`, `notification-center` | Hele sider/maler. Chrome og auth-IA er våre. |
| `chip`, `badge`, `announcement`, `status-dot`, `kbd`, `divider`, `social-button`, `link-button`, `button-group`, `checkbox-card`, `radio-card`, `switch-card` | visuell extras. `Badge`/`Chip` finnes. `kbd` kommer som rdep av command-palette. |
| Pro-items | Lisens + ulest kilde. |

---

## 8. Avhengighetskart første batch

```
init
  → theme, typography, globals, cx (tailwind-merge ^3.6), agent-regler (slettes)

add [22 navn]
  → RAC ^1.17.0, @remixicon/react ^4.9.0
  → rdeps: direction, scroll-fade, template-copy, chevrons, directional-icon,
           use-dismiss-on-outside-press, kbd, notification, avatar (Board),
           spinner, button, close-button, input, cx, globals
  toast → notification → motion ^12.42.2 (allerede), remix-ikoner, Board-avatar
  search-field → input + close-button + spinner + template-copy
  modal → button + close-button + direction + scroll-fade + spinner
  drawer → modal
  command-palette → direction + kbd + scroll-fade + template-copy
  select → input + chevrons + use-dismiss-on-outside-press
```

`pnpm` i workspace: deps installeres i `packages/ui` når kommandoen kjøres derfra.

---

## 9. Telefon — bare oppførsel

Låst og urørt av denne planen: logo 32, søk `h-8`, Ronny 28, profil 28, dest-piller, ingen sidebar, 389/598/452, `FORHANDLER_NAV`.

Det SearchField / Modal / dropdown *skal* gi på telefon:

- Søk: Escape tømmer, synlig clear, `isLoading` uten at feltet vokser over `h-8`.
- Sortering: fokus inne i arket, Tab sykler valg, Escape lukker, fokus tilbake til trigger. Samme 16px-plate, ingen heading.
- Modal/AlertDialog: fokusfelle, `pendingLabel` på slett/2FA, reduced-motion.

---

## 10. Når batchen faktisk kjøres (neste økt, ikke denne)

1. `boardui.json` + exports.  
2. `cd packages/ui && npx boardui@latest init --yes`.  
3. Slett Board-`AGENTS.md` / `.cursor/rules/boardui.mdc` (eller skriv dem om til Endwise).  
4. §5 token-omkobling + `cx` kjenner `text-title|label|body`.  
5. `npx boardui@latest add --yes` + lista i §3.3.  
6. Bytt Remix-defaults til lucide i de sju filene i §5.3.  
7. Switch 24×14 ink.  
8. Oppdater `docs/UI-PAKKER.md` (ny pakke: Board UI, CLI, pin, MIT, sti `src/components/base/`) og `docs/endwise-techstack.md` (§2: RAC som skjemamotor, Remixicon transitiv).  
9. Koble P1-kallsteder ett felt om gangen. Ikke flip `src/index.ts` i samme commit som `add`.  
10. Verifiser auth (magic + 2FA + invitasjon), telefon-søk, Sortering, en AlertDialog, varsel-Switch.

Denne PR-en gjør **ingen** av stegene over.

---

## 12. Board UI Pro — katalog, Agent Creator, anbefaling

**Dato:** 2. november 2026 (samme PR).  
**Type:** Fortsatt undersøkelse. Ingen kjøp, ingen `login`, ingen Pro-`add`.  
**Spørsmål fra Mikael:** Han kan betale hvis det hjelper, vil bruke mer derfra, og tenker Agent Creator (eller tilsvarende Pro-blokk) til at forhandlere oppretter jobber, kunder, lagervarer, tjenester.

**Kort svar først:** Agent Creator er **ikke** en opprettelses-wizard for Endwise-entiteter. Den er en **profil-sidebar for AI-agenter** (papir-avatar, navn, stemme). Forhandler-CRUD dekkes av **gratis** batch 1 (`input` / `select` / `modal`) mot våre eksisterende `InnstillingSeksjon`-skjemaer. Pro er aktuelt for **Ronnys agent-UI** (composer, task list, spørsmål i tråden) — og bare etter at Pro-kilde kan ligge i et **privat** repo.

### 12.1 Katalog, pris, lisens, install

#### Hva som er Pro (40 items i `registry-pro.json`)

Getting-started: «30 Pro components and blocks» + «all 10 full-page templates». Registeret har nøyaktig 40 navn. Kilde er bak nøkkel; docs og usage-eksempel er offentlige.

**Agent-laget (11)**

| `add`-navn | Hva docs/registeret sier den er |
|------------|----------------------------------|
| `agent-creator` | Kontrollert sidebar: papir-avatar, emotion/shape, farger, profilfelt, stemme. Se §12.2. |
| `agent-avatar` | Animerte papir-avatarer (9 silhuetter, blikk, turn). Samme familie som multi-agent-chat. |
| `multi-agent-chat` | Arbeidsflate: 1:1 og gruppe, live avatar-editor, Board-composer. |
| `composer` | Chat-composer: vedlegg, modellmeny, voice, send, statusbar, liquid-glass mens agenten jobber. |
| `composer-panel` | To-rads composer: prompt oppe; add / permission / model / mic / send nede; status-tab (branch, mappe, context-meter). |
| `composer-attachments` | Samme panel med bilde/dokument-fliser og opplastingsring. |
| `agent-progress` | Kollapsbar **AI-steg**-progress (active / pending / completed). Ikke et skjemawizard. |
| `agent-limits-card` | Context-vindu + plan-kvoter med reset-tid. |
| `task-list` | Strømmende agent-oppgavelogg (steg, filer, shimmer-tittel). |
| `web-search` | Forsknings-sti: spørringer + kilder med nettsted-merke. |
| `questionnaire` | Plan-mode **i chat**: ett spørsmål per steg, checkbox eller nummererte rader, valgfri Other-rad, Previous/Next. |

**Kalender / tavle (2)**

| `add`-navn | Hva den er |
|------------|------------|
| `calendar` | Månedsvisning med event-chips, detalj-popover, månedsskifter, inbox-feed. Krever `@internationalized/date` i public example. **Ikke** det samme som gratis `date-picker`. |
| `project-board` | Kanban: dra mellom kolonner, ticket-detalj, properties, kommentarer. Har egen «create-ticket»-dialog — det er **kanban-kort**, ikke Endwise-jobb. |

**Chart-kort (17)** — `earnings-chart-card`, `line-chart-card`, `contributions-card`, `radar-chart-card`, `radial-chart-card`, `funnel-chart-card`, `sankey-chart-card`, `stage-bars-card`, `bar-list-card`, `area-chart-card`, `combo-chart-card`, `scatter-chart-card`, `heatmap-chart-card`, `steps-card`, `sleep-score-card`, `activity-rings-card`, `most-active-days-card`. Recharts-motor (tredjepart MIT, ifølge lisenssiden).

**Maler (10)** — `template-multi-agent-chat`, `template-home-dashboard`, `template-project-board`, `template-marketing`, `template-finance`, `template-hr`, `template-medical-profile`, `template-ai-chat`, `template-ai-profile`, `template-ai-image-generation`. CLI: `npx boardui@latest add template-ai-chat`. Docs: maler inkluderer side, Pro-blokker, gratis deps og bilder. **Installeres i appen, ikke i `packages/ui`** (CLI-docs: routes/public assets splittes ikke over workspace-pakker).

**Ikke i Pro — allerede gratis** (ofte forvekslet med Pro): `sidebar`, `app-shell`, `data-table`, `data-grid`, `date-picker`, `date-range-picker`, `date-calendar`, `time-field`, `meeting-scheduler`, `file-upload`, `agent-chat` / `agent-runtime` (Chat Starter), `settings-modal`. De sto i §7 som «ikke batch 1», men de krever **ikke** lisens.

**Finnes ikke i katalogen (verifisert mot `llms.txt` + `registry-pro.json`):** generisk form-wizard / stepper / «entity creator» / «agent creator» som lager jobber eller kunder. Closest Pro-steg-UI er `questionnaire` (chat-kort med valg-rader) og `agent-progress` (AI-plan). Closest gratis flerside er `settings-modal`.

#### Pris

Lisenssiden lister **plan-navn og seter**, ikke euro. Beløp fra Board UI sin egen blogg 28. okt 2026 («launch pricing, as of October 2026») og sammenligningsinnlegget:

| Plan | Seter | Oppdateringer | Pris (én gang, euro) |
|------|--------|---------------|----------------------|
| Starter (gratis) | — | Gratis-kilde, MIT | 0 |
| 1 Year of Updates | 1 utvikler | Pro-kilde + nytt i 12 mnd | €149 |
| Lifetime Access | 1 utvikler | Pro-kilde så lenge Board publiserer | €199 |
| Unlimited for Startups | inntil 5 utviklere i **én organisasjon** | som Lifetime | €349 |

Ingen abonnement, ingen auto-fornyelse. Når 12-månedersvinduet er ute: installert kilde **fortsetter å virke** og får brukes i nye prosjekter; det som stopper er `add` av ting publisert etter datoen. `/pricing` viste ikke beløp i markdown-svaret denne økten — **bekreft på checkout** før kjøp (Lemon Squeezy, MVA etter land).

#### Lisens — kommersiell SaaS?

**Ja, Endwise som betalt SaaS er tillatt** (lisens 31. okt 2026):

- Ubegrenset antall sluttprodukter, «including products you sell and applications you charge for».
- Lov å endre, restyle, slette, blande med egen kode.
- Dere eier sluttproduktet og endringene. Board eier kilden.
- Internt designsystem OK så lenge det **blir inne i organisasjonen**.
- Folk som aldri rører kilden (designere, testere, forhandlere som *bruker* appen, kunder) trenger **ikke** sete.

**Forbud** som treffer oss:

- **Ikke publiser Pro-kilde i et offentlig repo.** Lisensen: «Keep the code in your own *private* repositories». `Twofold-AS/endwise-v1` er **public** (`gh repo view` 2. nov 2026). Å `add`e Pro hit uten å gjøre repoet privat (eller legge Pro i en privat pakke/submodule) er **lisensbrudd**.
- Ikke redistribuer kilden som bibliotek, starter-kit eller kurs. Ikke bygg en konkurrent til Board UI. Ikke bygg et verktøy der *andre* blar/genererer/eksporterer Board-kilden.
- Nøkkelen er personlig. Ikke del den. 1-seters plan: neste menneske som *installerer eller redigerer* Board-kilde trenger egen lisens. Sete kan flyttes når noen slutter.
- «Build a tool that lets other people browse, preview, generate, export or customise the Source» — **ukjent** om en fremtidig «forhandler designer sin egen UI av Board-kilder» ville truffe dette. Vanlig bruk av installerte komponenter i Endwise-UI-et er sluttprodukt, ikke det.

Gratis-kilde forblir MIT (offentlig repo OK). CLI på npm er MIT; det den *skriver* av Pro er denne lisensen.

**Ukjent:** om Cursor Cloud Agents som skriver Board-filer teller som ekstra seter. Lisensen teller «one human being who works with the Source». Vilkårene sier i tillegg at nøkkelen aktiverer et **begrenset antall maskiner**, og at `logout` frigjør sete. CI skal ikke `login` — bruk `BOARDUI_LICENSE_KEY`. Spør `hi@boardui.com` før flere agenter/`login` på CI-maskiner.

#### Hvordan Pro installeres (ikke kjørt)

Samme CLI som gratis. Auth er **lisensnøkkel**, ikke GitHub-token.

```bash
# Etter checkout (Lemon Squeezy): nøkkel på e-post.
cd packages/ui
npx boardui@latest init --pro --yes          # Pro-deps i tillegg til vanlig init
npx boardui@latest login YOUR_LICENSE_KEY    # én maskin = ett sete
# CI / agent uten tty:
#   BOARDUI_LICENSE_KEY=…   (ikke login)
npx boardui@latest add --yes agent-creator composer questionnaire
npx boardui@latest add --yes template-ai-chat   # i apps/web, ikke packages/ui
npx boardui@latest logout                       # frigjør maskin-sete
```

MCP stdio (`npx -y boardui@latest mcp`): `activate_license` + `install_components`. HTTP-MCP (`https://www.boardui.com/mcp`) er **read-only** og installerer ikke Pro-kilde.

`npx boardui@latest list` viser gratis **og** Pro-navn. `add` uten gyldig nøkkel på Pro-item: **ikke verifisert i denne økten** (vi kjørte det ikke). Docs: Pro-badge, nøkkel kreves.

Restyle etter `add`: samme §5 (ink-CTA, `--ew-*`, lucide, ingen chrome-bytte).

### 12.2 Agent Creator — hva den faktisk er

**Ikke en AI-generator. Ikke en builder som lager jobber/kunder. Ikke et generisk opprett-skjema.**

Offisiell beskrivelse (`llms.txt` + `registry-pro.json` + docs-siden):

> A controlled agent creator sidebar with animated avatars, emotion and shape pickers, custom colors, profile fields, and voice preferences.

Blogg 28. okt 2026: «In Agent Creator you give an agent a **name**, a **description** and a **voice**, and pick one of **nine paper shapes** with an **expression** and a **color**.»

Docs-intro (offisiell side, sitert fra sidesammendrag): papir-avatarer, ni former, ansikt, farger, profilfelt, **voice / language / notification**-preferanser. Gjenbrukbar sidebar. Public usage (verifisert i registeret):

```tsx
import { AgentCreator } from "@/components/application/multi-agent-chat/agent-editor";
<AgentCreator agent={agent} onChange={setAgent} />
// parent: h-[760px] w-[356px]
```

Samme docs: «Pass an `agent` and handle `onChange` to keep the complete profile in your own state. **Save those changes to your service when needed. The block does not write to storage itself.**» Parent skal ha fast høyde; kan ligge i sidebar, drawer eller dialog. `onClose` viser lukk-knapp.

Den bor i **multi-agent-chat**-pakken (`agent-editor`), ikke som en frittstående «create anything»-motor. Malen `template-multi-agent-chat` bruker den som «live agent creator» ved siden av ti sample-agenter.

**Ukjent (kilde ikke lest):** TypeScript-shape på `agent` / `INITIAL_AGENTS`. Om `voice` er en `<select>` av navn eller ekte TTS. Om language/notifications faktisk er i API-et (står i intro, ikke i det korte register-feltet). Om feltene kan byttes mot «navn / telefon / regnr» uten å skrive om blokken. Intern a11y utover det RAC-basen ellers gir.

#### Passer den til forhandler-opprettelse i Endwise?

| Flate | Vår fil i dag | Agent Creator? |
|-------|---------------|----------------|
| Ny jobb | `apps/web/app/(app)/bookinger/ny/page.tsx` — `InnstillingSeksjon`, kunde/kjøretøy/tjenester/tid, Vegvesen-oppslag, `mechanics.match`, `bookings.create` | **Nei.** Jobb er slot-lås + matcher, ikke agent-identitet. |
| Ny kunde | `kunder/_ny-kunde.tsx` — navn/telefon/epost, `customers.create` | **Nei.** Tre tekstfelt. Ingen avatar/stemme. |
| Ny tjeneste | `innstillinger/tjenestekatalog/_ny-tjeneste.tsx` — navn, kjøretøytype, varighet, pris, `services.create` | **Nei.** |
| Lager | `lager/lokasjoner/page.tsx`, `lager/deler/_bevegelse-dialog.tsx` | **Nei.** |
| Opprett ansatt | `innstillinger/team/_inviter.tsx` | **Nei.** (E-post / uten innlogging.) |
| Org-dialog | `organisasjon/_opprett-dialog.tsx` | **Nei.** |

Det forhandleren trenger er **skjemafelt mot tRPC**. Det ligger i gratis batch 1 + ev. gratis `combobox` (kunde/kjøretøy-søk) og `date-picker` / `meeting-scheduler` (starttid). Våre `InnstillingSeksjon` / `InnstillingRad` (Mobbin-skjema, CODE-GO) beholdes som komposisjon.

**Pro `questionnaire` er nærmeste steg-UI**, men den er et **chat-kort**: ett spørsmål, valg-rader (checkbox/nummer), valgfri Other-tekst, `onComplete(answers)` → `sendToAgent`. Public API har ikke fritekst-felt for navn/regnr/pris, ikke filopplasting, ikke dato. Å tvinge Ny jobb inn der er å bruke feil komponent.

**Pro `agent-progress`** er «Read project files → lint → build»-steg for en *agent-kjøring*, ikke wizard-steg i et skjema.

#### Hva som må kobles til backend / Ronny

Board dokumenterer **ingen** Endwise-backend. Det som *står*:

| Blokk | Offentlig kobling | Til oss |
|-------|-------------------|---------|
| Agent Creator | `agent` + `onChange`. «Save … to your service when needed.» Ingen storage. | Hvis vi brukte den: egen tabell/felt for **Ronny-persona** (navn, beskrivelse, stemme, form, farge). **Ikke** `customers.create` / `bookings.create`. Persistens, validering, RLS: vårt. |
| Multi-agent Chat | `onRespond(agent, messages, abortSignal)` (blogg). | Kun hvis vi vil ha flere agenter. Vi har én Ronny + `/chat/<agent>`. |
| Composer / Panel | `onSubmit`, `onModelChange`, `onEffortChange`, `onPermissionChange` (blogg). | Overlap med `PromptInput` + `DefaultChatTransport` i `_chat/agent-chat.tsx`. Modellen velges **server-side** (Mistral EU) — klienten har bevisst ikke modellfelt. En Board-modellmeny ville **stride** mot det. |
| Questionnaire | `onComplete(answers)` / `onDismiss`. | Kan ligge *i* Ronny-tråden når agenten trenger avklaring *før* den kaller et tool. Det er **ikke** erstatter for Ny jobb-siden. Vi har allerede shadcn-`Questionnaire` i `@endwise/ui`. |
| Task List / Web Search / Agent Progress | Styrt av dere (steps/sources som props). | Kun hvis Ronny-tools skal vises som Board-logg i stedet for `ToolPart`. |

**Ikke finn på:** Agent Creator «genererer en jobb via Ronny». Ingen slik flyt er dokumentert. En tenkt arkitektur (Ronny spør med Questionnaire → tool → `bookings.create`) er *vår* produktidé, ikke Board.

Papir-avatar (`agent-avatar`) er et annet system enn **bloub**. Ikke bytt person-avatarer. Ev. kun Ronny-figur — eget vedtak, ikke del av Agent Creator-spørsmålet.

### 12.3 Pro vs våre filer utover batch 1

Samme låser: Mobbin-look, telefon top-bar 1+2 uendret, desktop 389/598/452, `FORHANDLER_NAV`. Ingen Pro-mal som *side*.

| Tema | Board | Pro? | Vår fil | Vedtak |
|------|-------|------|---------|--------|
| Entity-opprett (jobb/kunde/lager/tjeneste) | `input` `select` `combobox` `number-field` `modal` | **Gratis** | `_ny-kunde.tsx`, `_ny-tjeneste.tsx`, `bookinger/ny/page.tsx`, lager-dialoger, `InnstillingSeksjon` | Batch 1 + senere gratis combobox/date. **Ikke** Agent Creator. |
| Steg-wizard | `questionnaire` (chat-valg) / `agent-progress` (AI) / `settings-modal` (gratis) | Delvis Pro | Ingen felles wizard; Ny jobb er **én** flate | Ikke kjøp Pro for wizard. Questionnaire ev. *i* Ronny. |
| Dato / tid | `date-picker`, `date-range-picker`, `meeting-scheduler`, `date-calendar`, `time-field` | **Gratis** | `bookinger/_starttid-velger.tsx`, `bookinger/ny` | Senere gratis-batch. Restyle. |
| Månedskalender med hendelser | `calendar` | **Pro** | `saker/_kalender.tsx` (egen måned + `CalendarDays`) | Kandidat *etter* restyle; ikke chrome. |
| Filopplasting | `file-upload` | **Gratis** | Der vi har `type="file"` / Quick-upload | Senere gratis-batch. |
| Tabell | `data-table`, `data-grid`, `table` | **Gratis** | `BookingsTable` / `RevenueTable` (UI-PAKKER §8) | Senere gratis; ikke Pro. |
| Sidebar / app-shell | `sidebar`, `app-shell` | **Gratis** | `_shell/sidebar.tsx`, `phone-shell`, desktop 389/598/452 | **Ikke.** Chrome-lås. Maler (`template-home-dashboard` osv.) er samme skall — ikke `add` som side. |
| Ronny-composer | `composer` / `composer-panel` / `composer-attachments` | **Pro** | `prompt-input.tsx`, `_chat/agent-chat.tsx` | Verdt å *vurdere* for vedlegg/status. **Ikke** modellvelger (server eier modell). Restyle glass/skygge vekk. Telefon-sheet uendret. |
| Ronny tenker / tools | `agent-thinking` `composer-loader` (gratis); `task-list` `web-search` `agent-progress` (Pro) | Blanding | `ToolPart`, matrix-loaders | Pro-logg kan erstatte *visning* av tool-løp. Gratis thinking/loader først. |
| Ronny-spørsmål | Pro `questionnaire` | Pro | shadcn `Questionnaire` i `packages/ui/src/components/questionnaire.tsx` | To ulike API-er. Bytt bare hvis vi vil ha Board sitt chat-kort. |
| Multi-agent / persona | `agent-creator` `agent-avatar` `multi-agent-chat` | Pro | Én Ronny, bloub, `/chat/<agent>` | Ikke for CRUD. Ev. senere Ronny-profil — eget vedtak. |
| Analyse / grafer | 17 Pro chart-kort + 10 dashboard-maler | Pro | Amicro (`DitherStackedChart` …), `statistikk/_innhold.tsx` | **⛔** Amicro er chart-motor (techstack + Mikael 06.09.2026). Ikke bytt. |
| Kanban | `project-board` | Pro | Ingen tilsvarende produktflate | Ikke med mindre vi får en tavle-IA. Create-ticket ≠ Ny jobb. |

### 12.4 Anbefaling

**Kjøp ikke Pro for å få «agent creator» til Ny jobb / Kunder / Lager / Tjenester.** Den blokken gjør ikke det. Det behovet dekkes av gratis batch 1 mot skjemaene vi allerede har.

**Pro er likevel verdt det — senere — hvis målet er Ronnys agent-overflate** (composer med vedlegg, task/search-logg, plan-spørsmål i tråden, ev. Pro-kalender på Saker). Det er det Pro faktisk selger, og det overlapper `_chat/agent-chat.tsx` mer enn det overlapper `bookinger/ny`.

**Plan hvis dere kjøper:**

1. **Ikke før** batch 1 gratis er inne og restylet (§10), og **ikke før** Pro-kilde har et **privat** hjem. Public `endwise-v1` blokkerer. Alternativer: privat repo, privat `packages/boardui-pro`, eller spørre Board (`hi@boardui.com`) om public-monorepo med Pro utenfor git. Ukjent om privat submodule i public repo er OK — spør.
2. **Lifetime Access (€199)** hvis bare én person (Mikael) installerer/redigerer Board-kilde.  
   **Unlimited for Startups (€349)** hvis to til fem mennesker i Twofold rører `base/`-filene.  
   **1 Year (€149)** bare som prøve; kilden dere rakk å `add`e blir værende.
3. Første Pro-`add` (etter nøkkel, i privat pakke): `composer-attachments`, `task-list`, `web-search`, `questionnaire` — koblet til Ronny, **uten** modellmeny og uten å røre top-bar 1+2. `agent-creator` bare hvis vi bevisst vil ha en **Ronny-persona**-editor.
4. Ikke `add` dashboard-maler, `project-board`, chart-kort eller `sidebar`/`app-shell`.

**Ja/nei:** Ja til Pro **som Ronny/agent-sett**, på Lifetime eller Startups, etter privat repo + batch 1. **Nei** til Pro som løsning på forhandler-opprettelse.

---

## 13. Øktrapport

1. **Hva er gjort**  
   Første runde: 88 gratis items + innhentingsplan (§1–10). Denne runden: Pro-katalog (40) fra `registry-pro.json` + lisens/vilkår/install/pris; Agent Creator kartlagt mot Ny jobb/kunde/tjeneste/lager; anbefaling + public-repo-varsel. Ny §12.

2. **Hva gikk galt**  
   `/pricing` ga ikke euro i markdown-svaret (beløp tatt fra Board UI-blogg 28. okt 2026). Pro-`.tsx` ulest (krever nøkkel). Context.dev MCP uautentisert. Agent Creators fulle `agent`-type er ukjent.

3. **Hvilke fikser ble gjort**  
   Bare `docs/boardui-audit.md`. Ingen kjøp, ingen `login`/`add`, ingen produktkode. Roadmap-status urørt.

4. **Neste**  
   Batch 1 gratis (§10). Pro tidligst etter privat hjem for kilden, og bare for Ronny-agent-UI — ikke for CRUD-wizard. F0-11 / F0-12 / F5-13 uendret.
