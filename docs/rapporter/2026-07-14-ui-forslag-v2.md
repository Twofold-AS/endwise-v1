# Arbeidsrapport — UI-forslag v2 (symmetrisk dither)

**Dato:** 14. juli 2026 (økt 6) · **Ingen kode skrevet. Ingen UI bygget.**

---

## 1. Hva er gjort

`docs/notater/UI-forslag.md` er skrevet om. «Dither som aksent hos forhandler» er ute.
**Forhandler og admin får nå samme behandling** — samme motor, samme tetthet, samme uttrykk.

Konkret hva det betyr for forhandleren:

| Skjerm | Før (v1) | Nå (v2) |
|---|---|---|
| **Oversikt** | Sparklines i hjørnet av KPI-kort, én stor graf | Kapasitetsflate i full bredde (`bloom="aura"`) · **grafen ER kortbakgrunnen**, tallet ligger oppå i `slot-text` · stacked uke-belegg per mekaniker · tjenestemiks som `PieChart` · dithered header-gradient |
| **Bookinger** | Vanlig tabell | Dithered flate **som radbakgrunn** (ikke en kolonne) · statusbadges som `DitherButton` |
| **Kalender** | Vanlige job-blocks | **Tetthet = belastning.** 95 % kapasitet gir en tett, mettet blokk; 40 % en spredt. `dotted` = tentativ, `gradient` = bekreftet, `hatched` = konflikt |
| **Mekanikere** | Liste | `DitherAvatar` (generative pixel-avatarer — ingen profilbilder å administrere) · load-bars som dither-flater · `RadarChart` for skills |

Kalender-grepet er det sterkeste i forslaget: du *ser* trykket i uka uten å lese en eneste
prosent. Det er ikke dekorasjon — det er informasjonstetthet.

`docs/UI-PAKKER.md` er oppdatert med den nye doseringen, så neste økt ikke arver v1-tenkningen.

## 2. Risikoene — skrevet inn som byggekrav, ikke som innvendinger

Retningen er din. Jobben min er å få den til å bli bra. Fire ting vil ødelegge den hvis vi ikke
løser dem, og hvert av dem har et mottiltak som bygges inn **fra dag én**:

1. **Frame budget.** Oversiktsskjermen har 7+ samtidige canvas, hver med sin egen RAF-løkke.
   → Tak på **≤ 8 canvas per skjerm**, flater utenfor viewport pauses (`IntersectionObserver`),
   `aura`-bloom kun på helten (bloom er en ekstra blurret canvas — dobbel maling).
   → **Performance-budsjett i CI:** 60 fps på throttlet 4x-CPU i Playwright, ellers feiler bygget.
   Ingen «det føles greit».

2. **`prefers-reduced-motion`.** dither-kit og beUI respekterer det allerede (jeg har lest kilden).
   → Vi verifiserer det i test i stedet for å stole på det. Bevegelsessyke er 5–10 % av brukerne,
   ikke en edge case.

3. **Lesbarhet i booking-flyten.** Kalender-tetthet er det farligste grepet: skal en selger tolke
   en tekstur mens en kunde venter på telefonen, har vi tapt.
   → **Regelen: dither bærer aldri informasjon alene.** Tetthet forsterker, tallet står i
   klartekst. *Slår du av alle flatene, skal skjermen fortsatt være fullt brukbar.* Samme regel
   gjør oss WCAG-holdbare.

4. **Kontrast.** Dithering er piksler med hull i — spredte flater kan falle under kravet på lys
   bakgrunn.
   → Kontrast-sjekk mot begge temaer når prototypens tokens er inne. Tekst legges aldri rett på
   en dither-flate.

## 3. Hva gikk galt

Ingenting. Dette var en ren dokumentrevisjon — ingen kode rørt, ingen avhengigheter endret,
roadmap uendret.

## 4. Det gjenstående — samlet

| # | Spørsmål | Status |
|---|---|---|
| **1** | **Recharts ut, dither-kit som eneste chart-motor?** | ⛔ **Blokkerer.** Techstack §2 lister begge. Med denne retningen bruker vi dither-kit til alt, og Recharts blir en avhengighet vi later som vi har. **Det er en techstack-endring — jeg tar den ikke uten et eksplisitt ja.** Sier du ja: jeg oppdaterer §2, `UI-PAKKER.md` og roadmap i samme økt |
| 2 | Hente `bar-chart`, `pie-chart`, `radar-chart`, `avatar`, `gradient` nå? | Forslaget bruker alle fem. Ett CLI-kall, null risiko |
| **3** | **Prototypen inn i repoet** | ⛔ **Blokkerer.** Tokens er plassholdere. Dither-uttrykket *er* farge — jeg vil ikke velge paletten for deg |
| 4 | Lisens-avgjørelsen på matrix-loaders | Juridisk, ikke teknisk |
| 5 | Ja/nei på F14 Desktop-app | Sist i rekka uansett |

**Uten svar kan jeg gå videre med F2 — Kjernedata (backend):** kjøretøyregister (F2-01),
tjenestekatalog (F2-04), kunderegister (F2-06), Vegvesen-oppslag (F2-08). Ingen UI involvert.

Ingenting er pushet.
