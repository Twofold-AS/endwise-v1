# Admin-dashboard — layout-analyse (EKTE dashboard, TheFold-referansen)

**Dato:** 14. juli 2026 · **Oppdatert:** etter at den ekte dashboard-fila kom inn
**Status:** analyse, ingenting bygget
**Kilde:** `docs/layout-copy/` — nå med `dashbioard/page.tsx` (ekte dashboard, ferskest) + `globals.css`

---

## 0. Hva vi ser på nå — og en viktig nyanse

Filene i `docs/layout-copy/` (med tidsstempel):

| Fil | Endret | Hva det er |
|---|---|---|
| `dashbioard/page.tsx` | **16.07 00:07** ← ferskest | **Det ekte dashboardet** |
| `globals.css` | 04.07 | **Alle designtokens** (mørk + lys) |
| `sidebar.tsx` | 04.07 | Sidebar |
| `page.tsx` | 04.07 | ~~Marketing-forside~~ — **ikke lenger malen** |
| `top-bar.tsx` | 02.07 | Topbar |
| `layout.tsx` | 09.06 | Shell |

*(Mappenavnet er stavet `dashbioard` — skrivefeil, men det er den rette fila.)*

**⚠️ Nyansen du bør vite:** selv «det ekte dashboardet» er en **chat-first hjemmeskjerm** — en stor
wordmark, en prompt-input i en glødende ramme, og fire «feature-discovery»-kort. Det er *tom-tilstand
for en agent-plattform* (à la ChatGPT/Claude sin startskjerm), **ikke et KPI-/tabell-dashboard**.

Det betyr: vi henter **shellet, kort-systemet og tokenene** herfra — de er gjennomgående. Men
*innholdsmønsteret* (chat-composer i midten) passer **vår kunde-/support-chat (F6)**, ikke selve
forhandler-oversikten (F3-05), som er KPI-er, kalender og bookinger. Malen er strukturen, ikke
skjermens formål.

---

## 1. AppShell (topbar + sidebar + content)

Dashboardet wrapper alt i `<AppShell>` (fra `_shell/app-shell` — ikke delt, men vi kjenner mønsteret
fra `layout.tsx`/`sidebar.tsx`/`top-bar.tsx`):

- **Full-bredde topbar (56px, transparent)** øverst; brand venstre over sidebar, kontroller høyre.
- **Sidebar:** fast 60px-slot, floating glass-rail som animeres 60↔240px uten å reflow-e content;
  collapse-knapp i bunn; ingen brand-header (logo i topbar).
- **Content:** 8px gutter, `min-h-0` intern scroll.
- `AppShell` eksporterer også **`C` (fargekonstanter), `Card`, `BEVEL`** — et lite kort-system.

## 2. Content-området i dashboardet (`dashbioard/page.tsx`)

```
        ┌─────────────────────────────────────┐
        │        "Easier with TheFold"        │  ← wordmark, Gelica 34px, sentrert
        │   ┌───────────────────────────────┐ │
        │   │  [glødende ramme: chat-input] │ │  ← TheFoldBeam (amber→hvit beam)
        │   │  Ask anything…                │ │     textarea 120–260px
        │   │  [+]                   [Send↑]│ │     +-verktøyvelger · mørk Send-knapp
        │   └───────────────────────────────┘ │
        │   ┌──────────┐  ┌──────────┐         │
        │   │ Feature  │  │ Feature  │         │  ← 2-kolonne grid, gap 10
        │   │ (bilde)  │  │ (bilde)  │         │     bilde 160px + overlay + bevel-knapp
        │   └──────────┘  └──────────┘         │
        │   ┌──────────┐  ┌──────────┐         │
        └─────────────────────────────────────┘
```

- Ytre: `padding: 96px 32px 32px`, `maxWidth: 620`, `gap: 24`, sentrert.
- **Chat-input:** kort (`C.card` bg, `C.border`, radius 12), textarea (`minHeight 120`, `maxHeight
  260`), «+»-verktøyvelger venstre, mørk Send-knapp (`ArrowUp`) høyre. Enter sender, Shift+Enter =
  linjeskift.
- **Feature-kort:** bilde (høyde 160, `objectFit: cover`), mørk gradient-overlay nederst, en
  **bevel-«open»-knapp** (`ArrowUpRight`) øverst til høyre, tittel (14px semibold) + beskrivelse
  (11px) nede til venstre. Faller tilbake til `<GradientBg variant="slate">` når bildet mangler.

## 3. Designtokens (`globals.css`) — dette er gullet

TheFold har **både mørkt og lyst tema**, og en shadcn-mapping identisk med *vår* (merkevare-tokens →
shadcn-semantikk). Dashboardet vises **mørkt**.

### Mørk (`.dark` → aktiv i dashboardet)

| Token | Verdi |
|---|---|
| `--brand-page` | `#000000` (helsvart bakgrunn) |
| `--brand-topbar` | `#000000` |
| `--brand-card` | `#151515` |
| `--brand-card-2` | `#1a1a1a` |
| `--brand-row-hover` | `#1d1d1d` · `--brand-row-active` `#232323` |
| `--brand-border` | `rgba(255,255,255,0.06)` · `-strong` `0.10` |
| `--brand-text` | hvit, med `-dim 0.88` / `-faint 0.72` / `-ghost 0.55` |
| `--brand-accent` | **`rgba(255,255,255,0.92)` — deres «aksent» er HVIT, ikke en farge** |
| `--brand-warn / success / danger` | amber / grønn / rød (oklch) |

### Lyst (`:root`, «cream»-familien)

`--cream-50…300` (`#fbfbf8`…`#e7e7e3`), `--ink-strong/…/faint` (mørk tekst på lyst). Standard shadcn
oklch-palett for `--background/foreground/card/…`.

### Delt

- **Radius:** sm `3px` · md `6px` · lg `8px` · **xl `12px`** · pill `100px`
- **Fonter:** `--font-google-sans` (sans), `--font-departure` («Departure Mono», headings),
  **`--font-gelica`** (dashboard-wordmark), `--font-mono` (JetBrains Mono)
- Glass-surface-tokens (`--surface-bg`, `--surface-blur: 14px`), skygger, `--space-base: 4px`

**Nøkkelinnsikt:** TheFolds grunndesign er **svart/hvitt/grått** med **amber-glød** som eneste
fargeaksent (border-beam «sunset»). Aksenten deres er *hvit*. **Vår aksent er grønn.**

---

## 4. Hva vi TAR MED

| Fra TheFold | Til Endwise-admin |
|---|---|
| **AppShell:** full-bredde topbar + sidebar-slot + content, 8px gutter | Direkte (shadcn `sidebar`) |
| **Sidebar-mekanikk:** fast slot + floating rail, collapse 60↔240 uten reflow, collapse-knapp i bunn | Direkte |
| **Topbar:** logo+wordmark venstre, kontroller høyre, **SSE-pille** | 🎯 SSE-pilla → vår `apps/stream` (F6-02) |
| **Kort-systemet:** `Card` + `BEVEL` + `C`-fargekonstanter, feature-kort (bilde+overlay+bevel-knapp) | Mønster, bygget med shadcn `card` |
| **Chat-composer-mønsteret** (textarea + verktøyvelger + send) | 🎯 Til **vår kunde-/support-chat (F6)** — ikke admin-oversikten |
| **Token-strukturen** (merkevare-tokens → shadcn-semantikk, mørk+lys) | ✅ **Vi har allerede dette mønsteret** i `packages/ui/src/theme.css` |
| **Radius-skala** (3/6/8/12/100) | Kandidat til `widget-tokens` — bekreft mot prototypen |
| Command palette (⌘K), tema-toggle | shadcn `command` + vårt `data-theme` |

## 5. Hva vi IKKE tar med — og hvorfor

| Fra TheFold | Hvorfor ikke |
|---|---|
| **Amber «sunset» border-beam-glød** | Deres merkevare. **Vår er grønn `#1ED27D`** — vi bytter glødfargen (eller bruker `DitherGradient`) |
| **Chat-first som dashboard-*innhold*** | TheFold er en agent-plattform; hjemmeskjermen deres ER en composer. **Vår forhandler-oversikt (F3-05) er KPI/kalender/bookinger.** Chat-mønsteret hører til F6, ikke admin-forsiden |
| **Feature-discovery-kort med bildeflater** | Deres onboarding (Integrations/Providers/Memory/Skills). Vårt admin har andre moduler |
| **`TheFoldBeam` / `border-beam`-pakken** | Ikke i vår stack. Glød gjør vi med dither/tokens |
| **Deres komponent-imports** (`@/components/ui/*`, `GradientBg`, `TheFoldBeam`) | Vi bygger av **shadcn + beUI + dither-kit** |
| **Google Sans / Departure Mono / Gelica** | Vår typografi kommer fra prototypen |
| **Hvit som aksent** | Vår aksent er grønn |
| Charts / grafer | **dither-kit** |

---

## 6. Grunntonen: mørk er nå BEKREFTET som TheFolds valg — men er det vårt?

Dette er den viktigste avklaringen som gjenstår.

**TheFolds dashboard er svart/mørkt** (`--brand-page: #000000`, kort `#151515`). De støtter *også*
et lyst «cream»-tema, men dashboardet kjører mørkt. Deres logo rendres derfor hvit (invert).

**For Endwise er ikke dette avgjort.** globals.css viser at samme kodebase enkelt bærer *begge* —
mappingen «merkevare-tokens → shadcn-semantikk» (som vi allerede har kopiert i vår `theme.css`)
gjør det til en tema-bryter, ikke en omskriving. Men **default-grunntonen** (svart som TheFold, eller
lyst) er en designbeslutning + kommer an på resten av prototypens tokens.

Konsekvens av valget:
- **Mørk default** → Endwise-logoen vises invertert/hvit i topbaren (som TheFold), grønn aksent
  lyser sterkt mot svart, dither-flatene ligger på mørk bunn.
- **Lys default** → logoen vises i sin grønne farge, dither-flatene på lys bunn (kontrast-sjekk,
  `UI-PAKKER.md` §2 regel 2).

---

## 7. Hva som fortsatt mangler før vi kan bygge admin-dashboardet

| # | Mangler | Status |
|---|---|---|
| 1 | **Aksentfarge** | ✅ **LÅST** — `#1ED27D` = dither `green` |
| 2 | **Grunnpalett** (bg, surface, border, fg, fg-muted) i **valgt** grunntone | ❌ Fra prototypen (F0-11) |
| 3 | **Lyst vs. mørkt som default** | ❌ **Din beslutning.** TheFold = mørkt/svart, men det er *deres* valg (§6) |
| 4 | **Typografi** (font + skala) | ❌ Fra prototypen. TheFold: Google Sans + Departure Mono + Gelica — vi trenger vår egen |
| 5 | **Radius/spacing** | 🟡 TheFold gir en kandidatskala (3/6/8/12/100, base 4px) — bekreft mot prototypen |
| 6 | **Admin-navstruktur** (menypunkter + ikoner) | ⏳ Utkast (Oversikt/Bookinger/Kalender/Mekanikere/Kunder/Support); bekreftes med deg |
| 7 | **Forhandler-oversiktens innhold** (KPI-kort, kalender, dagens bookinger) | ⏳ Fra UI-forslaget v2 (dither-dosering) |

**Kort sagt:** aksenten er låst, shellet + kort-systemet + token-strukturen er forstått fra det ekte
dashboardet. **Det blokkerende er fortsatt: resten av paletten + tema-beslutning (mørk/lys) +
typografi** — alt fra prototypen/Claude Design. TheFold ga oss én ny, konkret ting utover forrige
analyse: **en komplett kandidat-token-fil (`globals.css`)** vi kan speile strukturen fra når
verdiene kommer.
