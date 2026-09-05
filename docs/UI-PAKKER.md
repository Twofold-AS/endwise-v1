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

> ### ⚠️ Jonas CODE-NO-GO + Mikael Galaxy-merke (05.09.2026)
> Telefon-logo = **kun merke** (ingen «Endwise»-ord). Ronny toppbar/desktop/header
> spiller (`still={false}` + `playing`, idle happy/angry/spin). Dealer har ikke
> Organisasjon top-bar 2 / piller — `/organisasjon` er gruppert liste
> (Ansatte → Timeplan → Abonnement → Integrasjoner, valgfri dealer-meta).
> Galaxy på **både** Oppgrader-CTA og Enterprise-merke. ⛔ Galaxy på Ronny.
> **05.09 kveld (Jonas hard-fix):** Chrome-Ronny er `RonnyBot` (`playing={false}`,
> `state="idle"`). Sheet/desktop ikke rå BloubBot. Tittel uten shimmer.
> Spinn kun `data-ronny-spin='1'`. PhoneShell er `fixed` z-60; åpen sidebar
> starter under `h-row`, så merke og Ronny|toggle ikke hopper.

> ### ⚠️ Ronny-stripe er FJERNET — sheet på telefon (05.09.2026)
> Jonas/Mikael-lås: Grainient-stripen + peek-dock er borte. Telefon: ink-logo
> midt i toppbaren, tilbake-pil med hale, Ronny-avatar til venstre for
> sidebar-toggle. Avatar åpner bunn-sheet (80 % / 100 % av `dvh`/`visualViewport`,
> radius 16, `#fff`, ingen peek). Sheet kun `md:hidden`. Desktop: sidebar urørt,
> ingen stripe, ingen sheet i denne PR. ⛔ Grainient på Ronny. ⛔ Galaxy på Ronny.
> Galaxy er Oppgrader-CTA **og** Enterprise-merke. Se `docs/endwise-dealer-chrome-sheet-fasit.md`.
> Grainient-pakken ligger igjen (ubrukt i produkt-chrome).
> Åpen telefon-sidebar skyver ikke toppbar-chrome (PhoneShell `fixed` over overlay).

> ### ⚠️ Grainient er KUN Ronny-stripen; Galaxy er KUN Oppgrader (04.09.2026, overstyrt 05.09)
> Grainient (`react-bits` Grainient-JS-CSS + `ogl` ^1.0.11) er **bare**
> animert bakgrunn på workshop-stripen (telefon ~44px, desktop `h-control`
> / 32px) — avatar + «Trykk på KI-Ronny». Farger er Apple DESIGN.md:
> `color1="#0066cc"` Action Blue, `color2="#0071e3"` primary-focus,
> `color3="#2997ff"` primary-on-dark. ⛔ Ikke default rosa/lilla
> (`#FF9FFC` / `#5227FF`). Mørk `#111` bare under meshen for kontrast.
> Idle/peek-composer nederst (`fixed inset-x-0 bottom-0`, full
> viewport-bredde, `rounded-none` mot skjermkant; safe-area er padding
> *inne* i baren) er **transparent** — flyter over parchment, uten
> Grainient eller Galaxy. Idle/peek-stripe er **100 % skallbredde**
> (samme innholdskolonne som åpen overlay — `data-ronny-skall-bredde`,
> ikke Verksted-kort `max-w-[520px]` / `md:max-w-[1120px]`), med **samme
> hårlinje `#e0e0e0` + 18px** på prompt-kortet. Stripe = avatar + tekst — ingen
> dropdown/chevron. Peek: AI-boble under stripen, strek **under boblen**,
> prompt-bar full-bleed og transparent. Full-åpen **eller** når en
> KI-Ronny-melding vises: chat/kropp = Endwise parchment `#f5f5f7` — ingen
> Grainient, ingen Galaxy. Toppstripen beholder Grainient og endrer seg
> ikke. ⛔ Galaxy i Ronny (stripe/peek/full). ⛔ Galaxy på dealer-pergament.
> Galaxy er **kun** Oppgrader-CTA (`density={1}`, `#111`). Samme strek
> over prompt lukker til peek. Idle-tekst: «Trykk på KI-Ronny».
> Tenking = stripe-tekst, ikke logg-rad.
> Gradual Blur (topp+bunn) kun på logg som overlapper. Sidebar-åpning
> lukker Ronny til idle. Telefon-logg 14px; felt ≥16px. Ikke forhandler-hero.
> ShaderGradient er ute. Importer
> `@endwise/ui/grainient.css` og `@endwise/ui/galaxy.css`.
> `ogl` i både `@endwise/ui` og `@endwise/web`, og i `transpilePackages`. Hvit
> KI-Ronny (BloubBot) + «Trykk på KI-Ronny» er **midtstilt** i stripen
> (`absolute inset-0 items-center justify-center`, samme på PC og telefon —
> ikke venstrejustert, ikke klistret mot topp/bunn). Overlay uten layout-skyv.
> Idle-syklus hvert 5. sekund også når panelet er åpent: mer `colere`,
> `wink`/`burst` — ikke `thinking` i idle, ikke triste/somnolent.
> Oppgrader-CTA: React Bits Galaxy (`@react-bits/Galaxy-JS-CSS`), klippet inne
> i knappen, svart `#111`. Ikke Grainient på den knappen.

> ### ⚠️ blobatar er ute (31.08.2026)
> `Avatar` er bloub. Ikke importer `blobatar/*` i `globals.css`. Staff-farge er
> `ColorId` fra `skins.ts` COLORS — samme id på avatar, timeplan-kloss, jobb-kort
> og assignment-chip. Ikke finn opp en annen palett.
>
> ### ⚠️ matrix-loaders-gotcha (03.08.2026)
> `apps/web/app/globals.css` MÅ ha `@import "@endwise/ui/matrix-loaders.css";`. Loaderne er **ren
> CSS-animasjon** — komponentene setter bare klasser (`.dmx-root`, `.dmx-dot`) og CSS-variabler,
> mens keyframene bor i pakkens egen `styles.css`. Uten importen rendrer alle 93 loaderne som en
> stillestående prikkerute: ingen feilmelding, ingenting i typecheck, ingenting i `next build` —
> bare noe som ser ødelagt ut. Samme familie som Tailwind-gotchaen over. Gjelder ENHVER ny app.
> Eksporten `./matrix-loaders.css` ble lagt til i `packages/ui/package.json` samtidig.

> ### ⚠️ REVERSERT: «New» er RØD igjen (20.08.2026)
> Mellom 20.08 morgen og 20.08 kveld var «New»-badgen på hjelpeartikler grønn, etter bestilling.
> **Det er omgjort på eiers eget initiativ samme dag** — §6 gjelder uten unntak: «Ny» er RØD,
> overalt. Begrunnelsen som ble skrevet for grønt (uleste meldinger venter på handling, en ny
> artikkel gjør ikke det) holdt ikke i praksis: etter at aksenten ble svart, er rødt det eneste
> som faktisk fanger blikket i sidebaren. Noten står her og ikke slettet, så neste person slipper
> å ta samme runde en gang til.
>
> ### ⚠️ TELLERE ER SAMME BADGE-FORM SOM «Ny» (25.08.2026, overstyrer 24.08)
> Mikael før merge av #35: uleste-tellere (innboks, nav, helpdesk-antall) er **samme
> `Badge variant="destructive"` som «Ny»** — 20px høyde, 6px radius, siffer i stedet
> for teksten «Ny». Ikke 18px-sirkelen (`CountBadge` med `rounded-full` / `bg-danger` /
> hvit tekst) som 24.08 innførte. Ikke grå pille, ikke grønn. 0 = skjult.
>
> I sidebaren: «Ny» er første merke etter label. På rader **uten** barn (Innboks,
> Helpdesk) sitter telleren i chevron-sporet — helt til høyre, der pilen sitter på
> dropdown-rader. På rader **med** barn: Ny → teller → chevron ytterst.
>
> 24.08-noten om at skillet var formen (sirkel vs. «Ny»-tekst) er **overstyrt**.
> Skillet er innholdet (siffer vs. «Ny»), ikke to ulike former.

> ### 🔴 EIERENS DESIGN-PRINSIPPER HAR FORRANG (03.08.2026, aksent endret 06.08)
> ⚠️ **AKSENTEN ER ACTION BLUE, IKKE GRØNN** (02.09.2026, Mikael Apple på hele appen).
> `--ew-accent` er `#0066cc` / fokus `#0071e3` i lyst tema. Ink `#1d1d1f`, parchment-side
> `#f5f5f7`, kort/sidebar `#ffffff`. Inter beholdt (ikke SF Pro). Mørk utility / Oppgrader /
> Ronny-paper kan fortsatt være `#111`. Switch-track følger aksenten.
> Suksess-grønnen (`--ew-success`) er BEHOLDT — den er informasjon, ikke merkevare.
> «Ny»-badgen er RØD (tekstbadge). Tellere er samme røde badge-form med siffer.
> Logogrønnen `#1ED27D` er urørt (bor i logo.svg).
> Inter · titler 16/20 Semibold · labels 13/16 · brødtekst 17/1.47 · knapper 32px / pille-CTA ·
> rader 40px (data) og 44px (stores) · badge 20px/6px · switch 24×14/10px · tekst ink/muted ·
> **LYST TEMA ONLY**. Ingen tema-toggle. Ingen `[data-theme=dark]`-brukersti.
> **Full tabell + hva som er utledet: §6 «Design-prinsipper fra eier».** Kolliderer noe i denne
> fila med den seksjonen, er det den seksjonen som gjelder.

**Sist oppdatert:** 5. september 2026 (Jonas hard-fix: chrome-Ronny = `RonnyBot`, `playing={false}`, tittel uten shimmer, spinn kun `data-ronny-spin='1'`) · 5. september 2026 (Mikael: Ronny uttrykk-only, PhoneShell `fixed` så åpen sidebar ikke flytter merke/Ronny|toggle) · 5. september 2026 (Jonas CODE-NO-GO + Mikael: merke-only logo, levende Ronny, Organisasjon-liste, Galaxy på CTA og Enterprise-merke) · 5. september 2026 (Jonas: desktop Ronny = høyre overlay 400px, avatar i sidebar-header) · 5. september 2026 (Jonas/Mikael: dealer-chrome Ronny-sheet — stripe/peek borte, telefon 80/100, ink-logo midt) · 5. september 2026 (Mikael: offentlig landing-logo er ink `#1d1d1f` / `bg-fg`, ikke `#1ED27D`) · 5. september 2026 (Mikael/Jonas: offentlig landing-CTA er Action Blue `#0066cc` / `--ew-accent`, ikke produkt-`#111`) · 5. september 2026 (Jonas-fasit: Apple-markedsside `/` — `ProduktRamme`, merke ink på `/`) · 5. september 2026 (dealer-chrome: lukket Ronny-stripe full skallbredde; sidebar-toggle ytterst til høyre; Oppgrader-CTA følger nivå, Enterprise = merke; TilbakePil er kun pil-SVG; hjem-kort fylt fra tRPC) · 4. september 2026 (Mikael: Galaxy fjernet fra Ronny; Apple-Grainient KUN på stripen `#0066cc`/`#0071e3`/`#2997ff`; full/peek-kropp parchment `#f5f5f7`; composer transparent; #119 obsolete) · 3. september 2026 (Mikael: Ronny full-åpen = Galaxy density 2.5 på `#111`, ikke Grainient — **overstyrt 04.09**) · 3. september 2026 (Mikael Ronny-IA: flytende prompt — peek/dock-composer transparent uten Grainient; full-åpen beholder stripe-flate-Grainient) · 2. september 2026 (Mikael Ronny-IA: full-bleed prompt-bar 0 radius, ett Grainient i full) · 2. september 2026 (Mikael: transaksjonell e-post = Apple/app-chrome, §8) · 2. september 2026 (Mikael Ronny-IA: stripe uten dropdown, strek under peek-boble / over full-prompt, flush grainient-composer) · 2. september 2026 (Mikael Ronny-IA: peek uten overlay, full kun via strek) · 2. september 2026 (Mikael Ronny-IA: ugjennomsiktig overlay, fullbredde-composer, Gradual Blur, «Trykk på KI-Ronny», sidebar lukker Ronny) · 2. september 2026 (Mikael Ronny-IA: stripe=prompt-hårlinje, full-åpen viewport-grainient, tenking i stripe, hevet composer) · 2. september 2026 (Mikael Ronny-IA: Verksted-bredde, lavere prompt, tettere håndtak) · 2. september 2026 (Mikael Ronny-IA: 18px alltid, ingen hvit canvas, Apple-ease, tenke-shimmer, full-åpen uten composer-Grainient) · 2. september 2026 (Mikael sticky composer + iOS 16px-felt) · 2. september 2026 (Mikael Ronny-dock: idle uten thinking, «se hele» på grainient, Prompt-kort = Verksted-hero, fullscreen-overlay) · 2. september 2026 (Mikael: desktop-skinne, Endwise-IA, Galaxy på Oppgrader, Ronny midtstilt, leftover 2FA-porter) · 1. september 2026 kveld (Mikael IA+auth: TipCard ut, Grainient-oppgraderingspille, TilbakePil SVG, org-piller overalt, magic link + TOTP) · 1. september 2026 kveld (Mikael: KI-Ronny i Grainient-stripe til venstre, blink 10s, bunndock-input, telefon 44px; desktop-sidebar overlay som telefon, logo 18px) · 1. september 2026 kveld (Mikael: Grainient 32px bot-stripe, hvit bloub uten sirkel; ShaderGradient ute; sidebar-logo 18px, ingen forhandlernavn/Innstillinger/bunn-divider) · 1. september 2026 kveld (Mikael: telefon bruker samme sidebar som desktop — fullskjerm-overlay, fast toppbar, ingen bevel; ShaderGradient-stripe også på telefon — ingen ny pakke) · 1. september 2026 (Mikael desktop-chrome: hvit sidebar, TipCard-Hjelp, ShaderGradient AI-stripe, Grainient og mørkt tema ut — se §1/§6) · 31. august 2026 kveld (intern `/bot`-lab: Morph Bot fjernet, bloub pin `b4bb3c1` vendorisert — se §11) · 31. august 2026 (intern `/bot`-lab: Morph Bot-runtime vendorisert + original Endwise-blob, ikke produkt-avatar — se §11) · 30. august 2026 (Mikael: mørk sidebakgrunn `#000000`; blobatar gaze på profil-avatar, form/humør/tone ut av velgeren — blobatar 2.7.0, ingen ny pakke) · 29. august 2026 kveld (Mikael: destinasjon Salg på `/prisliste`, Prisliste ut av Timeplan — ingen ny pakke) · 29. august 2026 kveld (Mikael: mekaniker-hjem stort Dine jobber 3 faste spor, Start/Stopp/Fullført, mer forhandler-info på Grainient — ingen ny pakke) · 29. august 2026 kveld (Timeplan: Opprett jobb + Prisliste under tittel, tre dag-chips — ingen ny pakke) · 29. august 2026 natt (Timeplan-knapper på pillerad, måned/dag uten klipp, widget-init lookup — ingen ny pakke) · 29. august 2026 kveld (Mikael: Timeplan + Tjenester, Prisliste som Dialog på Timeplan, widget tom/retry — ingen ny pakke) · 29. august 2026 (Butikk: testplassering av eksisterende EndwiseWidget på `/butikk` — ingen ny pakke) · 29. august 2026 kveld (F5-13: telefon-bevel `mt-auto` i min-h-dvh-kolonne, Grainient samme grå i lys/mørk — ingen ny pakke) · 29. august 2026 natt (Mikael IA-lås: Grainient fra react-bits på forhandler-kort, Dine jobber, telefon-bevel i flyt, Timeplan-piler 08–20, starttid-expandere, ferie-mock) · 29. august 2026 (telefon kort-hjem + safe-area/dvh — ingen ny pakke; fylte aksentkort, accordion på mekaniker-rad) · 28. august 2026 (Innboks: ingen Oversikt, telefon filter+Ny chat, desktop tom postkasse, tilbake-pil i end-spacer — ingen ny pakke) · 28. august 2026 (Profil: avatar+endre-knapp på rad, felt ut av CardShell — ingen ny pakke) · 28. august 2026 (Innboks top-bar 2 Oversikt + ikonfiltre — ingen ny pakke) · 28. august 2026 (telefon: end-spacer + top-bar 2 py + uten Handlinger — ingen ny pakke) · 28. august 2026 (telefon hovedmeny: h-row + pinnest logo + pan-x — ingen ny pakke) · 27. august 2026 (Organisasjon › Forhandleren: CardShell + native input + StatefulButton — ingen ny pakke) · 26. august 2026 (Team Hvem + pane-høyde: Avatar/StatusMerke i Hvem, Endre folder ut e-post/rolle — ingen ny pakke) · 26. august 2026 (Team-redesign: piller + Inviter ansatt + Innboks-detaljpane — ingen ny pakke, samme tablist som Innstillinger og Dialog som slett-forhandler) · 26. august 2026 (F10-03 intern testbutikk: Katalog + Handlekurv / kasse — ingen ny pakke, samme radmønster som Lager › Deler) · 25. august 2026 (F3-09/P3: Ny jobb med flere tjenester + manuell varighet — ingen ny pakke; samme radmønster som mekanikervelgeren) · 25. august 2026 (F1-27 to-stegs e-postbytte + F2-08 Vegvesen-nøkkel i innstillinger — ingen ny pakke) · 25. august 2026 (F3-08/F3-12: Ansatte › Kompetanse + Timeplan — ingen ny pakke, samme komposisjon som Prislisten) · 25. august 2026 (F5-51/F3-05: helpdesk-kategorier + Verkstedet timeplan/ansatte på jobb — ingen ny pakke, pille-tablist + CardShell + Avatar) · 25. august 2026 (F6-19: avatar-velger med farge+humør ved opprett og «Ny tilfeldig»; siste farger 270/320 — ingen ny pakke) · 25. august 2026 (F5-23: minimer på helpdesk-slider, ikke visningsvelger — ingen ny pakke) · 25. august 2026 (F5-13/F5-19 IA-lås: Settings = Link til profil, ikke flyout; Organisasjon over Helpdesk — ingen ny pakke) · 25. august 2026 (F5-19: pille-faner uten Team — Team er sidebar-destinasjon #41; Profil-avatar 56px til venstre, form+uttrykk foldet — native `<details>`) · 25. august 2026 (Ny samtale: Kunde · Intern · Support — ingen ny pakke) · 25. august 2026 (`CountBadge` = samme `Badge variant=destructive` som «Ny», 20px/6px — ikke 18px-sirkel; Helpdesk-teller i chevron-sporet — ingen ny pakke) · 25. august 2026 (F6-19: status-humor på Team › Funksjoner + `/mekanikere`; fri→idle; sidebar/profil viser valgt humor — ingen ny pakke) · 24. august 2026 (F6-19: uttrykk låst opp i `AvatarVelger` + status-humor på mekanikerflaten — ingen ny pakke) · 24. august 2026 («Ny»-badge + rød `CountBadge` — ingen ny pakke) · 23. august 2026 (sidebar-avatar `alltid` + formvalg i Profil — ingen ny pakke) · 23. august 2026 (plattform-org + Se verkstedet + `/endwise/team` — ingen ny pakke, shadcn/beUI-komposisjon) · 23. august 2026 (F1-21/F1-22: gjenopprettingskoder + passord før 2FA av — ingen ny pakke) · 23. august 2026 (SMS-avkrysning synlig i Ny forhandler/Endre pakke — Jens overstyrer UI/UX P0 som skjulte den; shop forblir skjult) · 23. august 2026 (UI/UX P0: invite+2FA i samme skall, `/oppstart` uten avatar, `AvatarVelger` = 48px + Ny tilfeldig / always happy, varslingslyder som Switch-rad, pakkevelger 3 kolonner) · 23. august 2026 (F5-26: nivå+tillegg, `/oppstart`, `AvatarVelger` i `_avatar/` — ingen ny pakke, ingen cmdk) · 22. august 2026 (widget-fallbacks + PWA-manifest følger lyst tema og svart aksent `#111` — F4-20; stale «grønn aksent»-kommentarer rettet) · 20. august 2026 (bevegelse skrudd på selektivt — påkrevd `bevegelse`-prop på `Avatar`, tre verdier, se §10 · ⭐ **blobatar inn som avatarpakke** — F6-19, brukergodkjent §2-beslutning; se §10. Seed = stabil ID, aldri navn · tjenestekatalogen F2-05/F5-04 — ingen ny pakke, ren komposisjon; se §8. ⚠️ Første sted i appen med ekte radioknapper i stedet for pille-gruppe, fordi det er et skjemafelt og ikke et filter) · 7. august 2026 (dev-mode + forhandler-oppretting bygget — F5-26…F5-29; ingen nye UI-pakker, alt på shadcn/beUI som før: `Switch`, `StatefulButton`, `DropdownMenu`, `Badge`. Sidebar-mønsteret delt i to: **flyout for handlinger, inline utfolding for destinasjoner**) · 6. august 2026 (⚠️ **aksent grønn → svart** i token-laget · felles flyout-mønster m/ stiplet header-divider · ⭐ **F5-20 i gang** — 26 egne SVG-ikoner koblet inn via codegen · shell-justeringer: kollapsbar sidebar, tips-kort, bevel-handlinger · Analyse omformet: periodevelger, nye kort, paigraf · `Pie`/`Cell` eksponert) · 5. august 2026 (⭐ **Recharts inn som chart-motor** — brukergodkjent §2-beslutning; Analyse F5-18 bygget ferdig med søyle-, linje- og arealgrafer) · 4. august 2026 (sidebar-først shell bygget — F5-13: `dropdown-menu` + `dialog` hentet inn, ⌘K-palett på `Dialog` i stedet for `command`/cmdk) · 3. august 2026 (eierens design-prinsipper innført: Inter + lyst tema standard +
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
| **Bakgrunn (AI-stripe)** | Grainient (`ogl`) | **Ubrukt i produkt-chrome etter 05.09.2026** (Ronny-sheet). Pakken ligger igjen. ⛔ Ikke stripe. ⛔ Ikke sheet-header. Galaxy er Oppgrader. |
| **Logg-fade** | Gradual Blur (lokal kopi) | React Bits API, vendoret i `_workshop/gradual-blur.tsx` uten `mathjs`. Kun når loggen overlapper. |
| **Oppgrader-CTA** | Galaxy (`ogl`) | React Bits Galaxy: oval Oppgrader-knapp **og** Enterprise-merke (`density={1}`, `#111`). Ikke Grainient. Ikke Ronny. Ikke dealer-pergament. |
| **Identitet** | bloub (`BloubBot`) | Cercle + store øyne. Én ColorId per ansatt (12 faste). Se §10 |
| **Maskot-lab** | bloub (`jeremy-prt/bloub`) | Intern `/bot` lever videre. Se §11 |

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
| **Hentet inn** | `dropdown-menu` + `dialog` (04.08.2026 — kontekstbytte i sidebaren og ⌘K-paletten; skrevet etter shadcn-oppskriften på `radix-ui`, registry-CLI ikke tilgjengelig i miljøet), `button`, `badge` (shadcn Badge — erstattet primitiv-Badgen; `NewBadge`-wrapper i app-shellet), **`cuelume`** (08.08.2026 — varslingslyder, MIT, 0 avhengigheter, Web Audio; brukergodkjent §2. KUN innkommende meldinger; `bind()` brukes bevisst IKKE, se §8), **`switch`** (03.08.2026 — skrevet etter shadcn-oppskriften på `radix-ui`s `Switch`, som allerede var en avhengighet; registry-CLI var ikke tilgjengelig i miljøet), **Grainient + `ogl` ^1.0.11** (01.09.2026 kveld — 32px workshop-stripe. ShaderGradient/`@react-three/fiber`/`three` fjernet samme kveld), **Galaxy + `ogl`** (02.09.2026 — `@react-bits/Galaxy-JS-CSS` i `@endwise/ui`, MIT via React Bits, klippet i Oppgrader-pillen) |
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
| `@endwise/widget-tokens` | `--ew-*`-tokens (lys/mørk/aksent). ✅ **Lyst tema er standard** (eier 03.08.2026). **02.09.2026:** interaktiv aksent er Action Blue `#0066cc` (fokus `#0071e3`). Ink `#1d1d1f`, parchment-side `#f5f5f7`, kort/sidebar `#ffffff`. Inter. Logogrønnen `#1ED27D` er merkevare i logo.svg. Nye tokens: `surface-2`, `border-strong`, `fg-faint`, `accent-dim`, `warn/danger/success`, `glass-*`, `radius-xl/pill` |
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
| **Titler** | 16px / 20px linjehøyde / Semibold (600), tettere tracking | `text-title` |
| **Labels** | 13px / 16px / Regular (400) | `text-label` |
| **Brødtekst** | 17px / 1.47 / Regular (400), lett tight tracking | `text-body` |
| **Knapper** | 32px høyde · CTA-pille 9999 · utility 8px | `h-control` · `rounded-pill` / `rounded-control` |
| **Datarad** | 40px | `h-row` |
| **«Stores»-rad** | 44px | `h-row-store` |
| **Badge** | 20px høyde · 6px radius · fyll aksent-soft · tekst aksent-strong | `h-badge` · `rounded-badge` · `bg-accent-soft` · `text-accent-strong` (eller shadcn `<Badge>`) |
| **Switch** | 24×14px track · 10px thumb · track følger aksent | `<Switch>` · `--ew-switch-*` |
| **Tekst** | ink `#1d1d1f` · muted `#7a7a7a` | `text-fg` · `text-fg-muted` |
| **Lyst (ONLY)** | parchment-side `#f5f5f7` · sidebar/kort `#ffffff` · valgt `#ededed` | `bg-bg` · `bg-sidebar` · `bg-sidebar-active` |

**Lyst tema er låst** (`<html data-theme="light">`). Ingen ThemeToggle. Ingen bruker-sti til
`[data-theme=dark]`. Token-fila kan fortsatt ha dark-blokken for widget; produktet bruker den ikke.

**Tre tekst-utilities, ikke ni.** `text-title` / `text-label` / `text-body` bærer størrelse,
linjehøyde **og** vekt. Det finnes derfor ikke en variant der noen glemte vekten. Bruk dem — ikke
`text-sm`/`font-semibold`-kombinasjoner. Til meta/tidspunkt brukes `text-[12px]` (se «Hull» under).

**Tre komponenter avviker nå bevisst fra oppstrøms**, fordi en spec som må huskes ved hvert
kallsted er en spec som brytes ved den femte bruken:

| Fil | Avvik |
|---|---|
| `components/button.tsx` (shadcn) | `rounded-pill` på primær + `text-label` + `h-control` i stedet for `rounded-md`/`text-sm`/`h-9` |
| `components/motion/button/base.tsx` (beUI) | `SIZE_CLASS` gir 32px; primær er pille-CTA, utility 8px |
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

**Logofargen i `logo.svg` er merkevare, ikke UI-aksent.** Offentlig landing (`/`) farger
merket med ink `#1d1d1f` / `bg-fg` (Mikael 05.09.2026) — ikke `#1ED27D`. Dealer-chrome
bruker `logo.svg` uten markeds-masken. `--ew-accent` er **Action Blue `#0066cc`** i lyst tema (02.09.2026,
Mikael Apple) og **`#ffffff`** i mørkt. Primærknapper er blå piller. Mørk utility /
Oppgrader / Ronny-paper kan være `#111` / `#1d1d1f`. Ikke grønn, ikke roadmap-rød `#EE2924`.

`--ew-success` (`#15B042` / `#1ED27D` i mørkt) er informasjon, ikke knappfarge.
`--ew-accent-soft` = **`#e8f1fb`** i lyst tema (aksentfylt flate).

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
| `ai-elements` | Conversation, Message, Plan, Task, Voice | **02.09.2026 (Mikael / Ronny):** `PromptInput` + `Textarea` + `Footer` + `Submit` er hentet som komposisjon i `packages/ui/src/components/prompt-input.tsx` (samme navn og Enter/Shift+Enter som AI Elements). Full registry (`command`/`select`/`hover-card`/`attachments`) er **ikke** tatt inn — Mikael forbød model-picker, globe og vedlegg. Diagnose-chatten fortsetter på §9 `message`/`message-scroller`. Igjen står `Plan`, `Task` og `Voice`. |

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
| `NewBadge` / `CountBadge` (`apps/web/app/(app)/_shell/cards.tsx`) | **Ingen ny pakke.** Begge er shadcn `Badge variant="destructive"` (20px/6px, `h-badge`/`rounded-badge`). `NewBadge` viser «Ny»; `CountBadge` viser siffer + sr-only-label og skjuler 0. Mikael 25.08.2026: samme form, ikke 18px-sirkel. Wrapperen finnes fordi 0-skjul og skjermleser-label ikke hører hjemme i CVA-en. |
| `KanalMerke` / `KanalLinje` (`apps/web/app/(app)/innboks/_kanal.tsx`) | **Ingen ny pakke.** Kanal-indikatoren er sammensatt av det vi allerede har: badge-tokenene fra §5 (`h-badge` · `rounded-badge` · `bg-accent-soft`/`bg-warn-soft`/`bg-surface-2`) og ikoner fra `@endwise/ui`-barrelen (`Phone`, `Mail`, `MessageSquare`, `Globe`). shadcn `Badge` dekker ikke ikon + kanaltone + `title`-setning i ett, og resten av innboksen bruker allerede inline token-badger (`KIND_TONE`) — å blande to badge-mønstre i samme liste ville sett ut som to systemer. Kanalen bæres av IKONET, ikke fargen, så indikatoren fungerer også for fargeblinde |
| Admin-shell + oversikt-komposisjoner (`apps/web/app/(app)/…`: `Sidebar`, `SupportCard` + `BevelButton`/`BEVEL` (TheFold-kortstil, telefon), `SectionCard`, `KpiCard`, `BookingsTable`, `RevenueTable`, `DealerList`; `_shell/nav.ts`, `_lib/use-org-role.ts` rollegate) | **Ikke** gjenbrukbare primitiver — de er app-nivå *komposisjoner* av eksisterende pakker (shadcn `Button` + `@endwise/ui`-ikoner + tokens). Breadcrumb-`TopBar` er fjernet (01.09.2026). `BookingsTable`/`RevenueTable` er vanlige `<table>`-er skrevet 03.08.2026 da dither-grafene ble fjernet — shadcn `table` kan hentes inn og erstatte dem når noen orker. De hører til `apps/web`, ikke `@endwise/ui`, så de står her kun for sporbarhet. Ingen ny pakke tatt inn |
| Sidebar-først shellet (`apps/web/app/(app)/_shell/`: `nav.ts`, `sidebar.tsx`, `sidebar-header.tsx`, `phone-shell.tsx`, `phone-home.ts`, `phone-home-dealer.tsx`, `phone-home-mekaniker.tsx`, `phone-kort.tsx`, `phone-chrome.ts`, `phone-h-scroll.tsx`, `seksjon-bar.tsx`, `seksjon-sti.ts`, `side-piller.tsx`, `oppgrader-pille.tsx`, `tilbake-pil.tsx`) + destinasjonene `saker/`, `samarbeid/`, `analyse/`, `endwise/` (inkl. `/endwise` oversikt, `/endwise/flagg`, `/endwise/team`, `/endwise/verksted/[slug]`, F1-07/F0-04/F5-11), `innstillinger/*`, `oppstart/` (F5-26 eier-veiviser) | App-nivå **komposisjoner** (F5-13). Bygget av `@endwise/ui`. **05.09.2026 (Mikael uttrykk + fast chrome):** Ronny-avatarer `state='idle'` + uttrykk (⛔ thinking/alert/notify). PhoneShell `fixed` z-60; telefon-sidebar-header skjult; overlay under `h-row`. **05.09.2026 (Jonas desktop Ronny):** Avatar i sidebar-header rett til venstre for toggle (`hidden md:inline-flex`). Høyre overlay-panel over main, max 400px, lett scrim, Escape/X. Ingen forstørr/handle/sheet/stripe på desktop. Telefon-sheet urørt. **05.09.2026 (Jonas/Mikael Ronny-sheet):** Telefon-toppbar = ink-logo midt, tilbake-pil med hale, Ronny-avatar + sidebar-toggle ytterst. Stripe/peek borte. Sheet 80/100 kun `md:hidden`. **05.09.2026 (dealer-chrome bugfix, delvis overstyrt):** Oppgrader-pille følger `planKey` (Enterprise = merke). Hjem-kort fylt fra eksisterende tRPC. **01.09.2026 kveld (Mikael IA+auth):** Hjelp-`TipCard` er ute. Nederst sitter Galaxy-`OppgraderPille` («Oppgrader til {neste}») eller Enterprise-merke. Forhandlernavn er ren `<h1>`, ikke kort. Telefon: sidebar-ikon ytterst til høyre, Tilbake er pil (`history.back()`). `DestinasjonSeksjonBar` under toppbaren. Samarbeid borte fra telefon-hjem. Piller er Organisasjon-stil (`bg-sidebar-active`, wrap, ingen slider). Innboks: én verktøylinje i lista, telefon skjuler lista når en tråd er åpen. Åpen tråd: dest-bar = Tilbake + slett + Inviter ansatt. Hero på Verkstedet = forhandlernavn. **01.09.2026 kveld:** overlay-sidebar, lys-only. `/bot` lever som URL, ikke i nav. |
| `TilbakePil` (`apps/web/app/(app)/_shell/tilbake-pil.tsx`) | **Ingen ny pakke.** 05.09.2026 sheet-lås: pil **med hale** (`M19 12H5` + hode, stroke 2, 24px viewBox). Ingen synlig «Tilbake»-tekst, ikke lucide. `aria-label="Tilbake"` sitter på knappen/lenken. |
| `RonnyPil` (`_workshop/ronny-ikoner.tsx`) | **Ikke i stripen.** Mikael 02.09.2026: stripe er avatar + tekst. Chevron/dropdown ved «Trykk på KI-Ronny» er slettet. Komponenten ligger igjen som asset-path; brukes ikke i dock-IA. |
| `RonnyHandtak` (`_workshop/ronny-ikoner.tsx`) | **Ingen ny pakke.** Horisontal strek (iOS-grabber), ~36×5 muted capsule over **telefon**-sheet-header. Ikke på desktop. Swipe ned lukker, tydelig swipe opp → 100 %. shadcn/vaul Sheet er ikke hentet. |
| Desktop Ronny overlay (`workshop-bloub.tsx` `data-ronny-desktop-panel`) | **Ingen ny pakke.** Egen `absolute` overlay i innholdskolonnen (ikke push av sidebar). Max 400px, lett scrim, header avatar+«Ronny» / X. Samme begrunnelse som telefon-sheet: vaul/shadcn Sheet er ikke i stacken. |
| `.ronny-tenker-tekst` (stripe-label) | **Ingen ny pakke.** Chrome-tittel er rolig «Ronny» — klassen er ikke montert. `sr-only` «Ronny tenker…» når chat streamer. Avataren er `RonnyBot` (`state="idle"` + `playing={false}`). Spinn kun `data-ronny-spin='1'`. |
| `GradualBlur` (`_workshop/gradual-blur.tsx`) | **React Bits Gradual Blur**, lokal kopi (MIT) uten `mathjs` — ikke ny runtime-dep. Samme API (`target`/`position`/`height`/`strength`/`divCount`/`curve`/`exponential`). Kun på Ronny-loggen når den overlapper. |
| `OppgraderPille` (`apps/web/app/(app)/_shell/oppgrader-pille.tsx`) | **Galaxy** (§1) på **både** neste-nivå-CTA og Enterprise-merke. Oval, Galaxy klippet inne, svart `#111`. Tekst fra `nesteTier`/`oppgraderKnappetekst` + `visOppgraderCta` i `@endwise/modules/billing` — Start → «Oppgrader til Pro», Pro → «Oppgrader til Enterprise». `planKey` = Stripe-rad, ellers `tenants.plan`. **Enterprise = merke** (`data-plan-badge`) med samme Galaxy, uten lenke. Ingen priser. |
| Meldings- og AI-flatene (`apps/web/app/(app)/`: `innboks/page.tsx` + `innboks/[id]/page.tsx` + `_lib.ts` + `_chrome.tsx` / `_modus.tsx` + `_ny-samtale.tsx` + `_inbox-sidebar.tsx` + `_inviter-ansatt.tsx`, `endwise/innboks/`, `integrasjoner/ai/page.tsx`, `_lib/use-event-stream.ts`) | App-nivå **komposisjoner**, ikke primitiver: shadcn/beUI-knapper (`Button`) + Prompt Input + matrix-loaders + `@endwise/ui`-ikoner + `CardShell`/`CardMedia`. F5-11 (23.08.2026): `/endwise/innboks` gjenbruker innboks-chrome (`modus=endwise`). F5-14 (25.08.2026, Jonas + Mikael): Ny chat er e-post-aktig liste + tre piller (Kunde · Intern · Support). Intern = verkstedsgulvet (`mechanics.list`), ingen fjerde Mekaniker-pille. <b>02.09.2026 (Mikael IA C–F):</b> Én innboks-verktøylinje (Nyeste · Eldste · slett · ny chat · velg kort), min 44px, `z-20`. Tråd-composer = samme Prompt Input som Ronny. Åpen tråd: dest-bar blir Tilbake + rød slett + Inviter ansatt. Inviter **forker** ny gruppesamtale (`messages.forkThread`); gammel tråd får systemlinje og står urørt. Dialog fra shadcn. Ny melding = `NyMeldingIkon` (`Messages-plus.svg`). Innboks-faner i dest-bar bare på lista. Filtre er ikke destinasjoner (`InboxFilterProvider`). shadcn `toggle-group` er ikke hentet inn; aktiv = `bg-sidebar-active`. `SupportKort` og `EndwiseForhandlerDetaljer` er lokale rader — shadcn har ingen innboksrad med forhandlernavn + muted utdrag + aksentprikk. «Se verkstedet» er en `Link` til `/endwise/verksted/[slug]` (ikke setActive). `use-event-stream.ts` er en **datahook**, ikke UI. Ingen ny pakke tatt inn |
| Kundewidget (`@endwise/widget-ui`: `EndwiseWidget` + `BookingPanel` + `mountEndwiseWidget`, F4-03) | **Frittstående, cross-origin embed** på forhandlerens (Framer-)nettside — den kan IKKE dra inn appens shadcn/Tailwind/dither-kit (ingen delt build, ingen `@source`-skanning på tredjepartssider). Derfor bevisst **avhengighetslett**: inline styles som leser `@endwise/widget-tokens` sine `--ew-*`-CSS-variabler (samme token-sannhet som resten). React er eneste runtime-avhengighet (peer). [ART50-UI]-opplysningen er egen markup her fordi widgeten ikke deler DOM/pakke med `@endwise/ui`. Nye deps: `react`/`react-dom` (widget-ui, peer), `framer-plugin`/`vite` (framer-plugin) |

| `ProduktRamme` på markedssiden (`apps/web/app/_markeds/`, F5-35, Jonas 05.09.2026) | **Ingen ny pakke, og ingen pakke å hente.** Fast spor til UI-skjermbilde: `aspect-[16/10]` (desktop) / `aspect-[9/19]` (telefon), `rounded-[14px]`, `border-border`. Uten `kilde` = lys UI-plassholder; med statisk import = `next/image` i samme boks (ingen reflow). ⛔ Ikke stock-mekaniker. ⛔ Ikke arkitektur-JPEGene som «produktskudd». Primær CTA er Action Blue `#0066cc` (`bg-primary` → `--ew-accent`; hover `--ew-accent-strong` `#0071e3`) — Mikael/Jonas etter #129. Ikke produkt-`#111`, ikke `bg-accent` (parchment), ikke logogrønn. Offentlig merke (`Merke` i `_markeds/markeds-chrome.tsx`) er ink `bg-fg` / `text-fg` (`#1d1d1f`) via maske på `logo.svg` — Mikael 05.09.2026 etter #133. Dealer-chrome bruker `logo.svg` uten denne masken. |

| Tjenestekatalogen (`apps/web/app/(app)/innstillinger/tjenestekatalog/`: `page.tsx`, `_felter.tsx`, `_ny-tjeneste.tsx`, `_tjeneste-kort.tsx`, `_felles.ts`) | App-nivå **komposisjon** (F2-05/F5-04), ingen ny pakke. Bygget av `StatefulButton` (beUI), `CardShell` og ikon-barrelen, med de samme input-klassene som `kunder/_ny-kunde.tsx` — feltene er kopiert i klassestreng, ikke i komponent, fordi shadcn `form`/`input` ikke er hentet inn og resten av appen ikke bruker dem. ⚠️ Kjøretøytype-velgeren er **ekte `<input type="radio">`** og ikke pille-knapper med `role="radio"`, som ellers i appen: pillene andre steder er FILTRE (tablist er riktig der), denne er et skjemafelt, og biome avviste `role="radio"` med rette. Utseendet er likt. `_felter.tsx` finnes for at «opprett» og «ny versjon» skal dele ÉN definisjon av versjonsfeltene — to skjemaer for samme fire kolonner ville før eller siden fått ulik validering |
| Ny jobb — flere tjenester (`apps/web/app/(app)/bookinger/ny/page.tsx`, F3-09/P3) | **Ingen ny pakke.** Flervalget er samme radmønster som mekanikervelgeren på samme side (`aria-pressed` + `Check`), ikke shadcn `checkbox` (ikke hentet inn). Varighet er native `input type="number"` — shadcn `input` er ikke hentet, og feltet deler klassestreng med resten av skjemaet. En egen multi-select ville vært en ny primitiv uten grunn. |

| Intern testbutikk (`apps/web/app/(app)/butikk/`: `page.tsx`, `kasse/page.tsx`, `_kurv.ts`, `_booking-widget.tsx`, F10-03) | App-nivå **komposisjon**, ingen ny pakke. Samme skall som Lager › Deler: `CardShell`, shadcn `Button`, beUI `StatefulButton`, native `input type="number"` med `h-control`/`rounded-control`. Handlekurven er `sessionStorage` — shadcn har ingen handlekurv, og en egen cart-pakke ville vært en §2-sak for en intern preview. Egen kode fordi ingen pakke dekker «lagerkatalog + Stripe test-kasse». Ikonet `ShoppingCart` lagt i lucide-barrelen. <b>29.08.2026:</b> midlertidig testplassering av eksisterende `EndwiseWidget` (`@endwise/widget-ui`, F4-03) på `/butikk` — ikke en ny booking, ikke en ny UI-pakke. |

| Ansatte › Kompetanse og Timeplan (`apps/web/app/(app)/mekanikere/kompetanse/`, `mekanikere/kapasitet/`, F3-08/F3-12) | App-nivå **komposisjon**, ingen ny pakke. Samme skall som Prislisten og mekanikerlista: `CardShell`, `Avatar`, `StatefulButton`, native `<input>`/`<select>` med `FELT`-klassen (shadcn `form`/`select` er ikke hentet). Kompetanse viser nivå som ord (`SKILL_LEVELS`) og sert. t.o.m. med samme 60-dagers varsel som Min kompetanse. Timeplan gjenbruker 7-dagers strip + jobb-radene fra mekanikerens Timeplan (`fmtTime` / `STATUS_LABEL`). Egen kode fordi ingen pakke dekker «ferdighet per ansatt med utløpsdato» eller «kapasitet + dagens jobber» — og å hente shadcn `table`/`calendar` for to rader ville gitt et annet visuelt system enn resten av Ansatte |

| Organisasjon › Forhandleren (`apps/web/app/(app)/organisasjon/forhandleren/`, F5-13/F8-01, 27.08.2026) | **Ingen ny pakke.** Samme skall som Profil og Prislisten: `CardShell`, beUI `StatefulButton`, native `<input>` med `h-control`/`rounded-control` (shadcn `form`/`input` er ikke hentet). Slug er read-only. «Mer fra Quick» er native `<details>` over leftover-nøkler — ingen hardkodede kategorinavn. Egen kode fordi ingen pakke dekker «butikkfelt + leftover jsonb». Kallenavn/visningsnavn/2FA bor i Innstillinger. |

| Team-redesign (`apps/web/app/(app)/innstillinger/team/`, F1-10/F1-14/F5-19, 26.08.2026) | **Ingen ny pakke.** Piller er samme `role="tablist"` / `?fane=` som Innstillinger. Detalj-ruten kopierer Innboks-panelet (320px, overlay under `xl`, `PanelRightClose`). Bekreftelser er shadcn `Dialog` som slett-forhandler. Mekanikere-pillen gjenbruker `mechanics.oversikt` (ledig/belastning). Kompetanse i panelet er `MekanikerKompetanse`. Egen kode bare for å komponere eksisterende flater — shadcn `Tabs`/`Sheet` ville gitt et annet system enn resten av Ansatte. Sidebar Kompetanse/Timeplan urørt. |

| Auth-feltene (`apps/web/app/_auth/felter.tsx`: `Field`, `INPUT`) | **Ingen ny pakke.** `PassordFelt` er fjernet 01.09.2026 — innlogging er magic link + TOTP. `Field`/`INPUT` beholdes for e-post, TOTP-kode og invitasjonsnavn. `packages/ui` sin `Input` er `h-10`/`rounded-md`; uinnloggede skjermer bruker `h-control` 32px / `rounded-control` 10px. |

| Transaksjonell e-post (`packages/auth/src/senders/epost-mal.ts`, `toolkit-resend/src/epost-html.ts`) | **Ingen ny pakke, og ingen react-email.** Techstack er Resend + tabell-HTML (Outlook/Gmail). shadcn/beUI kan ikke brukes i innboksen. Skallet speiler Apple DESIGN.md / live app: parchment `#f5f5f7`, canvas `#fff`, ink `#1d1d1f`, hairline `#e0e0e0`, Action Blue-pille `#0066cc`, Inter, 17px brødtekst, logo på hvit. ⛔ Ikke mørk chrome, ikke grønn aksent, ikke Morph, ikke dealer-fliser. |

| `ToFaktorRad` (`apps/web/app/(app)/_shell/`) | **Ingen ny pakke.** `ByttPassordSkjema` er fjernet 01.09.2026. 2FA-status (F1-20) og slå-av uten passord (F1-22) er `StatefulButton` + token-rad i `_shell/profil-kort.tsx` (Settings › Profil og mekanikerens «Meg»). Gjenopprettingskoder (F1-21) vises på `/2fa-oppsett`. |
| `ByttEpostSkjema` / `/bekreft-epost` | **Ingen ny pakke.** F1-27: e-postbytte krever TOTP på (ikke passord). `Field` + `StatefulButton` + `CardShell`. Vegvesen/Quick har fortsatt `Input type=password` for API-nøkler — ikke kontoinnlogging. |

| Innstillinger-skallet (`apps/web/app/(app)/innstillinger/_skall.tsx`, F5-19 24–25.08.2026) | **Ingen ny pakke.** Liggende pille-faner er app-nivå komposisjon av samme `role="tablist"`-mønster som Saker/Kunder (`Link` + `rounded-pill` + `bg-fg text-bg` for aktiv). shadcn `Tabs` kunne hentes, men den er underline/boxed New York — vi ville restylet den til piller uansett, og resten av appen bruker allerede egen tablist for filtre. Ingen nested Settings i sidebaren, ingen Admin-fane, ingen ny farge. **Team/Organisasjon er ikke en fane** — #41 la destinasjonen i sidebaren (`/innstillinger/team`). Endwise-plattform ser kun Profil (ingen dealer-piller). Settings i sidebaren er `Link` til profil, ikke `DropdownMenu`. Visningsvelgeren er logo + navn + chevron — **ingen** X/pille. Minimer (lucide `X` → kompakt bar, `endwise.helpdesk-slider.minimer`) sitter på helpdesk-slideren (`TipCard`, F5-23); shadcn har ingen collapse-to-bar. Ny-badge tvinger åpen. Tema og varslingslyder i Profil-fanen er shadcn `Switch` i `h-row-store`, samme som Varsler. **Profil (Mikael 30.08):** `AvatarVelger` med `utenKort` — avatar og «Ny tilfeldig» er søsken på samme rad, feltene stables under uten CardShell. Bare **farge** (hue) velges. Form, humør og tone er borte; leftover i `user_preferences` endrer ikke ansiktet. Kallenavn er et ekte felt for alle roller. Felt-Lagre uendret, ingen sticky Save |

| Verkstedet timeplan + ansatte på jobb (`apps/web/app/(app)/dashboard/_timeplan.tsx`, `_ansatte-pa-jobb.tsx`, F3-05 25.08.2026) | **Ingen ny pakke.** Timeplanen er samme 07–18-raster som Jobber › Kalender (F3-07), komponert av `CardShell` + `Link` + status-tokens. Ansatte på jobb er `Avatar` + native `<details>` (samme expand-grep som Profil). shadcn har ingen verksted-timeplan; å hente `calendar` ville vært en §2-pakke for en dagsstripe. Kompetanse/Timeplan under Ansatte røres ikke. |

| Telefon kort-hjem + mekaniker-accordion (`_shell/phone-home*.tsx`, `_shell/phone-kort.tsx`, `_shell/phone-shell.tsx`, F5-13 29.08.2026) | **Ingen ny pakke for kortene.** Destinasjonskort er samme token-komposisjon som `CardShell`. **05.09.2026 (Jonas hard-fasit, dealer-hjem only):** parchment-scroll `#f5f5f7`, hero-plate radius 16 + stor tittel + I dag/Pågår/Fullført, destinasjonskort radius 14 / hit ≥44 / `touch-action: manipulation`. IA: Timeplan\|Rapporter · Innboks\|Jobber · Kunder\|Organisasjon · Hjelp (hopp Samarbeid) · Lager. ⛔ Chrome/PhoneShell/sidebar/Ronny. ⛔ Galaxy/Grainient/`#111` på hjem-kort. ⛔ Mekaniker-hjem. Fasit: `docs/endwise-forhandler-hjem-apple-hard-fasit.md`. **01.09.2026:** Forhandler-info er `ForhandlerInfoKort` (vanlig kort). Grainient er slettet. **01.09.2026 kveld:** kortene er ikke meny — meny er samme sidebar-overlay. Fast toppbar. Ingen bevel, ingen tab bar. |

| Dine jobber / Timeplan-stripe / starttid / ferie-mock (`dine-jobber/`, `_shell/timeplan-stripe.tsx`, `bookinger/_starttid-velger.tsx`, `_shell/ferie-mock.tsx`, 29.08.2026 natt) | **Ingen ny pakke.** Jobb-bokser er `Link` + lucide `Bike`/`Sailboat` + `ChevronRight` til eksisterende `/min-dag/[id]`. Timeplan-piler er `ChevronLeft`/`ChevronRight`. Starttid er to native expander-knapper. Ferie er merket mock/kommer. |

| Workshop-sheet (`_workshop/workshop-bloub.tsx` + `ronny-sheet.ts`, 05.09.2026) | **Ingen ny pakke.** Jonas/Mikael sheet-lås: Grainient-stripe og peek-dock er slettet. Telefon-avatar i `PhoneShell` åpner bunn-sheet (`data-ronny-sheet`, 80/100, radius 16, `#fff`, scrim). Header: forstørr · Ronny · X. Composer med safe-area. `md:hidden`. Desktop uten inngang i denne PR. Gradual Blur på overlapping logg. Prompt Input uendret. ⛔ Stripe. ⛔ Peek. ⛔ Galaxy/Grainient på sheet. ⛔ Model-picker, globe, vedlegg, Morph. |

| Bot-lab (`apps/web/app/(app)/bot/`, F6-29, 31.08.2026) | **Ingen ny npm-pakke.** Runtime er vendorisert bloub-motor + `BloubBot`. Intern lab lever videre. Produkt-avatar er nå samme motor (se §10). |

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

⛔ **Ingen Vercel AI Gateway.** Modellrutingen går gjennom
`resolveModelProvider(dataClass)`: begge dataklasser → Mistral (EU)
(Mikael 02.09.2026). Fireworks velges ikke av agent-runtime.

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

## 10. Avatar — bloub (31.08.2026)

⛔ **blobatar er ute.** `Avatar` rendrer `BloubBot` (cercle, store øyne / `surpris`).
Eneste forskjell mellom folk er `ColorId` fra `skins.ts` COLORS. Samme id farger
avatar-bloub, timeplan-klosser, jobb-kort og assignment-chips — ikke en annen
palett, ikke status-tone. Hue-grader 0–359 er leftover. Dealer setter farge fra
12 svatsjer. **Kroppen er liten:** FAB 40–48, liste/rad 22–32, popup-hode 56–72.
Profil kan være litt større. Lister: `still` (ingen rAF).
`@import "blobatar/*"` er fjernet fra `globals.css`.

Historikk (F6-19 blobatar) står under som arkiv — ikke installer den igjen.

### Arkiv: blobatar (hentet 20.08.2026, F6-19)

| | |
|---|---|
| **Brukes til** | Deterministiske ansikter på PERSONER i admin-flatene |
| **Installasjon** | `pnpm --filter @endwise/ui add blobatar @blobatar/react` · versjon `^2.7.0` |
| **Ligger i** | `packages/ui/src/components/avatar.tsx` (wrapper `Avatar`) |
| **Lisens** | MIT |
| **Runtime-avhengighet** | `blobatar` + `@blobatar/react` i **både** `packages/ui` og `apps/web`. ⚠️ Samme felle som `motion` (§6) og `recharts` (§2): Next transpilerer UI-kildekoden i APPENS resolusjonskontekst |
| **Egne avhengigheter** | **Null.** `@blobatar/react` har kun peers (`blobatar` 2.x, `react` >=18) |
| **Status** | ✅ Brukergodkjent §2-beslutning 20.08.2026 |

### Hva som faktisk er tatt i bruk

`<Blobatar name size hue normalize title alt />` — statisk modus, som rendrer
**ett `<img>`** med en percent-enkodet data-URI. Ingenting hentes over nett; hele SVG-en regnes ut
i nettleseren. På profil-headeren (`bevegelse="alltid"`, minst 48px) festes
`useGaze` fra `@blobatar/react/gaze` så øynene følger pekeren.

⛔ **`expression` er ute (30.08.2026).** Vi importerer ingen positurer fra
`blobatar/expression`. Ansiktet er seed (og ev. hue), nøytralt/idle — ikke en
tvunget happy-pose. Lagret `avatar_shape` / `avatar_humor` / `avatar_tone` endrer
ikke ansiktet. Status-label på mekanikerflaten står som tekst ved siden av.

⛔ **Ikke tatt i bruk, med vilje:**

| Funksjon | Hvorfor ikke |
|---|---|
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
| `stille` | ett `<img>` | Samtalelista · kundelista · fargeknappene i profilen |
| `hover` | inline SVG, amplitude 0 til `:hover` | Meldingene i tråden · Detaljer-panelet · kundekortet |
| `alltid` | inline SVG, alltid i bevegelse | Brukerraden i sidebaren (ett ansikt) · forhåndsvisningen i Settings › Profil |

`hover` er ikke en halvveis `alltid` — det er bibliotekets eget standpunkt: «ambient motion seen
constantly is motion worth removing», og «animates one blobatar at a time», som er både det
estetiske og det ytelsesmessige svaret. En tråd med tretti meldinger står helt i ro til du peker på
et ansikt.

`alltid` er dokumentert som unntaket for «the single-blobatar case — a profile header». Det er
nøyaktig profil-forhåndsvisningen: der ER bevegelsen innholdet, siden du står og ser på ansiktet
mens du endrer det. **Bruk den ikke på noe som kan opptre i flertall.**

⚠️ **`@import "blobatar/motion.css";` og `@import "blobatar/gaze.css";` i
`apps/web/app/globals.css` er PÅKREVD** for bevegelse og peker-blikk. Samme familie som
matrix-loaders-gotchaen i toppen av denne fila: uten importen er det ingen feilmelding,
ingenting i typecheck og ingenting i byggesteget — bare avatarer som står stille der de
skulle puste, eller øyne som ikke følger pekeren.

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

### Redigerbart: bare farge — gaze på det store ansiktet (30.08.2026)

Pakken eksponerer 39 trait-nøkler. **Vi pinner én: hue.** Ett ansikt per person
(seed = `user.id`). Form, tone og uttrykk kommer fra seeden. Settings › Profil
har fargeknapper + «Ny tilfeldig». Ingen form-, humør- eller tone-velger, og
ingenting av det gjemmes bak et fold.

⭐ **Gaze** (`useGaze` + `blobatar/gaze` + `blobatar/gaze.css`) sitter bare på det
ene store ansiktet som er poenget med skjermen — profil-header / velger-forhåndsvisning
(`bevegelse="alltid"`, minst 48px). Ikke på lister og rader (`stille`, 32px), og
ikke på sidebar-ansiktet (22px).

⚠️ På mekaniker-/ansattlista står **status som tekst** ved siden av. Den overstyrer
ikke lenger ansiktet. Leftover `form` / `humor` / `tone` i `user_preferences`
ignoreres i `Avatar`.

Kolonnene i basen (`avatar_shape`, `avatar_humor`, `avatar_tone`) er urørt — de
kan fortsatt leses og skrives — men UI-et nullstiller dem ved neste lagring og
rendrer dem ikke.

### Hvor den brukes

Innboksens samtaleliste · meldingene i tråden · Detaljer-panelet (kunde og mekaniker) ·
kundelista · kundekortet · **brukerraden nederst i sidebaren** · forhåndsvisningen i
Settings › Profil · **mekanikerlista** (`/mekanikere`) · **Team › Funksjoner** ·
mekanikerens Meg/Profil.

⛔ **Ikke** på kjøretøy (F2-03 eier modellbilder med ekte silhuetter), **ikke** på forhandleren som
organisasjon (den er ikke en person), **ikke** i widgeten eller på kundevendte flater.

---

## 11. bloub (intern lab, 31.08.2026)

| | |
|---|---|
| **Brukes til** | Intern gjennomgang av maskot-animasjon på `/bot` |
| **Installasjon** | **Vendorisert motor** (kopiert inn — ikke npm) |
| **Kilde** | https://github.com/jeremy-prt/bloub |
| **Pin** | commit `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749` (main 17.08.2026) |
| **Ligger i** | `packages/ui/src/vendor/bloub/` (motor) · `packages/ui/src/bloub/BloubBot.tsx` (React-wrapper) |
| **Lisens** | MIT på **koden** i vendor-treet, ikke x.ai-designet den imiterer. Ikke tilknyttet x.ai. «Grok» og «x.ai» tilhører sine eiere. Se `VENDOR.md` |
| **Hentet inn** | `src/bot/`: engine, states, expressions, skins, profiles, shape, face, math, cycles, decor, eyefit, repere. Plus `src/ui/gaze.ts` (rammeverkfri lookTarget). Ikke Vue-app, editor, i18n, eksport, customise, capture, anime, intro, stockage, video. Ikke `*.test.ts` |
| **Status** | Intern lab lever. Produkt-avatar er samme `BloubBot` (kompakt, se §10) |

Mikael: Morph Bot + Jonas Endwise-blob-spleis er **fjernet**. Geometrien er bloub uredigert (målt, ikke avrundet). Form default `cercle` (sirkel, radiell avvik under 0,7 %). Øyne er maskehull mot sidebakgrunn (`#ffffff` lyst, `#000000` mørkt). Kropp er aksent `#111111` / `#ffffff`. `engine.sample(t)` hvert rAF-frame; stop fryser ikke klokken.

På `/bot`: sju primærchips (idle · tenker · lytter=`idle`+`attentif` · laster=`thinking` · feirer=`burst` · alarm=`alert` · orbit) + 14 SEQUENCE-tilstander + 16 hvileuttrykk. Ingen 18-formsvelger. Ingen Vue i Endwise-bundelen.

Ikonet `Bot` er lagt i lucide-barrelen til sidebar-raden.
