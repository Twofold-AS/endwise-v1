# Rapport — 20.08.2026 — Roadmapen omorganisert etter kategori

**Roadmap:** ingen statusendringer utenom F5-36 (`blocked` → `planned`)
**Godkjenning:** Mikkis («synes roadmap er veldig rotete», «du må ikke fjerne noe»)

---

## 1. Kategoristrukturen

| # | Kategori | Underkategori | Punkter |
|---|---|---|---|
| 1 | **Dashboard** | Forhandler · Mekaniker · Endwise-admin | 50 (35 · 8 · 7) |
| 2 | **Kundeflater** | Bookingwidget · Min side · Offentlige sider | 18 (11 · 5 · 2) |
| 3 | Framer & plugin | — | 7 |
| 4 | Sikkerhet & tilgang | — | 19 |
| 5 | Personvern & etterlevelse (portvakt) | — | 22 |
| 6 | Kjernedata & booking | — | 12 |
| 7 | Meldinger & AI | — | 13 |
| 8 | Integrasjoner | — | 13 |
| 9 | Design & UI-fundament | — | 9 |
| 10 | Plattform & drift | — | 19 |

Rekkefølgen er lesrekkefølge: det folk ser og bruker først, så det som ligger under, og til slutt
det som må være grønt før produksjon.

**Hvorfor ikke bare dine tre.** Du foreslo dashboard (med tre under), sikkerhet og Framer. De ble
alle med. De sju andre kom av at innholdet krevde dem: 22 compliance-punkter, 13 integrasjoner og
19 plattformpunkter ville ellers måttet stappes inn i «sikkerhet» eller «dashboard», og da hadde
kategoriene løyet om hva de inneholder.

**Én kategori er en samlepost jeg vil flagge:** «Plattform & drift» (19) rommer både monorepo/CI,
deploy-topologi, lagring og ytelsesbudsjett. Den kan deles i to hvis den blir uoversiktlig — men
det ville gitt 11 kategorier for 19 punkter, og jeg valgte færre.

## 2. ⛔ Sporbarheten: ingen nye IDer i det hele tatt

Du ba meg si hvordan jeg løser dette. Svaret er at jeg **ikke innførte nye IDer**.

F-IDen er punktets permanente identitet, og den er referert fra kodekommentarer, fra
`roadmap-endringer.md` og fra hver eneste rapport i `docs/rapporter/`. En omnummerering ville
gjort alle de referansene døde på én gang.

Kategorien er derfor et **felt på punktet** — `kat`, og `sub` der kategorien har underkategorier —
ikke en ny nummerering. `F5-13` heter fortsatt `F5-13`, og et søk etter den i kodebasen treffer
fortsatt. **Null brutte referanser.**

## 3. Hvordan «når» ble bevart

Fasene bar tidsinformasjonen, og det var den reelle risikoen ved å bytte akse. Tre grep:

1. **`ROADMAP`-strukturen er urørt.** Dataene er fortsatt gruppert på fase; kategoriene er et
   felt oppå. Det betyr også at endringen er reversibel ved å fjerne ett felt og én funksjon.
2. **Bryteren «Etter fase (F0–F14)»** gir den gamle visningen, identisk, og valget huskes.
3. **Fase-chip på hver rad**, med tooltip: «Fase F2 — Kjernedata (Uke 5–8)». Uten den ville
   kategorivisningen sagt hva som skal bygges, men ikke når.

Begge visningene tegner de samme radene fra de samme dataene gjennom én delt `tegnRad()` — ikke
to kodeveier som kan drifte fra hverandre.

## 4. Formuleringene: 27 punkter omskrevet

Ditt eksempel var **F0-04**, som sto som «Entitlements: tenant_modules-tabell + DB-baserte
feature-flags». Den sier nå at det er **to brytere som ofte forveksles** — har forhandleren KJØPT
noe (`tenant_modules`, skrives kun av Stripe-webhooken) og har VI rullet det ut (`feature_flags`,
styrt fra Endwise-admin) — at begge må si ja, og at admin-flaten for å skru flagg fortsatt mangler.

Mønsteret for alle omskrivinger: **FLATE** (hvilken rute) · **BYGGES** (hva som lages) ·
**TRENGS** (hva som mangler først).

Tyngdepunktet er Dashboard, som du ba om. Eksempel — F3-08 gikk fra «DealerMechanics:
mekanikerliste m/ load-bars, skills, sertifisering» til å navngi ruta `/mekanikere`, si at
sertifiseringer vises rødt når utløpt og gult under 60 dager (samme mønster som EU-fristen), og
at det **ikke trengs ny backend** fordi tabellene finnes.

⚠️ **155 punkter er ikke omskrevet.** De var enten allerede konkrete — alt med BYGGET- eller
FERDIG-tekst fra de siste ukene — eller korte og entydige fra før. Å skrive om alle ville vært
mye endring for lite gevinst, og hver omskriving er en sjanse til å innføre en feil.

## 5. Ryddingen du ba om i samme slengen

- **F2-03**: «R2-lagring» → **Vercel Blob**, med hele begrunnelsen i punktet, og konkret hva som
  bygges (opplasting per merke/modell, godkjenningssteg, `srcset` i tre bredder, fallback-silhuett).
- **F5-36**: `blocked` → **`planned`**, med en eksplisitt note om at «blokkert på et §2-valg» var
  feil. Begge peker nå på hverandre: de deler pipeline og bør bygges sammen.

## 6. Verifisert — og denne gangen har jeg faktisk sett det

**182 punkter før, 182 etter. 182 unike IDer.**

Kategorikartet er assert-et før noe ble skrevet: 182 tilordnet, 0 uten kategori, 0 ukjente IDer i
kartet, ingen duplikate tilordninger. Skriptet feiler hvis ett punkt mangler.

⭐ **Og jeg fikk endelig kjørt det i en ekte nettleser.** Roadmapen er statisk HTML, så jeg satte
opp en liten lokal filserver og åpnet den — noe jeg ikke har fått til med Next-appen i denne
økta. Målt i DOM-en:

| | Kategorivisning | Fasevisning |
|---|---|---|
| Rader | **182** | **182** |
| Fase-chips | 182 | — |
| Grupper | 2 med undergrupper + 8 | 15 faser |

Bryteren ble klikket begge veier og telte 182 hver gang. Fase-chipen på første rad leste
«F2» med tooltip «Fase F2 — Kjernedata (Uke 5–8)».

⚠️ **Ingen skjermbilde.** Nettleserpanelet komposierer fortsatt ikke, så jeg har verifisert
DOM-en og ikke utseendet. Det jeg ikke kan si noe om, er om innrykket på underkategoriene og
fase-chipen ser bra ut ved siden av de andre merkene på raden.

Status etter: 68 done · 32 progress · 77 planned · 5 blocked.

## 7. Neste steg

1. **Se over kategoriplasseringene.** De er mine vurderinger, og noen er skjønn: F5-34
   (offentlig veikart) og F5-35 (markedssiden) havnet under Kundeflater › Offentlige sider,
   F0-04 under Sikkerhet fordi den er datagrunnlaget for modulgaten, og F11-03 (A/B-test) under
   Plattform fordi den er flagg-infrastruktur. Å flytte et punkt er å endre ett ord i fila.
2. **Si fra om flere punkter er for vage.** Jeg tok de 27 jeg mente var verst; du kjenner
   produktet bedre enn meg og ser sikkert flere.
3. **F2-03 + F5-36 bygges sammen** — én Vercel Blob-pipeline dekker begge.
