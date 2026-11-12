# Claude-design vs Endwise — 3. november 2026

**Type:** Analyse. Ingen produktkode er endret. Board UI er **ikke** installert.  
**Mål:** Gjøre UI så likt Claude-designet som mulig, med små avvik OK. Ingen stor omskriving. Ingen ny funksjon uten API. Låsene står.  
**Skrevet mot:** `main` (samme produktkode som denne branchen), åpen PR [#178](https://github.com/Twofold-AS/endwise-v1/pull/178) der den allerede porterer designet, og denne PR [#183](https://github.com/Twofold-AS/endwise-v1/pull/183) (Board UI-planen).

---

## 0. Kilder som er lest

### Designpakke (`/cursor/stores/bot/claude-design-2026-11-03/`)

| Fil | Hva den er |
|-----|------------|
| `design.zip` | Pakken under |
| `Endwise - Mobil UI-logikk.md` | Dokumentasjon av forhandler-mobil: tre lag, `state.view`, generisk sidemal, `jobSlots()`, skjemaer |
| `Endwise Mobile.dc.html` | Forhandler mobil (402×874-ramme). Samme program som desktop |
| `Endwise Desktop.dc.html` | Forhandler desktop. Samme data/logikk + **dagsplan** på Verkstedet |
| `Endwise Kunde.dc.html` | Det **kunden** ser (egen app, egne faner) |
| `Endwise Mobile.html` / `design.html` | Bundlet forhandler-mobil (samme innhold som `.dc.html`, uten `support.js`) |
| `Endwise Mobile standalone-src.dc.html` | Samme mobil-kilde som `Endwise Mobile.dc.html` |
| `ios-frame.jsx`, `support.js` | Demo-ramme og DC-runtime. Ikke produkt |
| `uploads/pasted-1789090718536-0.png` | Forhandler mobil, lyst: Verkstedet-hjem |
| `uploads/pasted-1789090725157-0.png` | Samme flate, mørkt |
| `.thumbnail` | Kunde-hjem (Hei Kari, Impellerbytte, Bestill time) |

UI-logikk.md sier eksplisitt: alt er lokalt, ingen server, fast dato **fredag 11. september 2026**, innlogget **Marius Vik**, org **Nordvik MC & Marine AS**. Det er demo, ikke kontrakt med API-et.

### Repo som er sammenlignet

Lest på denne branchen (produktkode = `main`): `nav.ts`, `phone-chrome.ts`, `phone-sok-felt.tsx`, `phone-home-dealer.tsx`, `phone-home-pulse.ts`, `pulse-kort.tsx`, `home/page.tsx`, `dashboard/_verkstedet-dag.tsx`, `dashboard/_timeplan.tsx`, `dashboard/_timeplan-layout.ts`, `innboks/_sortering.tsx`, `innboks/_top-bar2.tsx`, `innboks/_filter` (`inbox-del.ts`, `inbox-filter.tsx`), `kunder/page.tsx`, `kunder/[id]/page.tsx`, `jobber/_faner.ts`, `saker/page.tsx`, `bookinger/ny/page.tsx`, `lager/page.tsx`, `butikk/page.tsx`, `organisasjon/page.tsx`, `prisliste/page.tsx`, `integrasjoner/_innhold.tsx`, `dine-jobber/_flate.tsx`, `packages/widget-ui/src/EndwiseWidget.tsx`, `packages/widget-tokens/src/tokens.css`, `docs/boardui-audit.md` §3–4 og §12, `docs/endwise-roadmap.html` F6-07…F6-11.

PR **#178** (`cursor/claude-bit1-verkstedet-hjem-7158`, åpen, «ikke merge»): porterer deler av *forrige* Claude-pass på ekte ruter (alfa-rail, ærlig Analyse, `jobSlots` i klient, kjøretøy-kaskade, innboks-chips, endring godkjenn/avslå/angre, lager/butikk/org-hub). Hjem-desktop er **fortsatt** samme pulse-kort — ingen dagsplan der.  
PR **#183** (denne): bare `docs/boardui-audit.md`. Ingen produkt-UI.

### Board UI-utgangspunkt

Bare **gratis** første batch fra `docs/boardui-audit.md` §3.3 / §4. Pro er ikke utgangspunkt (public repo + §12). `sidebar` / `app-shell` er gratis men **chrome-lås** — ikke utgangspunkt. `date-picker` er gratis men **ikke** batch 1; nevnes bare som senere fri batch der dato allerede finnes.

---

## 1. Låser som står

| Lås | Fasit i repo |
|-----|----------------|
| Mobbin look | Canvas `#ffffff`, ink `#141414`, soft `#f3f3f3`, aksent `#0066ff` kun kommersielt, Inter **650/450/300**, pille 9999, kort **24**, tint ikke skygge, ingen accent-pip. Mørkt = polaritetsinversjon til `#141414`, ikke ny palett. `packages/widget-tokens/src/tokens.css` |
| Telefon top-bar 1 | Logo **32**, søk **h-8**, Ronny **28**, profil **28**. `phone-chrome.ts` |
| Telefon top-bar 2 | Horisontale dest-piller fra `FORHANDLER_NAV`. Ingen sidebar på telefon |
| Desktop | **389 / 598 / 452**. `desktop-shell.ts` |
| Nav | `FORHANDLER_NAV`: Verkstedet, Innboks, Timeplan, Kunder, Tjenester, Organisasjon, Lager, Butikk (flagg) |
| Ingen Pro i public repo | `endwise-v1` er public. Pro-kilde er lisensbrudd her (`boardui-audit.md` §12) |

---

## 2. Der designet strider mot en lås

Disse skal **ikke** kopieres inn. Avvik er bevisst.

| Designet viser | Lås | Hva vi gjør |
|----------------|-----|-------------|
| **Inter Tight** 400/500/600/**700** | Inter 650/450/300 | Behold Inter-vektene. Tight-glyffer og 700 er avvik |
| Standard **mørk** `#0b0b0b` | Lyst først, mørkt `#141414` | Behold Mobbin. Demo-toggle Mørk/Lys er preview-chrome, ikke produkt |
| Suksess-lime `#3ef27f` / `#123d22` | «⛔ Linear acid-lime». Suksess er `#15b042` (info) | Bruk `--ew-success`, ikke demo-lime |
| Telefon-søk **44px**, avatarer **36px** | h-8 / 28 | **LÅS.** SearchField `size="small"` (32) etter batch 1. Ikke 44/36 |
| Desktop **aside ~250px** + innhold `max-width:1320` + topp «Ny jobb» | 389/598/452, ingen Ny-knapp i chrome | **LÅS.** Dagsplan og innhold bor i box 2 (598), ikke nytt skall |
| Dagsplan-jobb: `border-left: 3px solid` statusfarge | Ingen pip / `border-left` | Tint eller venstre-radius uten 3px-pip |
| Kort-radius 22–26 | Kort 24 | 24. Lite avvik OK, ikke 26 som ny standard |
| Demo-søk er visuell stub (ingen overlay) | Telefon-søk åpner `PhoneSokOverlay` | Behold overlay. Ikke dødt søkefelt |
| Åtte faner som **innhold** i demo | Dest-piller er chrome | Samme *navn* som `FORHANDLER_NAV`. Geometri urørt |
| Board `sidebar` / `app-shell` / Pro-maler | Chrome-lås + public repo | Ikke `add` |

---

## 3. Kunde-flater

Designet er en **egen kunde-app** (`Endwise Kunde.dc.html`). Faner: **Hjem · Bestill · Bookinger · Meldinger · Kjøretøy · Profil**. Undersider: bookingdetalj, nytt kjøretøy, chat, Deler, Kvitteringer. Fast dato 11.09.2026. Seed-kunde i thumbnail: Kari.

I repoet i dag er kunden **ikke** denne appen.

- `OrgRole` har `'customer'`, men `ShellKey` er bare `forhandler | mekaniker | endwise | endwise_partner`. `landingForRole` sender aldri kunden til et kundehjem — den lander på `/home` eller `/min-dag`.
- **`/dine-jobber` er mekaniker**, ikke kunde (`MEKANIKER_NAV`, `mechanic.myDay`).
- Eksisterende kundeflate: embeddbar **widget** (`packages/widget-ui/src/EndwiseWidget.tsx`) — Chat + Book time mot `/widget/*`.
- Roadmap **F6-07…F6-11** (`/min-side`: garasje, bookinger, chat, kart, varsler/profil) er `planned` / `ui: proto`. F12-04 (eksport/slett) mangler UI.

**Prinsipp her:** ikke bygg Min side i denne runden. Det er ny app uten ferdig flate. Nærmeste ekte API i dag er widgeten. Resten merkes «ingen API / F6 planned».

### 3.1 Kunde-skall og faner

| | |
|---|---|
| **Designet** | iPhone 402×874. Topp: logo + søk (44px pille) + to sirkler. Horisontal fane-rail: Hjem, Bestill, Bookinger, Meldinger, Kjøretøy, Profil. Preview-chrome: Mørk/Lys/Fullskjerm |
| **I dag** | Ingen kunde-shell. Widget: to faner Chat / Book time (`EndwiseWidget.tsx`) |
| **Forskjell** | Helt annen app. Widget er embed, ikke innlogget Min side |
| **Foreslått** | Ikke ny nav. Når F6 startes: tre innholdsfaner (Hjem / Bestill / mer) som **innhold**, ikke dealer-chrome. Ikke kopier forhandler top-bar 1+2 |
| **Hvorfor** | F6 er planned. Chrome-lås gjelder forhandler. Ny nav uten `/min-side` er ny funksjon |
| **Board UI** | `tabs` til innhold når F6 bygges. Ikke dest-piller. `search-field` bare hvis Min side får søk *og* API |

**Lås:** Forhandler top-bar 1+2 skal ikke limes på kunden.

### 3.2 Kunde-hjem

| | |
|---|---|
| **Designet** | «Hei, {fornavn} · Fredag 11. september». Aktiv jobb-kort: status-tag, tjeneste, kjøretøy, mekaniker, prikk-halvsirkel, steg Bestilt / Mottatt / Arbeid / Klar. «Bestill time» + første ledige dag. Uleste meldinger-rad. Neste time (dato-blokk). Påminnelser per kjøretøy med Bestill |
| **I dag** | Ingen. Thumbnail matcher designet, ikke en rute. `dine-jobber/_hjem-kort.tsx` er mekaniker |
| **Forskjell** | Flaten finnes ikke |
| **Foreslått** | **Ikke nå.** F6-08 (bookingoversikt + tidslinje) + F6-07 (garasje) er stedet. Ikke late som widget-hjem |
| **Hvorfor** | Ingen `/min-side`, ingen kunde-pulse-API. Halvsirkel på *aktiv jobb* er annen semantikk enn forhandlerens 08–19-bue |
| **Board UI** | Senere: `skeleton` mens booking lastes, `button` / `icon-button` på Bestill. Ikke ny chart-pakke — Amicro-halvsirkel finnes allerede hos forhandler hvis F6 vil gjenbruke mønsteret |

### 3.3 Bestill time

| | |
|---|---|
| **Designet** | Steg: 1 kjøretøy-chips (+ Nytt kjøretøy) → 2 tjenester (type-filtrert, flervalg) → kalender 60 dager med ledig/full/stengt-prikker → klokkeslett via `slotsFor` → oppsummering. Flytt time har egen «Timen du flytter»-seksjon. Etter send: «Verkstedet setter klokkeslett og bekrefter på SMS» |
| **I dag** | `EndwiseWidget.tsx` `BookingPanel`: tjeneste → dato → `/widget/availability` → navn/telefon → `createBooking`. Ingen kjøretøy, ingen innlogget garasje, ingen flytt |
| **Forskjell** | Widget er gjesteflyt. Designet er innlogget, kjøretøy først |
| **Foreslått** | **Lite, innen widget:** chips/segment for tjeneste + tydeligere steg-overskrifter (1 · 2 · …) mot eksisterende `/widget/services` + `/widget/availability` + `/widget/booking`. **Ikke** kjøretøy-steg uten kunde-innlogging og kjøretøy-API mot widget-token |
| **Hvorfor** | API finnes for tjeneste/tid/bekreft. Kjøretøy på widget-nøkkel er ulest / ikke i `EndwiseWidget` |
| **Board UI** | `segmented-control` eller chip-rad (samme mønster som batch 1 `tabs`/`segmented-control`). `select` hvis tjenestelista blir lang. `input` for navn/telefon (label + `aria-invalid`). `button` send. Senere fri `date-calendar` mot samme availability — ikke batch 1 |

### 3.4 Bookinger + detalj

| | |
|---|---|
| **Designet** | Liste Kommende / Tidligere / Alle. Detalj: steg, kv (status, kjøretøy, dag, tid, mekaniker, pris), samtale om timen, Flytt time, deler på jobben |
| **I dag** | Widget: «Forespørsel sendt» + bookingId. Ingen kundeliste. Forhandler ser bookinger på `/bookinger/[id]` |
| **Forskjell** | Kundeliste finnes ikke. F6-08 er planned («ingen ny datamodell — bookings og tråder finnes») |
| **Foreslått** | **Ikke nå.** Når F6-08: liste + tidslinje mot eksisterende `bookings`. Flytt time krever endrings-API kunden kan kalle — ulest på kundesiden; forhandler har `#178` `resolveChange` |
| **Hvorfor** | Data finnes for *forhandler*. Kunde-RPC/Min side-gate er ikke bygd |
| **Board UI** | `segmented-control` på Kommende/Tidligere. `tabs` ikke dest. `skeleton` på liste |

### 3.5 Kjøretøy (kundens garasje)

| | |
|---|---|
| **Designet** | Liste + «Legg til». Detalj: type/år/regnr/km/siste service/neste/fast forhandler. Bookinger og deler på kjøretøyet. Nytt: type → merke-chips → modell/år (kaskade) |
| **I dag** | F6-07 planned. Forhandler: `/kjoretoy`, `/kunder/_registrer-kjoretoy.tsx`. Widget har ingen garasje |
| **Foreslått** | **Ikke nå.** F6-07. Ikke åpne forhandler-`/kjoretoy` for `customer` |
| **Hvorfor** | Roadmap sier flaten gjør ikke (kunde-innlogging `customers.user_id` finnes; UI mangler) |
| **Board UI** | `input` / `select` / `segmented-control` på F6-skjema. Samme kaskade-idé som `#178` `_kjoretoy-kaskade.tsx` (forhandler), ikke Pro |

### 3.6 Meldinger (kunde)

| | |
|---|---|
| **Designet** | Trådliste. Ny melding: Til (verksted / mekaniker fra jobber) + Gjelder (booking) + tekst. Chat-bobler. Auto-svar i demo |
| **I dag** | Widget-chat mot AI (`/widget/chat`) med **AI Act art. 50 øverst** — lovtekst. F6-09: historikk på konto + eskalering F6-05. Forhandler-innboks er annen rolle |
| **Forskjell** | Designet er menneske-til-verksted. Widget er AI-gjest. Art. 50 mangler i designet |
| **Foreslått** | **Behold art. 50** på all kunde-AI. Ikke fjern disclosure for å ligne designet. F6-09 senere. Ikke gi kunden `/innboks` |
| **Hvorfor** | Art. 50 er låst i widget-koden. Designet er demo uten AI |
| **Board UI** | `textarea` / `input` i compose. `PromptInput` beholdes til AI-composer. Ikke Pro `agent-chat` i public repo |

### 3.7 Deler, kvitteringer, profil

| Flate | Designet | I dag | Foreslått | Board UI |
|-------|----------|-------|-----------|----------|
| Deler | Status-rail Alle/Bestilt/På vei/Ankommet/Montert. «Verkstedet bestiller» | Ingen kundeliste. Forhandler `/lager` | Ikke nå. Ingen kunde-API lest | `segmented-control` senere |
| Kvitteringer | Fullførte jobber, «Last ned PDF», Vipps-linje | Ingen. PDF er demo-`setState` | Ikke nå. Ingen PDF-API lest | `button` når eksport finnes |
| Profil | Kontakt, fast forhandler, varsler SMS/E-post/Push, påminnelser, Logg ut. Ingen kallenavn/avatar (matcher F6-11-advarsel) | F6-11 planned. F12-04 slett/eksport mangler UI | Ikke nå. Når F6-11: `switch` på varsler mot ekte kanal-API | `switch`, `input` (hint/error) |

**Kart (F6-10)** står i roadmap, **ikke** i `Endwise Kunde.dc.html`. Ikke finn på kart-UI herfra.

---

## 4. Forhandler mobil

UI-logikk.md + `Endwise Mobile.dc.html` + de to PNG-ene. Åtte faner = `FORHANDLER_NAV`. Skjermene er generisk sidemal (tittel, undertekst, primær, seksjon+rader, handlinger) pluss egne maler for Verkstedet, Innboks, Samtale, Skjema.

### 4.1 Telefon-chrome

| | |
|---|---|
| **Designet** | Logo + søk 44× pille + Ronny-øyne 36 + «M» 36. Rail: Verkstedet … Butikk, sentreres på aktiv (`centerRail`). Preview Mørk/Lys/Fullskjerm utenfor rammen |
| **I dag** | `phone-shell.tsx` + `phone-chrome.ts`: logo 32, `phone-sok-felt.tsx` h-8, Ronny/profil 28, dest-piller. Søk åpner overlay |
| **Forskjell** | Samme IA. Mål 44/36 vs 32/8/28. Design-søk er stub |
| **Foreslått** | **Ingen geometri-endring.** Etter Board-`add`: `search-field` `size="small"` `shape="rounded"` lucide Search, `clearLabel="Tøm søk"`, Escape-tøm, `isLoading` — **inne i h-8**. Rail-sentrering av aktiv dest er OK som oppførsel (vi har allerede `laasAktivMotStart`) |
| **Hvorfor** | Top-bar 1+2 er låst. PNG-ene er samme *komposisjon* som `PhoneHomeDealer` |
| **Board UI** | `search-field` (§4 P1 #3). Ikke `tabs` på dest-piller |

**Lås:** 44px-søk og 36px-sirkler strider.

### 4.2 Verkstedet (hjem)

| | |
|---|---|
| **Designet** | Fredag 11. September. 3/2/1 Planlagt/Pågår/Ferdig + prikk-halvsirkel 08–19. Avvik / forespørsler / Endringer. Uleste meldinger. Venter på bestilling. Analyse siste 30 dager: Visninger +11 %, Bookinger +6 %, Returer, Credits +2 % + spark. På Jobb 0/0 + Ny Jobb |
| **I dag** | `phone-home-dealer.tsx` + `pulse-kort.tsx`. Samme fem flater. Halvsirkel er Amicro `DitherDonutChart` med **blått fyll** `#0066ff` (data viz, ikke CTA). Analyse er fire mock-KPI (`analyserMockStats`: Besøk, Jobber, Bookinger, Retur). Tom historikk → plausibel 3/2/1 og 7 meldinger |
| **Forskjell** | Komposisjon nesten lik PNG. Design: prikk-SVG, ikke Amicro-blå. Design-KPI-navn (Visninger/Credits) er stub. `#178` skjuler Visninger/Returer/Credits og viser bare live Bookinger 30d |
| **Foreslått** | **Lite:** følg `#178` — ikke vis stub-KPI uten kilde. Behold Amicro-bue (Mobbin-aksent som viz er allerede vedtak). Prikk-SVG er estetikk; bytt ikke motor. På jobb-teller er ekte (`ansattePulse`). «Jobb»-flis → `/bookinger/ny` står |
| **Hvorfor** | `#178` er ærligere enn design-demoen. Ingen analyse-API lest for visninger/credits |
| **Board UI** | `skeleton` på tall mens `bookings.list` laster (vi har pulse-placeholder). Ikke Board-charts |

### 4.3 Innboks + samtale

| | |
|---|---|
| **Designet** | Søk, filter Alle / Kunder / Intern / Support / Løst, sorter Nyeste / Eldste / **Uleste først**, paginering, velgemodus + slett + **Angre** (`state.trash`). Samtale: bobler, deltakerchips, løst låser felt, inviter/fjern etter `access` |
| **I dag** | `/innboks`. Filter `INNBOKS_FILTERE`: Alle chatter / Kunder / Intern / **Endwise** (ikke «Support»/«Løst»). Sortering Nyeste/Eldste (`inbox-filter.tsx`). Slett er **skjul på klient** (`skjulFlere`), ikke `trash`+angre mot server. `#178` legger chips + «Uleste først»; Løst er ærlig stub (ingen resolved-kolonne) |
| **Forskjell** | Ord: Support vs Endwise. Løst/angre/uleste-først: design-demo / delvis `#178` |
| **Foreslått** | **Lite:** chips som innhold under chrome (ikke nye dest-piller) — Alle / Kunder / Intern / Endwise. Uleste først **hvis** lista allerede har `unread` (den har). **Ikke** Løst-filter uten kolonne. **Ikke** late som slett+angre er persistert — `#178` fjernet «Angre finnes ikke». Inviter: `_inviter-ansatt.tsx` finnes |
| **Hvorfor** | Filter uten felt er løgn. Skjul ≠ slett |
| **Board UI** | `search-field` i liste (ikke top-bar 1). `segmented-control` eller chip-rad. `dropdown` til sortering (erstatter `sortering-ark` oppførsel). `checkbox` i velgemodus. `modal`/`AlertDialog` hvis ekte slett kommer. `toast` til ekte angre |

### 4.4 Timeplan + endringer

| | |
|---|---|
| **Designet** | Ukesrail, måned-popover, jobb-liste, detalj (kunde, kjøretøy, tjeneste, mekaniker, varighet, status, notat). Endringer: avvik/forespørsel, godkjenning skriver `state.jobs` + `chLog` |
| **I dag** | `/jobber` (`saker/page.tsx`): `TimeplanStripe` + `TimeplanFlate` / `Kalender`. Faner Timeplan · Opprett jobb · Endringer. `/home?visning=dag` er telefon-dagskort (`_verkstedet-dag.tsx`), ikke ukesrail. Main: endringer telles fra `[AVVIK `-notat; forespørsel 0; «Godkjenning skrives ikke ennå». `#178`: `resolveChange` + angre + `jobSlots` |
| **Forskjell** | IA matcher. Persistens av godkjenning er `#178`, ikke main |
| **Foreslått** | Visuelt: ukesrail + dagsliste nærmere designets rader (tittel, sub, høyre status) uten ny rute. Godkjenning: ta `#178` når den er reviewet — ikke reimplementer i denne PR. Måned-popover: senere fri `date-calendar`, ikke batch 1 |
| **Hvorfor** | API for liste finnes. Mutasjon på main er uferdig; `#178` har den |
| **Board UI** | `dropdown` sortering. `modal` på godkjenn/avslå. `input`/`textarea` i «Meld endring» (`#178` `_meld-endring.tsx`). `skeleton` på stripe |

### 4.5 Kunder

| | |
|---|---|
| **Designet** | Alfabetisk + bokstav-rail, søk navn/telefon/e-post/**reg.nr**, paginering. Profil: kontakt, kjøretøy, jobbhistorikk, meldinger, slett+angre |
| **I dag** | `/kunder`: søk navn/e-post/telefon (ikke reg.nr i queryen som er lest), Nyeste/Eldste, kilde Alle/Endwise/Quick. Profil `kunder/[id]/page.tsx`: eier → kjøretøy → jobber → tråder → interne notater. `#178`: Apple Contacts-rail 26px / 11px på høyre kant, ikke i top-bar |
| **Forskjell** | Alfa-rail og reg.nr-søk er `#178` / design, ikke main-søkefeltet |
| **Foreslått** | **Lite:** ta `#178`-rail (innhold, ikke chrome). Reg.nr i søk **bare** hvis `customers.list` allerede treffer kjøretøy — ulest her; ikke late som. Slett+angre: ikke uten API |
| **Hvorfor** | Rail er rent UI på eksisterende liste. Nytt søkefelt uten server-treff er løgn |
| **Board UI** | `search-field` i `data-kunder-sok`. `input` i `_ny-kunde.tsx` / `_registrer-kjoretoy.tsx` (allerede `InnstillingSeksjon`) |

### 4.6 Tjenester

| | |
|---|---|
| **Designet** | Katalog MC/Båt/ATV, normert tid, påkrevd sertifisering (brukt av `jobSlots`) |
| **I dag** | `/prisliste` + `tjenestekatalog/_flate.tsx`. Opprett i fane, ikke «Ny» på Alle |
| **Forskjell** | Kategori-chips vs vår liste. Kompetanse ligger under mekanikere/team, ikke som chip på Tjenester-hjem |
| **Foreslått** | **Lite:** kategori-filter som chips **hvis** `services.list` har type/kategori-felt (katalogen har skills/varighet). Ikke ny sertifiseringsmotor — matcheren F3-02 finnes i `bookinger/ny` |
| **Hvorfor** | Filter på eksisterende katalog. Ny datamodell er utenfor |
| **Board UI** | `segmented-control` / chips. `input` / `number-field` i `_felter.tsx` |

### 4.7 Organisasjon

| | |
|---|---|
| **Designet** | Hub: firma, ansatte, vaktplan, abonnement Start/Pro/Enterprise (demo-priser), integrasjoner Hellanor / Finn.no / Vipps / Tripletex / Vegvesenet / Mailchimp |
| **I dag** | `/organisasjon`: Oversikt (`ForhandlerKort`), Ansatte, Abonnement, Integrasjoner (admin). Timeplan-pille peker `/jobber`. Integrasjoner er `billing.katalog` + oppsett quick/twilio/resend/vegvesen — **ingen av/på-bryter**, «Etterspor» |
| **Forskjell** | Demo-katalog ≠ vår katalog. Demo-planer ≠ Stripe-pakker |
| **Foreslått** | Hub-rader som i designet (tittel + sub + høyre) mot **eksisterende** seksjoner. Ikke tegn Hellanor/Finn/Vipps som «tilkoblet» uten at de står i `katalog`. Ikke Start/Pro/Enterprise-priser fra HTML |
| **Hvorfor** | Ærlig integrasjonsliste er allerede produktvedtak |
| **Board UI** | `switch` bare der vi faktisk har toggle (varsler, ikke fake integrasjon). `input` på `forhandleren/_kort.tsx` |

### 4.8 Lager

| | |
|---|---|
| **Designet** | Under minimum først, bestill → «på vei», inn/ut-logg, kjøretøy til salgs herfra |
| **I dag** | `/lager`: ekte `inventory.summary` + `listParts kunLav`. Piller Oversikt / Deler / Plass / Inn og ut. `#178`: hub + ærlige stubber, `/lager/bestill`, `/lager/kjoretoy` |
| **Forskjell** | Main er oversikt+lav. Designets bestill-flyt er delvis `#178` |
| **Foreslått** | Visuelt: «Under minimum»-seksjon som første blokk (vi har «Må bestilles»). Bestill-knapp bare mot rute/API som finnes (`#178` eller eksisterende bevegelse-dialog). Ikke «på vei» uten felt |
| **Hvorfor** | Tallene er ekte. Status «på vei» er ulest som inventory-status |
| **Board UI** | `number-field` antall. `modal` `_bevegelse-dialog.tsx`. `select` lokasjon |

### 4.9 Butikk

| | |
|---|---|
| **Designet** | Produkter + kjøretøy til salgs (Finn.no / Butikk / Reservert) |
| **I dag** | `/butikk`: `shop.catalog` fra lager-deler med utsalgspris. Kasse. Midlertidig `ButikkBookingWidget`. Flagg-styrt i nav. `#178`: hub mot catalog + `/butikk/kjoretoy` |
| **Foreslått** | To seksjoner (varer / kjøretøy) **hvis** `#178`-rutene blir stående. Ikke Finn.no-status uten integrasjon |
| **Hvorfor** | Shop-flagg + ekte katalog. Finn.no er demo-integrasjon |
| **Board UI** | `input` pris. `select` status bare med ekte enum |

### 4.10 Skjemaer (ny jobb, kunde, kjøretøy, melding)

| | |
|---|---|
| **Designet** | Én mal: `text` / `area` / `chips`. Ny jobb: `jobSlots()` — åpningstid 08–19 / lør 10–15 / søn stengt, vakt, sertifikat, ledig i 30-min, ellers ingen forslag. Kjøretøy kaskade. Compose: Kunde / Intern / Support. Nested form via `parentF` |
| **I dag** | `bookinger/ny/page.tsx`: `InnstillingSeksjon`, `mechanics.match`, `bookings.create`, Vegvesen-oppslag. `#178`: klient-`jobSlots` + `_kjoretoy-kaskade.tsx`. Ny kunde / kjøretøy: `_ny-kunde.tsx`, `_registrer-kjoretoy.tsx`. Ny melding: `_ny-samtale.tsx` |
| **Forskjell** | Felt-rekkefølge og chips vs native select. Motoren finnes (F3-01/02). Demo-søndag stengt / lør 10–15 er **ikke** lest som tenant-åpningstid — `PULSE_DAG_*` sier «ingen per-forhandler åpningstid i skjemaet» |
| **Foreslått** | **Lite:** chips der vi har 2–5 valg (mottakertype, kjøretøytype). Behold `InnstillingSeksjon`. Ikke hardkode 10–15/stengt uten org-felt. Nested «legg til kjøretøy i ny kunde» finnes delvis — ikke ny wizard |
| **Hvorfor** | Samme funksjon, tettere på designet. Ny åpningstidsregel uten felt er ny funksjon |
| **Board UI** | `input`, `textarea`, `select`, `number-field`, `radio`/`segmented-control` for chips. `modal` for nestet skjema. Ikke Pro Agent Creator (det er AI-profil, §12) |

---

## 5. Forhandler desktop

Samme program som mobil (`page()`-treet er identisk). Forskjellen som er lest: **fast sidemeny + topp + dagsplan på Verkstedet**.

### 5.1 Desktop-chrome

| | |
|---|---|
| **Designet** | `<aside>` ~250px: åtte rader + Mørk/Lys + «Endwise levert av TwoFold». Hoved: tittel, søk 42× max 460, knapp **Ny jobb**, Ronny 36 + M 36. Innhold `max-width:1320` |
| **I dag** | `desktop-shell.ts`: sidebar **389** (275 flush-right), box 2 **598×53** topp, box 3 **452** standby. Ingen «Ny jobb» i topp. `FORHANDLER_NAV` i sidebar |
| **Forskjell** | Annet skall. Designet bryter 389/598/452 |
| **Foreslått** | **Ikke** nytt skall. Ikke Board `sidebar`/`app-shell`. Ny jobb forblir `/bookinger/ny` + Jobb-flis / Timeplan-pille. Tema: eksisterende `_lib/tema-toggle.tsx`, ikke demo-piller i sidebar-bunn |
| **Hvorfor** | Chrome-lås. TwoFold-linje i nav er preview |
| **Board UI** | Ingen. `command-palette` er batch 1 men **ikke** telefon-chrome; desktop ⌘K er OK senere uten å røre 389 |

**Lås:** 250/1320 og topp-Ny-jobb strider.

### 5.2 Verkstedet + dagsplan

| | |
|---|---|
| **Designet** | Samme pulse-kort som mobil **pluss** «Dagens timeplan» + teller + «Åpne timeplan». Horisontal klokke **08.00–19.00**, rader = mekanikere på vakt (initialer, navn, «n jobber»), jobbokser etter start/varighet. Farge via `stCol`: Ferdig `--badgeFg` (lime), Pågår `--caution`, ellers `--info`. `border-left: 3px solid` |
| **I dag** | `home/page.tsx` `VerkstedetDesktop`: **bare** `DealerPulseKort`. Ingen dagsplan på desktop-hjem. `dashboard/_timeplan.tsx` er **vertikal** 08–**20**, kloss på klokke, `staffFargeStil` (ansatt-farge, ikke status-pip), brukes i `VerkstedetDag` (telefon `?visning=dag`). `#178` `home/page.tsx` er uendret på dette punktet |
| **Forskjell** | Designets desktop-dagsplan **manglet før** og mangler fortsatt på `/home` desktop. Vi har en annen timeplan-widget (vertikal, 08–20, ansattfarge) |
| **Foreslått** | **Middels, ikke stor:** vis eksisterende `Timeplan` (eller en horisontal variant) **under** pulse i `VerkstedetDesktop`, i box 2 (598). Data: `bookings.list` + `mechanics` — samme som `VerkstedetDag`. Etikett «Dagens timeplan» + lenke til `/jobber`. **Ikke** 3px border-left. **Ikke** lime. Status som tekst (som `_timeplan.tsx` allerede gjør). 08–19 vs 08–20: lite avvik — **ikke** endre `VERKSTED_DAG_*` i denne runden; design 08–19 matcher pulsbue, rutenett er 08–20. Dokumenter avviket |
| **Hvorfor** | Designet er tydelig på desktop-hjem. API finnes. Nytt Gantt-bibliotek er stor endring. Pip/lime er låsbrudd |
| **Board UI** | Ingen chart. Ev. `skeleton` mens bookinger lastes. Ikke Pro `calendar` / `project-board` |

### 5.3 Øvrige desktop-sider

Innboks, Timeplan, Kunder, Tjenester, Org, Lager, Butikk, skjemaer: **samme logikk som mobil** i designfilen. I produktet er de allerede responsive i box 2.

| Flate | Foreslått på desktop | Ikke |
|-------|----------------------|------|
| Innboks | Liste i 598, tråd kan bruke 452 hvis den allerede gjør det | Ikke tving 1320-bredde |
| Kunder | `#178` alfa-rail inne i 598 | Ikke rail i top-bar |
| Timeplan | Stripe + liste i 598. Ikke erstatt med desktop-dagsplan her — dagsplan hører på Verkstedet | Ikke Board calendar som side |
| Skjemaer | Samme felt, mer luft i 598 | Ikke modal-first bare fordi desktop |

---

## 6. Hva `#178` allerede dekker (ikke gjør om i #183)

| Design-bit | `#178` | main |
|------------|--------|------|
| Kunder alfa-rail | Ja | Nei |
| Analyse kun live Bookinger | Ja | Fire mock-KPI |
| Ærlig UI (skjul uferdig, ingen «ingen API»-tekst) | Ja | Varierer |
| Endring godkjenn / avslå / angre + `jobSlots` | Ja | Telling, ikke skriv |
| Ny jobb `jobSlots` + kjøretøy-kaskade | Ja | match + native felt |
| Innboks chips + Uleste først | Ja | Alle chatter + Nyeste/Eldste |
| Lager/butikk/org-hub | Delvis | Eldre sider |

`#178` sier «ikke merge» — venter Mikael browser-review. Denne analysen **anbefaler å bygge videre på #178** for forhandler-innhold, ikke parallell implementasjon på #183.

---

## 7. Prioritert endringsliste (små → større)

Bare ting som nærmer oss designet **uten** ny app, uten chrome-brudd, uten Pro.

### A — Små (samme rute, samme API, visuell/a11y)

1. **Verkstedet Analyse:** skjul stub-KPI uten kilde (som `#178`). Behold Amicro-spark. *Hvorfor:* designets Visninger/Credits er seed. *Board:* `skeleton` på Bookinger-tall.  
2. **Innboks-chips i lista** (Alle / Kunder / Intern / Endwise) — ikke nye destinasjoner. *Hvorfor:* designets Vis-rad. *Board:* `segmented-control` eller chip + eksisterende filter.  
3. **Uleste først** hvis `unread` allerede kommer fra `messages.listThreads`. *Board:* `dropdown` i sortering.  
4. **Kunder alfa-rail** inne i lista (`#178`). *Board:* ingen (ren layout).  
5. **Tjenester kategori-chips** hvis katalog har type. *Board:* `segmented-control`.  
6. **Lager «Under minimum»** som første seksjon (copy/hierarki). *Board:* ingen.  
7. **Skjemachips** (kjøretøytype, mottakertype) i eksisterende `InnstillingSeksjon`. *Board:* `segmented-control` / `radio`.  
8. **Telefon-søk oppførsel** etter batch 1: clear, Escape, loading — **h-8 urørt**. *Board:* `search-field`.  
9. **Form-a11y** på felt vi allerede har: `input`/`textarea`/`select` med label/hint/error. *Board:* P1 #1–2, #8.

### B — Middels (samme API, mer layout)

10. **Desktop Verkstedet: vis dagens timeplan under pulse** med eksisterende booking-data. Horisontal 08–19 *eller* gjenbruk vertikal `_timeplan.tsx` i 598. Ingen pip, ingen lime, ingen 1320. *Hvorfor:* dette var det som manglet i forrige designpass; desktop-fila har det nå. *Board:* `skeleton`.  
11. **Timeplan dagsliste-rader** tettere på designets rad (tittel / sub / status-høyre) uten ny motor. *Board:* ingen.  
12. **Org-hub** som radliste mot eksisterende seksjoner (ikke demo-integrasjoner). *Board:* ingen.  
13. **Ny jobb / kunde / kjøretøy:** kaskade og slot-forslag fra `#178` når den merges. *Board:* `input`/`select`/`number-field`.  
14. **Widget Bestill:** steg-overskrifter + tjeneste-chips mot `/widget/*`. Art. 50 urørt. *Board:* `input`, `button`, `segmented-control`.

### C — Større (krever API, F6, eller #178-mutasjon — ikke denne økten)

15. Endring godkjenn/avslå/angre persistert — `#178` `resolveChange`, ikke main.  
16. Innboks slett + angre mot server (ikke `skjul`).  
17. Løst-filter når resolved finnes.  
18. Åpningstid lør/søn per tenant.  
19. «På vei» / Hellanor-bestill som ekte leverandørstatus.  
20. **Hele Min side** (F6-07…11) — kunde-designet. Ikke start her.  
21. Kunde-PDF, kunde-deler, flytt-time som kunde.  
22. Nytt desktop-skall, Inter Tight, lime, 44px-søk, Board sidebar, Pro.

---

## 8. Board UI — hva som er utgangspunkt (gratis, batch 1)

Fra `docs/boardui-audit.md` §3.3. Restyle til Mobbin etter `add`. Ingen av disse erstatter chrome.

| Batch 1 | Brukes mot design-flate |
|---------|-------------------------|
| `search-field` | Telefon-søk (h-8), innboks-søk, kundesøk |
| `input` / `textarea` / `select` / `number-field` | Ny jobb, ny kunde, kjøretøy, widget-felt, org-kort |
| `segmented-control` / `radio` | Innboks-chips, booking-filter, tjenestekategori, skjemachips |
| `checkbox` | Innboks velgemodus |
| `dropdown` | Sortering (innboks, kunder) |
| `switch` | Kunde-varsler *når* F6-11; forhandler-varsler i dag |
| `modal` / `drawer` | Godkjenn endring, nestet skjema, bevegelse |
| `toast` | Ekte angre (ikke demo-`trash`) |
| `skeleton` / `spinner` | Hjem-tall, lister, dagsplan |
| `tabs` | Innhold (org-seksjoner, widget Chat/Book) — **ikke** dest-piller |
| `button` / `icon-button` / `close-button` | Modal-footer og +Jobb; ikke erstatt pille-CTA i batch 1 |
| `input-otp` | Ikke i Claude-designet (auth) — uendret plan |

Ikke utgangspunkt: `sidebar`, `app-shell`, Pro `calendar` / `project-board` / `agent-creator` / `agent-chat`, Board-charts.

---

## 9. Hva som ikke er lest / ukjent

- Kjørende demo i nettleser (filene er lest som kilde + to PNG + thumbnail).  
- Om `customers.list` på main treffer reg.nr.  
- Widget-token sine rettigheter til kjøretøy/tråder.  
- Om inventory har leverandørstatus «på vei».  
- Pro-`.tsx` (fortsatt ikke lastet).  
- `Endwise Mobile.html` linje-for-linje mot `.dc.html` — størrelse og synlige strenger matcher bundlet mobil; logikken er hentet fra `.dc.html` + UI-logikk.md.

---

## 10. Kort konklusjon

Forhandler-mobil er **allerede** designet i det store: Verkstedet-pulse, åtte destinasjoner, innboks/timeplan/kunder som egne ruter. Jobben er å **tette innhold** (ærlig analyse, chips, rail, skjema-chips) og **ikke** røre chrome.

Forhandler-desktop mangler **dagsplanen på `/home`**. Det er den ene tydelige flaten som var borte før og som denne pakken faktisk legger til. Den skal inn i 598 uten nytt skall og uten status-pip.

Kunde-filen er **Min side**, ikke widgeten og ikke `/dine-jobber`. Den bygges når F6 startes. Det eneste kunde-UI som kan nærme seg designet nå er widgetens Book time / Chat, med art. 50 beholdt.
