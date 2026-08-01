# UI-forslag — v2

**Dato:** 14. juli 2026 · **Status:** revidert etter din tilbakemelding. **Ingenting er bygget.**

**Endringen fra v1:** «dither som aksent hos forhandler» er ute. **Forhandler og admin får samme
dither-behandling.** Ikke en nedskalert forhandler-versjon — samme motor, samme tetthet, samme
uttrykk. Forhandleren skal åpne dashbordet og se noe levende.

---

## 1. Lagene — hvor uttrykket kommer fra

```
@endwise/widget-tokens         --ew-bg  --ew-fg  --ew-accent  --ew-surface …
        │                      (lys / mørk / aksent — F0-11, fra prototypen)
        ▼
packages/ui/src/theme.css      shadcn-semantikk peker INN i ew-tokens
        │
    ┌───┴──────────────┬──────────────────┬────────────────────┐
    ▼                  ▼                  ▼                    ▼
shadcn/ui         dither-kit          beUI                matrix-loaders
struktur          UTTRYKKET           tilstand            venting
(tabeller,        (charts, flater,    (StatefulButton,    («AI tenker»,
 dialoger,         gradienter,         lib/ease.ts =       SSE-events)
 skjema)           avatarer)           kanoniske fjærer)
```

**dither-kit er ikke pynt på toppen av UI-et — det ER UI-et der data vises.**
shadcn holder strukturen (rader, dialoger, skjema). Dither eier flatene.

---

## 2. Forhandler — full dither-behandling

Prinsippet: **alt som er et tall over tid, er en dither-flate.** Ikke et tall med en liten strek
under.

### Oversikt (F3-05) — dashbordet som lever

| Element | Komponent | Uttrykk |
|---|---|---|
| **Helten**: dagens kapasitet | `<AreaChart>` i full bredde, `bloom="aura"`, `variant="gradient"` | Timene i dag som en dithered flate. Fyllingen *er* belegget — du ser om dagen er full før du har lest et tall |
| 4 KPI-kort | `<AreaChart>` som **kortbakgrunn** (ikke sparkline i hjørnet), `bloom="high"`, tallet i `slot-text` oppå | Tallet ruller, flaten puster bak det. Kortet er grafen |
| Uke-belegg per mekaniker | `<AreaChart>` stacked, én `<Area>` per mekaniker, `<Legend isClickable>` | Klikk en mekaniker → de andre dimmes. Samme grep som admin bruker på forhandlere |
| Tjenestemiks 30 dager | `<PieChart>` (hentes: `dither-kit add pie-chart`) | Hvilke tjenester bærer verkstedet |
| Bakgrunn i header | `<DitherGradient from="…" direction="up" />` | Signaturen, ikke en graf |

**Ingen sparklines-i-hjørnet.** Grafen er ikke en fotnote til tallet — tallet er en etikett på grafen.

### Bookinger (F3-06)

shadcn data-table for radene — men:

- **Rad-flate:** hver rad har en tynn dithered `<Sparkline>` **som radbakgrunn** (`bloomOnHover`),
  ikke i en kolonne. Historikken ligger *under* raden.
- **Statusbadges:** `<DitherButton variant="gradient" color="…">` i stedet for flate shadcn-badges.
- **Filterbar:** aktive filtre som dithered chips.

### Kalender (F3-07) — der dither gjør en ekte jobb

Job-blocks tegnes som **dithered flater med tetthet = belastning**. En mekaniker på 95 %
kapasitet får en tett, mettet blokk; en på 40 % en tynn, spredt en. `variant="dotted"` for
tentative, `"gradient"` for bekreftede, `"hatched"` for konflikt.

Du *ser* trykket i uka uten å lese en eneste prosent. Det er ikke dekorasjon — det er
informasjonstetthet.

### Mekanikere (F3-08)

- `<DitherAvatar name={mekaniker.navn} />` — generative pixel-avatarer. Ingen profilbilder å
  administrere, og de ser ut som oss.
- Load-bars som dithered flater, ikke shadcn-progress.
- `<RadarChart>` per mekaniker: skills-profil (hentes: `dither-kit add radar-chart`).

### Overlays (F3-09/F3-10)

`<StatefulButton>` (beUI) på «Bekreft booking»: idle → loading → success, med `SPRING_SWAP` fra
`lib/ease.ts`. Slot-maskinen som velger ledig tid bruker `slot-text`.

---

## 3. Admin — samme motor, større flate

Uendret fra v1, men nå er det *ikke* et nivå over forhandleren — det er samme språk, flere
tenants:

| Skjerm | Dither |
|---|---|
| Oversikt | `<AreaChart>` stacked over alle forhandlere, `bloom="aura"` |
| Forhandlerliste | Rad-flate per forhandler (samme grep som forhandlerens bookingliste) |
| Bookingvolum/plan | `<BarChart>` |
| Modulbruk | `<PieChart>` / `<RadarChart>` |

**Symmetrien er poenget:** en forhandler som ser Endwise-admin-skjermen skal kjenne igjen
språket, ikke føle at de har fått barneversjonen.

### Mekaniker-PWA (F7) — det ene unntaket

Fortsatt ingen tunge grafer. Ikke fordi mekanikeren fortjener mindre, men fordi hun står i et
verksted med hansker på og skal se **ett** kort om gangen. Her bærer `matrix-loaders`
uttrykket i stedet — dithering i bevegelse, ikke i data.

---

## 4. Risikoene — og hva vi gjør med dem

Retningen er bestemt. Dette er ikke innvendinger; det er de fire tingene som vil ødelegge den
hvis vi ikke løser dem, med et konkret mottiltak til hver.

### 4.1 Frame budget — canvas-flater er ikke gratis

Hver dither-flate er en `requestAnimationFrame`-løkke som maler piksler. Oversiktsskjermen slik
den er skissert har **7+ samtidige canvas** (helte-graf + 4 kortbakgrunner + stacked uke + pie).
På en gammel kontormaskin hos en forhandler er det målbart.

**Mottiltak (bygges inn fra dag én, ikke etterpå):**
- **Én RAF-dirigent.** dither-kit kjører én løkke per chart. Vi må vite hvor mange som er live
  samtidig, og pause dem som er utenfor viewport (`IntersectionObserver`). En graf som ikke er
  synlig, skal ikke male.
- **`bloom="aura"` kun på helten.** Bloom er en ekstra blurret canvas-kopi — dobbel maling.
  Kortbakgrunner får `bloomOnHover`, så de er billige i ro.
- **Budsjett:** ≤ 8 samtidige canvas per skjerm. Overskrides det, deler vi skjermen.
- **Vi måler.** Performance-budsjett i CI: oversiktsskjermen skal holde 60 fps på en throttlet
  4x-CPU-profil i Playwright. Faller den under, feiler bygget. **Ingen «det føles greit».**

### 4.2 `prefers-reduced-motion` — ikke en nice-to-have

Dither-kit respekterer allerede `prefers-reduced-motion` (jeg har lest kilden: `EASE = 1`,
entrance-sweep av, stjernene slutter å blinke). beUI gjør det samme via `useReducedMotion`.

**Mottiltak:** vi verifiserer det i test i stedet for å stole på det. En Playwright-kjøring med
`reducedMotion: 'reduce'` som feiler hvis noe fortsatt animerer. Bevegelsessyke er ikke en
edge case — det er ca. 5–10 % av brukerne.

### 4.3 Lesbarhet i en booking-flyt

Kalenderen med tetthet-som-belastning er det sterkeste grepet i forslaget — og det farligste.
Hvis en selger skal booke inn en kunde på telefonen og må *tolke* en tekstur, har vi tapt.

**Mottiltak: dither bærer aldri informasjon alene.** Tetthet er *forsterkning*, ikke kilde.
Hver job-block har prosenten i klartekst, hver status har et ord, hvert KPI-kort har tallet.
Regelen: **slår du av alle dither-flater, skal skjermen fortsatt være fullt brukbar.** Det er
også kravet som gjør oss WCAG-holdbare (farge/tekstur er aldri eneste bærer av mening).

### 4.4 Kontrast

Dithering er piksler med hull i. På lys bakgrunn kan en spredt flate falle under
kontrastkravet.

**Mottiltak:** kontrast-sjekk av flatene mot begge temaer når prototypens tokens er inne (F0-11),
og tekst legges aldri rett på en dither-flate uten et solid lag imellom.

---

## 5. Det jeg trenger fra deg

| # | Spørsmål | Hvorfor det haster |
|---|---|---|
| **1** | **Recharts ut — dither-kit som eneste chart-motor. Ja?** | Techstack §2 lister begge. Med denne retningen bruker vi dither-kit til *alt*, og Recharts blir en ubrukt avhengighet vi later som vi har. **Det er en techstack-endring, og jeg tar den ikke uten et eksplisitt ja.** Sier du ja, oppdaterer jeg §2, `UI-PAKKER.md` og roadmap i samme økt |
| 2 | Skal jeg hente **`bar-chart`, `pie-chart`, `radar-chart`, `avatar`, `gradient`** nå? Forslaget bruker alle fem | Ett CLI-kall, ingen risiko. Ellers venter jeg til skjermen bygges |
| 3 | **Prototypen** inn i repoet | Uten den er tokens plassholdere. Dither-uttrykket *er* farge — jeg vil ikke velge paletten for deg |
| 4 | Lisens-avgjørelsen på **matrix-loaders** | Ren juridisk vurdering, ikke teknisk |
| 5 | Ja/nei på **F14 Desktop-app** i roadmap | Sist i rekka uansett |

Ingenting av UI-et bygges før spørsmål 1 og 3 er besvart.
