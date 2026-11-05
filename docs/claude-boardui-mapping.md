# Endwise: Claude-design til Board UI, komplett mapping

> **Vedtak 02.11.2026 (Mikael):** Handlinger uten backend SKAL bygges i UI, vises deaktivert (disabled med nøytral kort norsk forklaring/tooltip), ikke skjules. Alt bygges i én PR.

Før bygging. Mikaels ordre: Endwise matcher Claude i layout og stil, ikke funksjon. Alle komponenter som kan byttes eller forsterkes med Board UI skal det. Unntak står med begrunnelse.

Kilde: Page https://cursor.com/canvas/store-4722a92c-1e0e-4b20-960e-e898207607e3/8631e29a-d451-4c00-81f3-128ea59fe0d0

## Oversikt

Stier er relative til `apps/web/app/(app)/` hvis ikke annet er oppgitt. `packages/ui` = `packages/ui/src`. Grunnlag: PR #178 (bc5d50c) mot main (fa3c197), 2. november 2026. Kun gratis Board UI (MIT).

| Rader i mappingen | Har | Delvis | Mangler | Ikke i Claude / annen løsning |
|---|---|---|---|---|
| 95 | 31 | 41 | 10 | 13 |

> **Ikke verifisert i preview:** Alt under er lest i kode, ikke kjørt i nettleser. Punkter merket «ikke verifisert» er ikke bekreftet. Se «Ikke verifisert» nederst.

## Rammer som gjelder alle rader

- Mobbin: ink #141414, canvas #fff, soft #f3f3f3, field #f0f0f0, hairline #e0e0e0. #0066ff kun kommersielt, aldri CTA. Inter, stadium-piller, ingen skygger, ingen pip eller border-left.
- Jonas GO på strukturen 02.11. Vedtatt i hans designsjekk: ulest uten strek (font-vekt 650 + soft tint), dagsbuen i ink/tint uten #0066ff, BevelButton kun uten skygge, Org hub-liste droppes.
- Uendret: top-bar 1+2, FORHANDLER_NAV, desktop 389/598/452, Amicro dither-charts, bloub-avatar, StatefulButton.
- Board-kilden eies av oss etter add. Remix-ikoner byttes til lucide. Switch settes til 24×14 ink. Chip-radius 6 settes til stadium.
- Mangler i Endwise som Claude har: layout og komponent bygges. Handlinger uten API bygges og vises deaktivert (disabled med kort norsk forklaring/tooltip). Ingen «ingen API»-tekst i appen.

## F6 — mobil-matching levert 05.11.2026 (Mikael kurskorrigering)

Mobil er hovedfokus; desktop-arbeid stoppet. Følgende er levert i kode (branch `cursor/claude-design-forhandler-hjem-e3a7`), med før/etter-skjermbilder per skjerm i PR-en:

- **Fanerad (chrome):** alle 8 destinasjoner i dragbar rail, aktiv pille autosentrert. «Mer»-dropdown og `delMobilDest` fjernet. Home-label «Verkstedet». Piller 44px, aktiv `bg-sidebar-active` + font 500.
- **Timeplan (`/jobber`):** uke-piler ‹ › i dagsrailen, undertekst «Torsdag 5. nov · 3 jobber».
- **Innboks:** «Ny melding»-bunnrad (border-rad, 46px compose-knapp) over pagineringen.
- **Kunder:** undertekst «N registrerte kunder». Alfa-rail verifisert i live DOM (8 kunder, 8 seksjoner). Kundeprofil mot sidemalen.
- **Tjenester (`/prisliste`):** BoardUI `FilterChips` (Alle/MC/Båt/ATV) synlige under søket — Sortering-arket fjernet her.
- **Lager:** primær «Ny del» i header (åpner skjema via `/lager/deler?ny=1`), undertekst «N deler under minimum», «Må bestilles» øverst.
- **Samtale (`/innboks/[id]`):** utgående bobler mørke (`bg-fg text-bg`), inngående lyse — designets chat-akse.
- **Bunntekst:** ny `MobilSideBunn` («Endwise levert av TwoFold») på hjem, timeplan, innboks, kunder, kundeprofil, tjenester og lager.

Desktop (F5 bred hjem-flate + dag-tidslinje) er beholdt — den er fullstendig adskilt fra mobil og svekker den ikke.

## 0. Delte byggeklosser og tilstander

Gjelder på tvers av flatene: sidemal, rader, knapper, chips, skjemafelt, tomt, lasting, toasts, modaler, ark, søk.

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Generisk side-mal (pageTitle, pageSub, primær, seksjoner, handlinger) | `_shell/side-chrome-skall.tsx`, `lager/_delt.tsx` (Sidehode), `kunder/_delt.tsx` (Seksjon), `_shell/innstilling-gruppe.tsx` | Delvis | Ingen sidemal i Board. Bruker `divider`, `button`, `icon-button`, `link-button` inni. | Én delt Side / Seksjon / ListeRad i `packages/ui`, bygget på Board-primitiver. Bytt de tre parallelle variantene. Top-bar 1+2 og SideChromeSkall-faner uendret. | Egen kode: `sidebar`, `app-shell` og `settings-modal` er chrome-lås. Noteres i UI-PAKKER §7. |
| Liste-rad (tittel, undertekst, høyreverdi, chevron, initialer) | Ad hoc i hver flate: `kunder/_alfa-liste.tsx`, `jobber/_dagsliste.tsx`, `innboks/_inbox-sidebar.tsx`, `lager/deler/page.tsx` | Delvis | `divider` for hårlinjer. `table` bare for ren tabell-data. | Én ListeRad-komponent. Rader beholder Claude-mønsteret, ikke tabell. | Board har ingen liste-rad. `table` og `data-table` er tabellsemantikk, og Claude er liste-rader. |
| Knapper (primær ink, ghost, warn) | `packages/ui/src/components/button.tsx`, StatefulButton (beUI), `_shell/cards.tsx` (BevelButton), 215 ad hoc `<button>` i 74 filer under (app) | Delvis | `button`, `icon-button`, `link-button`, `button-group`, `close-button` | Board-`button` blir motor bak vår `Button` (ink-pille, ingen skygge, h-control). Ad hoc `<button>` byttes flate for flate. Varianter ghost og warn. | StatefulButton beholdes: Board har ikke pending/success-state. BevelButton (bruker boxShadow via --ew-bevel-shadow) beholdes kun uten skygge (shadow settes til none), ellers fjernes den og kallstedene går til Board-button. Jonas 02.11. |
| Filter-chips (CHIP) | `innboks/_filter-chips.tsx`, `kunder/page.tsx` (KILDER), `lager/deler/page.tsx`, `jobber/_endringer.tsx`, `bookinger/_meld-endring.tsx` | Delvis | `segmented-control` (2-3 valg), `tag-group` (enkeltvalg, 4+ valg), `tabs` (innholdsfaner) | Én FilterChips-fasade: soft tint, stadium-pille, valgt = ink. Aldri blå. | — [ikke verifisert: tag-group som enkeltvalg-filter, tastatur/aria ikke testet] |
| Status-TAG (Planlagt, Pågår, Ferdig, Flyttet, Avvik, Forespørsel, Hentet) | `bookinger/_status.ts` (STATUS_TONE), `packages/ui/src/primitives/badge.tsx` og `chip.tsx`, `components/badge.tsx` | Delvis | `chip` (soft, gray, neutral). Ikke `status-dot`. | StatusChip med de sju statusene. Board-chip har radius 6, må til stadium. Ingen pip eller border-left. Avvik og Forespørsel med trekant- og ?-ikon som i Claude. | `status-dot` brukes ikke, pip er forbudt av Mobbin-låsen. |
| Select-expand i skjema (OPTROW, jobOpen, servOpen ...) | 15 filer med native `<select>`, knappelister i `bookinger/ny/page.tsx` | Delvis | `select`, `combobox`, `checkbox-card` eller `tag-group` (flervalg) | Bytt native select. Kunde- og modell-søk = combobox. | Board `combobox` har ikke flervalg (ingen selectionMode i registry-kilden). Flervalg tjenester løses med checkbox-card eller tag-group. |
| Skjemafelt (text, area, tall, avkrysning) | `packages/ui/src/primitives/input.tsx`, `_auth/felter.tsx`, 45 filer med `<input`, 11 med `<textarea`, 9 med checkbox | Delvis | `input`, `textarea`, `number-field`, `checkbox`, `radio`, `switch`, `input-otp` | label, hint, error og aria-invalid. Auth-felt (FELT_LG 52/17) bevares via size og class. | — |
| Paginering (Forrige / Neste, Viser X-Y av Z) | `innboks/_inbox-sidebar.tsx` (egne knapper). Kunder har ikke pager etter Fix A. | Delvis | `pagination` | Innboks (10 per side) til Board-pagination. Kunder beholder alfa-scroll. | Kunder: alfa-rail og sticky hoder erstatter Claudes pager på 25 [bekreftes av Mikael]. |
| Tomtilstand («Ingen ... å vise») | `kunder/_delt.tsx` (Tomt), `lager/_delt.tsx` (Tomt). «Ingen ...» står i 114 filer. | Delvis | Ingen empty-state i Board. `button` og `link-button` inni. | Én TomFlate med ærlig tekst og valgfri handling. Fjern «ikke tilgjengelig ennå» der handlingen heller kan deaktiveres. | Ingen Board-komponent dekker tomtilstand. Egen kode. |
| Lasting | «Laster ...»-tekst i 70 filer, `animate-pulse` i `_shell/pulse-kort.tsx`, `_shell/bruker-rad.tsx`, `analyse/page.tsx` | Delvis | `skeleton`, `spinner`, `progress` | Én LasterFlate med skjelett formet som innholdet. Felt-spinner via SearchField isLoading. | AI-lastere (matrix-loaders, Ronny) beholdes. Det er et eget vedtak. |
| Toast og Angre-linje («N meldinger slettet», «Samtalen er markert som løst») | Ingen toast. Innboks har sesjon-Angre i `innboks/_top-bar2.tsx`. `meldingBookingLagret` i `_shell/hjem-pulse-sync.ts` er bare en event. | Mangler | `toast` (+ Toaster), `notification` (har action-knapper) | Toaster i app-layout. Claudes Angre-rad blir toast med handling. Lucide-ikoner i stedet for Remix. | — |
| Modal og bekreft-dialog | `packages/ui/src/components/dialog.tsx` (Radix). Kallsteder: `innboks/_inviter-ansatt.tsx`, `organisasjon/_ansatte.tsx`, `organisasjon/_opprett-dialog.tsx`, `innstillinger/team/_detaljer.tsx`, `lager/deler/_bevegelse-dialog.tsx`, `lager/deler/page.tsx`, `endwise/forhandlere/page.tsx` | Delvis | `modal` (+ AlertDialog), `drawer` (placement bottom) | Flytt de sju kallstedene. Radix-dialog står til kommandopalett og siste kallsted er flyttet. | — |
| Ark og popover (Sortering, månedspicker, filter-panel) | `_shell/sortering-ark.tsx`, `innboks/_sortering.tsx`, `innboks/_popup.tsx`, `_shell/timeplan-stripe.tsx` (egen role=dialog) | Delvis | `popover`, `dropdown`, `date-calendar` | RAC-popover: fokus inne, fokus tilbake, Escape. Beholder 16px-plate, text-label, ingen heading. | — |
| Søk (topp, liste, mottaker) | `_shell/phone-sok-felt.tsx` (h-8, chrome), `_shell/phone-sok-overlay.tsx`, `kunder/page.tsx`, `lager/deler/page.tsx`, `innboks/_ny-samtale.tsx` | Delvis | `search-field`. `command-palette` for desktop ⌘K. | Chrome-søket: kun oppførsel (Escape tømmer, clear, isLoading), h-8 og geometri uendret. Listesøk byttes helt. | Command-palette finnes ikke i Claude. Bare desktop, valgfri. |
| Initialer-avatar (kunder, ansatte, samtale) | `packages/ui/src/components/avatar.tsx` (bloub) | Har | `avatar` kommer inn bare som rdep av toast | Behold bloub. Ikke eksporter Board-avatar. | Vedtak i boardui-audit §3.4. |
| Tooltip | Ingen i produktet | Mangler | `tooltip` | På ikon-only knapper. Triggeren må være fokuserbar. | — |
| Mørk / Lys | `_lib/tema.ts`, `_shell/phone-tema-rad.tsx` | Har | `theme-toggle` brukes ikke | Ingen. Dual theme kommer via Mobbin-tokens. | Egen tema-toggle i profil. Claudes Mørk/Lys-knapp er preview-chrome utenfor telefonen. |
| Tokens og typografi | `packages/ui/src/theme.css`, `lib/utils.ts` (cn) | Har | `theme`, `typography`, `globals`, `cx` (via init) | Token-omkobling etter audit §5.1: ink-CTA, ingen skygger, #0066ff aldri på CTA. Inter 650/450/300. | Board-typeskala og `rules` (agent-regler) brukes ikke. `rules` slettes etter init. |

## 1. Hjem (Verkstedet)

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Verkstedet: hero (ukedag, dato, Endringer, avvik, forespørsel) | `_shell/pulse-kort.tsx` (PulseHeroFlate, PulseEndringerLenke, PulseAvvikForesporBoks), `_shell/phone-home-dealer.tsx`, `home/page.tsx` | Har | `link-button` (Endringer), `chip` (tellere), `icon-button` | Ingen layoutforskjell funnet i koden. Bytt knapper og tellere til Board-primitiver. | Selve kort-geometrien er pulse-kort-lås. Ingen Board-kort passer. |
| Tre tall: Planlagt, Pågår, Ferdig | `_shell/pulse-kort.tsx` (PulseTall) | Har | `use-count-up` (valgfri rullende tall) | Ingen. | Ingen Board-komponent for dette. |
| Halvsirkel 08.00-19.00 | `_shell/pulse-kort.tsx` (PulseDagSirkel, DitherDonutChart) | Delvis | — | Fyll byttes fra blå (PULSE_DAG_FYLL_BLA #0066ff i `_shell/phone-home-pulse.ts`) til ink #141414 på hairline/soft-tint (konstantene PULSE_DAG_FYLL_INK, _HAIRLINE og _SOFT finnes allerede). Ingen #0066ff på dagsbuen. | Amicro dither-chart beholdes (låst). Claude har en prikkbue. Jonas 02.11: ingen #0066ff-fyll, hold i ink/tint. |
| Snarveier: Uleste meldinger og Venter på bestilling | `_shell/pulse-kort.tsx` (PulseRadKort), `_shell/cards.tsx` (CountBadge) | Har | `badge` (erstatter CountBadge) | Bytt teller til Board-badge. Etiketter: sjekk mot Claude («Venter på bestilling»). | Kortgeometri er låst. |
| Tall (analyse 30 d, 2×2: Visninger, Bookinger, Returer, Credits, Alle tall) | `_shell/pulse-kort.tsx` (PulseAnalyserKort), `analyse/_data.ts`, `analyse/page.tsx` | Delvis | `chip` (delta, f.eks. +11 %), `skeleton` | Bare Bookinger (live) vises i dag. Bygg 2×2-oppsettet. Delta som chip. Amicro-spark beholdes. | Åpent valg: vis fire ruter med «–», eller bare Bookinger til data finnes. `stat-cards` brukes ikke (rad-layout, kilde ikke lest) [ikke verifisert]. |
| På jobb x/y og Jobb (+) | `_shell/pulse-kort.tsx` (PulseRadKort kompakt, PulseJobbFlis), `_shell/phone-home-dealer.tsx` | Delvis | `icon-button` (+) | «På jobb» utledes i dag fra bookinger, ikke vakt. Knappen byttes til Board. Vakt er data (Karsten). | — |
| Lasteskjelett på hjem | `_shell/pulse-kort.tsx` (animate-pulse) | Delvis | `skeleton` | Bytt animate-pulse. | — |
| Desktop-hjem og dagsplan (mekanikere loddrett, jobbokser) | `home/page.tsx` (VerkstedetDesktop), `dashboard/_verkstedet-dag.tsx` | Delvis | — | IKKE MAPPET, KILDE MANGLER (Endwise Desktop.dc.html). Ingen Board UI-komponent eller endring er foreslått for desktop-dagsplanen. | Endwise Desktop.dc.html ligger ikke i /workspace/claude-design. Katalogen beskriver dagsplanen, men ingen kilde er lest. Må mappes når filen er tilgjengelig. |

## 2. Timeplan, Endringer og Jobb-detalj

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Timeplan: uke-rail (7 dager, piler) | `_shell/timeplan-stripe.tsx`, `_shell/timeplan-dager.ts`, `saker/page.tsx` (rute /jobber) | Har | `tabs` (pill), `icon-button` (piler) | Bytt knapper. Rail-oppførselen (drag, auto-sentrer aktiv dag) beholdes som egen komponent hvis `tabs` ikke gir den. | [Ikke verifisert] om Board `tabs` støtter drag og auto-sentrering. Hvis ikke er rail et unntak. |
| Månedskalender-popover med «Dager med ledig og kvalifisert mekaniker» | `_shell/timeplan-stripe.tsx` (egen role=dialog), `packages/modules/src/booking/job-slots.ts` | Delvis | `popover`, `date-calendar` (isDateUnavailable), `@internationalized/date` | Bytt egen dialog til popover + date-calendar. Marker dager fra jobSlots. Markering av ledige dager mangler i dag. | Pro `calendar` kan ikke brukes (public repo, lisens). |
| Dagsliste (tid, kunde, tjeneste · mekaniker · min, status, sortering) | `jobber/_dagsliste.tsx`, `jobber/_sorter.ts` | Har | `dropdown` eller `popover` (sortering), `chip` | ListeRad og StatusChip. «Ingen jobber denne dagen.» finnes og går over til TomFlate. | — |
| Snarveier: Endringer, Opprett kunde | `jobber/_faner.ts` (TIMEPLAN_FANER, chrome) | Annen løsning | — | Ikke bygg. | Dekkes av låst top-bar 2 (Timeplan · Opprett jobb · Endringer). |
| Kapasitet og kalenderflate (Endwise-egen) | `saker/_kalender.tsx`, `mekanikere/kapasitet/page.tsx` (TimeplanFlate) | Ikke i Claude | — | Behold. Bare knapper og chips byttes. | Pro `calendar` og `project-board` utelukket (public repo). |
| Endringer: liste (Alle, Avvik, Forespørsler, type-TAG) | `jobber/_endringer.tsx`, `jobber/_avvik.tsx`, `jobber/_forespor.tsx`, `jobber/_faner.ts` | Delvis | `segmented-control`, `chip` | Legg til «Alle». I dag bare Avvik og Forespørsler som deler. | — |
| Endring-detalj: Godkjenn og Avslå | `jobber/_endring-detalj.tsx`, `apps/api/src/trpc/routers/bookings.ts` (resolveChange) | Har | `button`, `modal` (AlertDialog på Avslå), `chip` | Knapper byttes. Godkjenn flytter jobben (lest i kode og rapport, ikke kjørt i preview). | Mons må gjøre eierskap/RLS-review av resolveChange før merge. |
| Logg og Angre behandling | `jobber/_logg.tsx`, `jobber/_endring-detalj.tsx` (undoChange) | Har | `button`, `toast` | Egen logg-detaljvisning (tp.logitem) er ikke funnet som egen flate [ikke verifisert]. Knapper byttes. | — |
| Meld avvik eller forespørsel (skjema) | `bookinger/_meld-endring.tsx` (native date, time, select, textarea) | Har | `segmented-control`, `input`, `date-picker`, `time-field`, `select`, `textarea`, `button` | Bytt alle native felt. | — |
| Jobb-detalj (kunde, kjøretøy, tjeneste, mekaniker, varighet, status, notat) | `bookinger/[id]/page.tsx` | Har | `chip`, `divider`, `button-group`, `modal` | Rader i Claudes oppsett. Historikk fra audit-loggen beholdes. | — |
| Statusmaskin Planlagt → Pågår → Ferdig → Hentet, pluss Flyttet | `bookinger/_status.ts` (draft, confirmed, in_progress, completed, cancelled, no_show) | Delvis | `chip`, `button` | Flyttet og Hentet mangler. Layoutet kan bygges, men uten enum (Karsten) deaktiveres de. | — |
| Send melding om jobben | Ikke funnet i `bookinger/[id]/page.tsx`. `innboks/_ny-samtale.tsx` har ikke Jobb-valg. | Mangler | `button` eller `link-button` | Knapp som åpner ny samtale med jobb preutfylt. | — |
| Se innmeldt endring (fra jobb til endring) | Ikke funnet [ikke verifisert] | Mangler | `link-button` | Lenke til `/jobber?fane=endringer&endring=<id>`. | — |

## 3. Ny jobb og kjøretøy

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Kunde (søk) og kjøretøy, Bytt | `bookinger/ny/page.tsx` (KundeIFlyt), `bookinger/_knytt-kjoretoy.ts` | Har | `combobox`, `select`, `button` | Native input og select byttes. Layout «Kunde og kjøretøy» beholdes. | — |
| Legg til kjøretøy: type → merke → modell → år | `bookinger/_kjoretoy-kaskade.tsx`, `bookinger/_kjoretoy-katalog.ts` (51 linjer), `kunder/_registrer-kjoretoy.tsx` | Delvis | `segmented-control` (MC/Båt/ATV), `select`, `combobox`, `input` (reg.nr) | Bytt felt. Katalogdekning mot Claude (20 MC, 25 båt, 14 ATV-merker) er ikke sammenlignet [ikke verifisert]. | — |
| Tjenester (flervalg), varighet, Bekreft | `bookinger/ny/page.tsx` («Tjenester og tid») | Har | `checkbox-card` eller `tag-group`, `number-field`, `button` | Knappelister og `type="number"` byttes. | — |
| Dato (kun dager med ledig) og klokkeslett | `bookinger/_starttid-velger.tsx` (233 linjer, egen månedsgrid), `bookinger/_job-slots.ts`, `packages/modules/src/booking/job-slots.ts` | Har | `date-calendar` (isDateUnavailable), `meeting-scheduler`, `time-field` | Erstatt egen månedsgrid. jobSlots gir tilgjengelige dager og tider. | [Ikke verifisert] om `meeting-scheduler` (popover) kan stå inline som i Claude. |
| Mekaniker (fra ledige i slot) | `bookinger/ny/page.tsx` («Mekaniker») | Har | `radio-card` eller `select` | Bytt knappelisten. | — |
| Notat og valgfritt bilde | `bookinger/ny/page.tsx` («Notat») | Delvis | `textarea`, `file-upload` | Bilde mangler i Endwise. Layout kan bygges, lagring er data. | [Ikke verifisert] hvor bilder skal lagres. |
| Nested skjema (kjøretøy midt i jobb, parkering) | State `nyttKjoretoy` i `bookinger/ny/page.tsx` | Delvis | `drawer` | Kjøretøy-skjema som drawer i stedet for innfelt blokk. | — |

## 4. Kunder og kundeprofil

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Kunder: liste, «N registrerte kunder», søk, Ny | `kunder/page.tsx`, `kunder/_alfa-liste.tsx`, `kunder/_delt.tsx`, `kunder/_faner.ts` | Har | `search-field`, `button`, `segmented-control` (Kilde-filter) | Søk og Ny byttes. Søkets placeholder bør nevne reg.nr (Claude). Dagens søk treffer navn, e-post, telefon, ikke reg.nr (funksjon). | Kilde-filter (Alle, Endwise, Quick) finnes ikke i Claude. Beholdes (Quick er faktisk). |
| Alfa-rail (# og A-Å, høyre, absolutt) | `kunder/_alfa-rail.tsx` (absolute, 26px, 11px), `kunder/_alfa.ts` | Har | — | Ingen. Stemmer med låsen i koden (ikke sett i preview). | Ingen Board-komponent for alfa-rail. Egen kode. |
| Sortering Nyeste / Eldste | `_shell/sortering-ark.tsx`, `kunder/page.tsx` | Har | `popover` / `dropdown` | Fokus og Escape via RAC. Samme plate. | — |
| Opprett kunde (navn, telefon, e-post, kjøretøy) | `kunder/_ny-kunde.tsx`, `kunder/_endre.tsx` | Har | `input`, `button` | Bytt felt. Nested «Legg til kjøretøy» som drawer. | — |
| Kundeprofil: kontakt, kjøretøy, jobber, meldinger, notater | `kunder/[id]/page.tsx` (Seksjon: Kjøretøy, Jobber, Meldinger, Notater) | Har | `divider`, `chip` (kjøretøy-chips), `link-button` | Kontakt vises med telefon- og e-post-ikon. Egen «Kontakt»-seksjon som i Claude er ikke funnet [ikke verifisert]. | — |
| Ny jobb på kunde | `kunder/[id]/page.tsx` (siste knapp) | Har | `button` | Bytt knapp. | — |
| Slett kunde med Angre | Ikke funnet. Det finnes ikke `customers.delete`. | Mangler | `modal` (AlertDialog), `toast` (Angre) | Bygg dialog og toast. Handlingen deaktiveres til API finnes. | — |
| Kjøretøy fjern / legg til på kunde | `kunder/_registrer-kjoretoy.tsx`, `bookinger/_kjoretoy-kaskade.tsx` | Delvis | `drawer`, `select`, `button` | «Fjern» på kjøretøy er ikke verifisert. | — |

## 5. Innboks og samtale

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Innboks: liste (avsender, emne, preview, tid) | `innboks/_inbox-sidebar.tsx` (435 linjer), `innboks/page.tsx` | Har | `search-field`, `skeleton`, ListeRad | Bytt søk og lasting. | — |
| Ulest-markering | `innboks/_inbox-sidebar.tsx` (border-l-2 border-l-fg på ulest) | Delvis | `badge` (teller) | Fjern strek (border-l-2 border-l-fg). Ulest = font-vekt 650 + soft tint (#f3f3f3). Telleren beholdes som Board-badge. | Vedtatt i Jonas' designsjekk 02.11: ingen strek, pip eller border-left. |
| Filter-chips Alle · Kunder · Intern · Support · Løst | `innboks/_filter-chips.tsx`, `_shell/inbox-del.ts`, `_shell/inbox-filter.tsx` | Delvis | `tag-group` (enkeltvalg) eller `tabs` (pill) | «Løst» er stub i dag (ingen resolved-kolonne). | — |
| Sortering Nyeste · Eldste · Uleste først | `innboks/_sortering.tsx`, `innboks/_popup.tsx` | Har | `popover`, `dropdown` | Fokus og Escape via RAC. | — |
| Velgemodus, flerslett og Angre | `innboks/_top-bar2.tsx` (Slett i låst toolbar) | Delvis | `checkbox`, `toast` (Angre) | Sesjon-Angre finnes (skjuler, sletter ikke). Bytt avkrysning og Angre-rad. | Toolbar «Alle meldinger · Ny melding · Sortering · Slett» er chrome og uendret. |
| Paginering (10 per side) | `innboks/_inbox-sidebar.tsx` | Har | `pagination` | Bytt Forrige / Neste. | — |
| Samtale: bobler, deltaker-chips, skrivefelt | `innboks/[id]/page.tsx` (600 l.), `innboks/_detaljer.tsx` (609 l.), `innboks/_detaljer-slot.tsx`, `packages/ui/src/components/message.tsx`, `prompt-input.tsx` | Har | `tag-group` (deltakere), `avatar` ikke brukt | Deltaker-chips til Board. Boblene og PromptInput beholdes. | PromptInput er chat-composer (Enter-submit), ikke skjemafelt. |
| Handlinger: Marker som løst, Gjenåpne, Inviter, Fjern, Forlat | `innboks/_trad-handlinger.tsx` (bare Inviter), `innboks/_inviter-ansatt.tsx` | Delvis | `dropdown` (handlingsmeny), `modal` (Forlat), `button` | Inviter finnes (forkThread). Fjern, Forlat og Løst mangler (ingen API). Layout bygges, handlinger deaktiveres. | — |
| Inviter ansatt og Fjern deltaker (søk, flervalg, bekreft) | `innboks/_inviter-ansatt.tsx` (Dialog) | Delvis | `modal`, `search-field`, `checkbox`, `button` | Inviter byttes. Fjern-flaten er ikke bygget. | — |
| Ny melding (type Kunde/Intern/Endwise support, mottaker, jobb, emne, melding) | `innboks/_ny-samtale.tsx` (362 l.) | Delvis | `segmented-control`, `search-field`, `combobox`, `input`, `textarea`, `button` | Jobb (valgfritt) og «Ta med intern ansatt» finnes ikke. Alfa-rail for mottaker gjenbruker kunder-railen. | — |
| Løst samtale: låst skrivefelt og toast | Ikke funnet | Mangler | `toast` | Layout kan bygges. Krever resolved-felt (Karsten). | — |

## 6. Lager

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Lager-hub: «N delenummer» og fire tall (På lager, Tilgjengelig, Reservert, Under minimum) | `lager/page.tsx`, `lager/_hub.ts`, `lager/_delt.tsx` | Har | `chip`, `skeleton`. `stat-cards` vurdert, ikke brukt. | Teller-komponenten (lokal) til felles Tall-rute. Seksjonsrader som lenker. | `stat-cards`: rad-layout, kilde ikke lest [ikke verifisert]. |
| Deler: liste, Under minimum, Bestilt på vei, Ny | `lager/deler/page.tsx` (227 l.), `lager/deler/_ny-del.tsx` | Delvis | `search-field`, `segmented-control`/`tabs`, `chip`, `table`, `meter` (valgfri beholdning vs minimum) | «Bestilt på vei» finnes ikke (ordered = 0). Bytt søk og faner. | — |
| Del-detalj: beholdningsrader, Endre minimum, Bestill mer | `lager/deler/_del-detalj.tsx` (80 l.), `lager/deler/_bevegelse-dialog.tsx` | Delvis | `modal`, `number-field`, `select`, `button` | Rader finnes. «Endre minimum og beholdning» og «Bestill mer» mangler som handlinger. | — |
| Bestill deler (liste og skjema: del, antall, leverandør) | `lager/bestill/page.tsx` (bare Tomt) | Mangler | `select`, `number-field`, `segmented-control` (leverandør), `button` | Bygg liste og skjema. Handling deaktiveres til API finnes. | Leverandør-integrasjoner (Hellanor, MC-Import) er ikke live. |
| Inn- og utlogg («Siste bevegelser») | `lager/bevegelser/page.tsx` (69 l.), `lager/_delt.tsx` (BEVEGELSE_LABEL) | Har | `table`, `chip` (Inn/Ut) | Bytt til Board-table og chip. | — |
| Kjøretøy til salgs (liste og annonse: pris, kjørt, kanal, beskrivelse, Rediger) | `lager/_kjoretoy-salg.tsx` (bare Tomt), `lager/kjoretoy/page.tsx` | Mangler | `chip` (Finn.no / Butikk / Reservert), `input`, `number-field`, `textarea`, `file-upload`, `carousel` | Bygg liste og annonse. Rediger-skjema. Deaktiveres til API finnes. | — |
| Plassering (lokasjoner) | `lager/lokasjoner/page.tsx` | Ikke i Claude | `input`, `select` | Behold. Felt byttes. | — |

## 7. Butikk

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Butikk-hub: «N varer · M kjøretøy», preview 3 og Se alle | `butikk/page.tsx` (167 l.) | Delvis | `button`, `link-button`, `chip` | «Se alle varer» er et toggle-state, ikke egen rute. Kjøretøy-antall er hardkodet 0. | — |
| Varer i nettbutikk (kategorier Utstyr, Væsker, Verktøy, Tilbehør, Båt) | `butikk/page.tsx` | Delvis | `segmented-control` eller `tag-group`, `table` | Egen rute (Claude: butikk.varer). «Ny» er disabled i dag. | — |
| Ny vare og Rediger vare (navn, kategori, pris, bilde) | Ikke funnet | Mangler | `input`, `select`, `number-field`, `file-upload`, `modal` eller `drawer` | Bygg skjema. Deaktiveres til skriv-API finnes (Karsten). | — |
| Kjøretøy til salgs (Butikk) | `butikk/kjoretoy/page.tsx` → `lager/_kjoretoy-salg.tsx` | Mangler | Som Lager | Samme flate som i Lager. | — |
| Kasse og handlekurv (Endwise-egen) | `butikk/kasse/page.tsx` (182 l.), `butikk/_kurv.ts` | Ikke i Claude | `input`, `checkbox`, `number-field`, `button` | Forsterk med skjemafelt. | — |
| Booking-widget (midlertidig test) | `butikk/_booking-widget.tsx` | Ikke i Claude | — | Ingen. | Embed (F4), ikke dealer-chrome. |

## 8. Organisasjon, abonnement, integrasjoner og tjenester

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Organisasjon: hub-liste (Ansatte, Timeplan ansatte, Abonnement, Integrasjoner) | `organisasjon/page.tsx`, `organisasjon/_hub.ts`, `organisasjon/_hub-flate.tsx`, `organisasjon/_seksjoner.ts` | Annen løsning | — | Ikke bygg hub-listen. | Hub-listen droppes (bekreftet). Dekkes av top-bar 2 (Oversikt · Ansatte · Timeplan · Abonnement · Integrasjoner). Låst. |
| Firmaopplysninger (firmanavn, orgnr, adresse, postnr, sted, telefon, e-post, nettside, antall ansatte) | `organisasjon/forhandleren/_kort.tsx` (333 l.) | Har | `input`, `divider` | Bytt felt. Rader i Claudes rekkefølge [ikke sammenlignet felt for felt]. | — |
| Ansatte: liste, «N ansatte · M på jobb nå», På jobb / Av vakt | `organisasjon/_ansatte.tsx` (367 l.), `organisasjon/_liste.tsx` | Delvis | `chip`, `dropdown` (radhandlinger), `select` (rolle), `modal` | «På jobb» kommer fra bookinger i dag. Ingen vaktmodell. Layout bygges, tekst «Av vakt» krever data. | — |
| Ansattprofil: profil, kvalifikasjoner, egne tjenestetider, jobber, Slett | `innstillinger/team/_detaljer.tsx` (627 l.), `innstillinger/team/_kompetanse-velger.tsx`, `innstillinger/team/_liste.tsx` | Delvis | `tabs` (innhold), `tag-group` (kvalifikasjoner), `number-field`, `time-field`, `switch`, `input-otp`, `modal` | «Egne tjenestetider» finnes ikke som funksjon. Slett via modal. | — |
| Opprett ansatt (navn, tittel, rolle, tilgang, e-post) | `innstillinger/team/_inviter.tsx` (306 l.), `organisasjon/_opprett-dialog.tsx` (240 l.) | Delvis | `modal`, `input`, `select`, `radio-card` | Endwise inviterer via e-post. Bytt felt og dialog. | — |
| Timeplan ansatte (hvem er på vakt hvilke dager) | Pill peker til `/jobber` (`organisasjon/_seksjoner.ts`), `mekanikere/kapasitet/page.tsx` | Delvis | `tabs` (dagrail), `date-calendar` | Viser kapasitet, ikke vaktplan. | — |
| Abonnement (plan, fornyes, betaling, Bytt plan) | `abonnement/_innhold.tsx` | Delvis | `radio-card` (plan), `checkbox-card` (tillegg), `chip` (status), `button` | Layout etter Claude. Tallene i Claude (990 / 2 490 / 5 900) er mock. Våre priser: Start 4 490, Pro 8 490, Enterprise 12 490 eks. mva. | — |
| Integrasjoner (6 rader, på/av) | `integrasjoner/_innhold.tsx` | Delvis | `chip` (På / Av, bare visning), `switch-card` (senere) | Oversikten er informativ, uten brytere. Vis status som chip. | Switch brukes ikke før integrasjoner kan slås av og på. |
| Tjenester: liste, «N tjenester tilbys», søk, kategorier Alle/MC/Båt/ATV, Ny | `prisliste/page.tsx`, `prisliste/_hub.ts`, `innstillinger/tjenestekatalog/_flate.tsx`, `_tjeneste-kort.tsx` | Har | `search-field`, `segmented-control`, `chip`, `button` | Bytt søk og kategori-chips. Tjenester får ikke egen fane. | Rute-forvirring: `/tjenester` redirecter til abonnement-seksjonen. Tjenestekatalogen bor på `/prisliste`. |
| Ny og Rediger tjeneste (navn, kategori, minutter, pris, kvalifikasjon, beskrivelse) | `innstillinger/tjenestekatalog/_ny-tjeneste.tsx`, `_felter.tsx` (lokal INPUT = FELT_MD) | Har | `input`, `number-field`, `select`, `tag-group`, `textarea`, `drawer` | Bytt felt. | — |

## 9. Utenfor Claude-fasit (forsterkes med Board UI)

Claude har ingen layout her. Board UI forbedrer skjema og tilgjengelighet, uten ny layout.

| Claude-flate / seksjon | Dagens fil(er) | Status | Board UI (gratis) | Endring som trengs | Begrunnelse hvis unntak |
|---|---|---|---|---|---|
| Innstillinger (Konto, Varsler, Team, Tjenestekatalog) | `innstillinger/_skall.tsx`, `_faner.ts`, `_profil-fane.tsx`, `varsler/_innhold.tsx` | Ikke i Claude | `switch`, `switch-card`, `input`, `tabs` (innhold), `select`, `modal` | Ingen layoutfasit fra Claude. Forsterk skjema og brytere. | Fasit §5: innstillinger bor i profil-sheet (bar 1), ikke top-bar 2. |
| Profil-sheet (bar 1) | `_shell/profil-kort.tsx`, `_shell/phone-profil-meny.tsx`, `_shell/phone-tema-rad.tsx` | Ikke i Claude | `switch` (24×14 ink), `input` | Bare komponent-bytte. Chrome uendret. | — |
| Innlogging, 2FA, invitasjon | Under apps/web/app (utenfor (app)): `_auth/felter.tsx`, `signin/signin-skjema.tsx`, `2fa-oppsett/page.tsx`, `invitasjon/[token]/page.tsx`. Under (app): `_shell/bytt-epost.tsx` | Ikke i Claude | `input`, `input-otp`, `button` | label/hint/error og per-siffer kodefelt. | `auth-card` brukes ikke (auth-IA er vår). |
| Ronny (sheet og chat) | `_chat/agent-chat.tsx`, `_workshop/ronny-sheet.ts`, `_workshop/workshop-bloub.tsx` | Ikke i Claude | `drawer` (bottom), `agent-thinking`, `composer-loader` | Eget Ronny-løp senere. PromptInput beholdes. | Ronny-sheet har egne snaps (80/100) som Board-drawer ikke er verifisert til å ha. Pro-agentblokker kan ikke i public repo. |
| Mekaniker-skall (Min dag, Dine jobber) | `min-dag/*`, `dine-jobber/*`, `mekaniker/*` | Ikke i Claude | `checkbox`, `textarea`, `switch` | Bare skjemafelt. | Claude er forhandlerens app (Marius Vik). |
| Kjøretøy, Hjelp, Admin /endwise | `kjoretoy/*`, `hjelp/*`, `endwise/*`, `marked/*` | Ikke i Claude | `input`, `select`, `switch`, `checkbox`, `textarea`, `accordion` (hjelp-artikler, kandidat [ikke lest]) | Lav prioritet. Siste PR. | — |
| Statistikk og Analyse | `analyse/page.tsx`, `statistikk/*` | Ikke i Claude | — | Ingen. | Amicro er chart-motor. Board chart-kort er Pro og Recharts. |

## Dekning av Board UIs 88 gratis items

Alle gratis items fra registry.json er plassert. Ingen Pro. Ingen item står uten beslutning.

| Beslutning | Items | Begrunnelse |
|---|---|---|
| Brukes på flatene (45) | modal, drawer, popover, combobox, toast, notification, skeleton, spinner, search-field, number-field, time-field, tag-group, date-calendar, date-picker, meeting-scheduler, button, icon-button, link-button, button-group, close-button, input, textarea, checkbox, checkbox-card, radio, radio-card, switch, switch-card, select, dropdown, divider, file-upload, tabs, table, tooltip, badge, chip, pagination, input-otp, segmented-control, command-palette, kbd, carousel, accordion | Alle gratis. carousel og accordion er kandidater, ikke lest mot koden. switch-card og command-palette er forsterkning utenfor Claude. |
| Infrastruktur (rdeps) | theme, typography, globals, cx, template-copy, direction, scroll-direction, directional-icon, scroll-fade, chevrons, use-dismiss-on-outside-press | Kommer automatisk med `add`. Typografi og tema omkobles til våre tokens. |
| Senere / valgfri | progress, meter, context-menu, use-count-up, date-range-picker, agent-thinking, composer-loader, data-table, data-grid | Ingen Claude-flate krever dem. meter kan vise beholdning mot minimum. data-table drar @tanstack/react-table. |
| Unntak med begrunnelse | avatar, status-dot, theme-toggle, sidebar, app-shell, settings-modal, auth-card, notification-center, announcement, breadcrumb, stat-cards, revenue-chart-card, orders-chart-card, important-alerts-card, patient-info-card, agent-chat, agent-runtime, agent-log, rules, logo, color-picker, tree-view, slider, social-button | avatar: bloub er vedtak. status-dot: pip forbudt. theme-toggle: egen finnes. sidebar, app-shell, settings-modal, auth-card, notification-center: chrome- og IA-lås. chart- og stat-kort: Amicro er chart-motor. agent-*: Ronny har egen chat. rules og logo: ikke relevant. De øvrige har ingen kallsted i Claude eller Endwise. |

## Foreslått PR-oppdeling, i rekkefølge

Forutsetning: #181, #182 og #180 er merget og #178 rebaset før PR 2 og framover rører samme filer. PR 0 og PR 1 kan gå før. Én databaseendring per PR, og Karstens data kommer parallelt. Ingenting merges uten Mikaels OK.

> Etter vedtak 02.11: alt under bygges i én samlet PR (`cursor/claude-boardui-full`). Tabellen beholdes som rekkefølge for commits.

| PR | Innhold | Synlig effekt | Avhengighet og review | Størrelse |
|---|---|---|---|---|
| 0 | Dokumentasjon: boardui-audit (#183) + denne mappingen som `docs/boardui-mapping.md` | Ingen kode | Ingen | S |
| 1 | Grunnmur: `boardui.json`, `init`, token-omkobling, `cx`, slett Board-agentregler, nye avhengigheter (react-aria-components, remixicon som transitiv, tailwind-merge 3.6). Oppdater UI-PAKKER og techstack i samme PR. | Ingen synlig endring. Bare `packages/ui`. Kan gå før #178. | Mikael godkjenner RAC som skjemamotor (techstack §2). Mons: Dependency-Check på ny avhengighet. | M |
| 2 | Skjemafelt: input, textarea, search-field, input-otp, checkbox, radio, switch (24×14 ink), select, number-field. Migrer auth, innstillinger, ny kunde, ny tjeneste, `_felter.tsx`. | Ingen layoutendring | Etter #178 i filer som #178 rører. Auth-test (magic, 2FA, invitasjon). 16px-test for iOS-zoom. | L |
| 3 | Overlay og tilbakemelding: modal/AlertDialog, drawer, popover, dropdown, tooltip, toast + Toaster. Flytt de sju Dialog-kallstedene, sortering-ark, innboks-sortering og månedspicker-skall. | Ingen layoutendring. Toast er ny. | Etter PR 1. Fokus og scroll på telefon. | L |
| 4 | Delt flatemal: Side / Seksjon / ListeRad, TomFlate, LasterFlate (skeleton), FeilFlate, StatusChip, FilterChips, Pagination. Fjern de tre variantene av Tomt/Laster/Feil. | Liten visuell endring (skeleton, chips) | Etter PR 2 og 3. Browser-review av Mikael. | L |
| 5 | Dato og tid: date-calendar, date-picker, time-field, meeting-scheduler (+ @internationalized/date). Ny jobb steg dato/klokkeslett, meld-endring, månedspicker med ledige dager. | Synlig i Ny jobb og Timeplan | Etter PR 3. Ny avhengighet. Mons: resolveChange (eierskap/RLS) før merge. | M |
| 6a | Flate: Hjem + Timeplan + Endringer + Jobb-detalj. Tall 2×2, StatusChip med Flyttet/Hentet, «Send melding om jobben», «Se innmeldt endring». | Synlig | Etter PR 4 og 5. Åpent valg om Tall. Flyttet/Hentet deaktiveres til enum finnes. | M |
| 6b | Flate: Kunder + kundeprofil + kjøretøy-kaskade + Slett kunde (dialog og Angre-toast). | Synlig | Etter PR 4. Slett deaktiveres til `customers.delete` finnes. | M |
| 6c | Flate: Innboks + samtale. Filter-chips, velgemodus, Angre-toast, handlingsmeny, Ny melding, Inviter/Fjern. Ulest = font-vekt 650 + soft tint, uten strek. | Synlig | Etter PR 4. Løst/Fjern/Forlat deaktiveres til API finnes. | L |
| 6d | Flate: Lager + Butikk. Bestill, Kjøretøy til salgs, Varer som egen rute, Del-detalj-handlinger. | Synlig | Etter PR 4. Skriv-API (Karsten) styrer hva som er aktivt; resten vises deaktivert. | L |
| 6e | Flate: Organisasjon (ansatte, ansattprofil, timeplan ansatte), Abonnement (radio-card), Integrasjoner (status-chips), Tjenester. | Synlig | Etter PR 4. Vaktmodell (Karsten) styrer På jobb / Av vakt. | L |
| 7 | Utenfor Claude: kasse, hjelp, admin, mekaniker, kjøretøy, command-palette (desktop). Fjern Radix-filer når siste kallsted er flyttet. | Liten | Etter 6a-6e. | M |

### Data som styrer hva flatene kan vise (Karsten, parallelt)

| Spor | Innhold |
|---|---|
| Karsten 1 | Statusene Flyttet og Hentet + vakttabell for mekanikere (På jobb / Av vakt) |
| Karsten 2 | Samtaler med løst-felt, ekte aggregater for Visninger, Returer og Credits |
| Karsten 3 | Skriv-API for Lager/Butikk (varer, bevegelser, utsalgspris, annonser). `customers.delete` for Slett kunde. |

## Åpne valg for Mikael

- Tall-kortet: vis fire ruter med «–», eller bare Bookinger til data finnes? Mitt forslag: bare Bookinger, siden Karsten advarer mot ny mock.
- Handlinger uten backend (Slett kunde, Løst, Bestill, Ny vare): Vedtatt 02.11: vis deaktivert (bygges, disabled med tooltip), ikke skjul.
- Statusfarger for Avvik og Forespørsel: Claude bruker rød og gul. Bruk Board-chip rose og yellow, eller soft med ikon?
- RAC (react-aria-components) som skjemamotor og Remixicon som transitiv avhengighet: krever stack-vedtak (audit sier gitt, bekreft i PR 1).

## Ikke verifisert

- Jeg har ikke kjørt noe i Vercel-preview eller nettleser. Status (Har / Delvis / Mangler) er lest i kode på #178 (commit bc5d50c, hentet i dag) og på main (fa3c197). Visuell avvik er ikke sjekket.
- Claude-filen er lest via de tre fasitene og utvalgte linjer i `Endwise Mobile.dc.html`. Jeg har ikke lest hele filen på 3 010 linjer på nytt.
- Endwise Desktop.dc.html ligger ikke i workspace. Desktop-dagsplanen er derfor ikke mappet.
- Board UI: registry.json hentet i dag (88 gratis items). Kilde sjekket for date-calendar, date-picker, meeting-scheduler, chip, drawer, combobox, toast, notification, tag-group. Ingen `init` eller `add` er kjørt, og ingenting er rendret.
- Ikke verifisert i Board-kilden: tabs med drag og auto-sentrering, tag-group som enkeltvalg-filter, meeting-scheduler inline, drawer-snaps, file-upload mot vår lagring, stat-cards.
- Pro-komponenter er ikke brukt. Repoet er public, og lisensen forbyr Pro-kilde i offentlig repo.
- Claude er mørk først (#0b0b0b) og bruker Inter Tight. Vi bruker Mobbin og Inter. Dette er med vilje, og ikke en mangel.
