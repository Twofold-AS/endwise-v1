# Rapport — 20.08.2026 — Selektiv bevegelse + brukerrad i sidebar-bunnen

**Roadmap:** F6-19 utvidet · F5-13 utvidet
**Godkjenning:** Mikkis (eksplisitt bestilling)

---

## 1. Hva er gjort

### 1.1 Animasjon per bruksted, håndhevet av typen

`Avatar` har fått en **påkrevd** `bevegelse`-prop:

| Verdi | Rendring | Hvor den brukes |
|---|---|---|
| `stille` | ett `<img>` | Samtalelista · kundelista · de 24 valgknappene i profilen |
| `hover` | inline SVG, amplitude 0 til `:hover` | Meldingene i tråden · Detaljer-panelet · kundekortet · brukerraden |
| `alltid` | inline SVG, alltid i bevegelse | **Kun** forhåndsvisningen i Settings › Profil |

**Hvorfor påkrevd og ikke en default:** en default er noe man arver uten å tenke. Da ville en
liste med 200 rader en dag fått animasjon fordi ingen skrev noe — nøyaktig den feilen du ba meg
sikre mot. Det er samme argument `requireSession(db)` fører for sitt påkrevde db-argument: gjør du
det valgfritt, hopper kallstedet som glemmer det stille over avgjørelsen.

Bonusen var konkret: **da propen ble påkrevd, flagget TypeScript nøyaktig de elleve kallstedene som
fantes.** Lista over ble til av kompilatoren, ikke av at jeg lette.

**`hover` er ikke en halvveis `alltid`.** Det er bibliotekets eget standpunkt, og et godt et:
«ambient motion seen constantly is motion worth removing», og `"hover"` «animates one blobatar at a
time», som er både det estetiske og det ytelsesmessige svaret. En tråd med tretti meldinger står
altså helt i ro til du peker på ett ansikt — det er slik «animert i samtalene» kan være sant uten
at tråden blir en vegg av bevegelse.

**`alltid` brukes ett sted.** Pakken dokumenterer den som unntaket for «the single-blobatar case —
a profile header», som er en presis beskrivelse av profil-forhåndsvisningen: der *er* bevegelsen
innholdet, siden du står og ser på ansiktet mens du endrer det. De 24 valgknappene i samme skjema
er derimot en liste, og står stille — 24 pustende blober er en fargeprøve som skjelver.

⚠️ `@import "blobatar/motion.css";` lagt i `globals.css`, rett ved matrix-loaders-importen og av
samme grunn: uten den er det **ingen feilmelding**, ingenting i typecheck og ingenting i bygget —
bare ansikter som står stille der de skulle puste.

Gratis fra biblioteket, og verdt å vite: `prefers-reduced-motion: reduce` slår av all animasjon, og
på enheter uten ekte hover pauses `hover`-modus helt. Ingen av delene håndteres av oss.

### 1.2 Brukerraden nederst i sidebaren

Avatar + navn + rolle, under Settings. Toppen svarer nå på **hvor du er** (forhandler + visning),
bunnen på **hvem du er**. Andre linje i kontekstbytteren sa `{userName} · {roleLabel}` og er byttet
til kontekstens navn — ellers ville navnet ditt stått to steder i samme kolonne.

## 2. ⛔ Valget du ba meg ta: ekte meny, ikke navigerende chevron

Bestillingen var «dropdown-ikon som viser at man kan trykke, klikk går til profilen». **Chevronen
er problemet:** en nedoverpil lover en meny. Går den i stedet rett til en side, har kontrollen sagt
én ting og gjort en annen — samme slag som «Flere filtre»-trakten uten `onClick` som jeg fjernet
fra innboksen tidligere i dag.

Repoet har allerede formulert regelen selv. I `context-switcher.tsx` står det, om tilfellet der
det bare finnes én kontekst å bytte til:

> «En pil som ikke leder noe sted er verre enn ingen pil.»

Så: enten en ærlig pil med en ekte meny, eller ingen pil. Jeg valgte den første, fordi det
**allerede fantes to ting som hører hjemme der**:

- **Profil** — destinasjonen du ba om. Navngitt, ett klikk unna.
- **Logg ut** — som lå nederst i Settings-flyouten, med en kommentar som selv innrømmet at den var
  «den ene handlingen i menyen som ikke fører deg til en side». Å logge ut handler om **personen**,
  ikke om konfigurasjon.

Resultatet er en ryddigere deling enn den var før: **Settings er nå rene destinasjoner** — og
«Profil» er fjernet derfra, som bestilt — mens brukerraden er de to tingene som gjelder deg.

⚠️ **Kostnaden er ett klikk ekstra til profilen.** Vil du heller ha direkte navigasjon, er den
ærlige varianten å bytte chevronen mot `ChevronRight` («hit går du») eller `UserCog`. Det er ett
ikon å endre, og jeg gjør det gjerne. Det som ikke bør stå, er en nedoverpil som navigerer.

## 3. Hva gikk galt

Ingenting av betydning. To småting fanget underveis:

- **JSX-kommentar i ternær-posisjon.** `{/* … */}` er gyldig blant JSX-*barn*, ikke i en
  uttrykksposisjon inne i en ternær. Ga tre parserfeil, rettet til vanlig `/* … */`.
- **Ubrukte importer** etter at «Logg ut» flyttet ut av `sidebar.tsx` — fanget av biome.

## 4. Verifisert

typecheck 22/22 ✓ · `next build` ✓ · biome rent på egne filer (de 3 repo-funnene er
pre-eksisterende) · roadmap 181 punkter, 181 unike, 0 ukjente ui-verdier.

| Suite | Antall |
|---|---|
| api | 87 |
| ui | 14 |
| modules · db · auth | 120 · 49 · 19 |

**CSS-gotchaen er sjekket, ikke antatt:** `mo-breathe`, `mo-bob`, `mo-blink`, `mo-saccade`,
klassen `mo-always` (som `alltid`-modus henger på) og `prefers-reduced-motion`-vakten er alle
verifisert til stede i den bygde produksjons-CSS-en.

## 5. ⚠️ Ikke verifisert

**Visuelt — og denne gangen er det mer alvorlig enn sist.** Nettleserpanelet nekter fortsatt å
navigere til localhost i dette miljøet, og **bevegelse er nettopp det som ikke kan verifiseres med
en HTTP-statuskode.** Det jeg kan si er at markupen bygges, CSS-en er på plass og typene stemmer.
Det jeg ikke kan si, er hvordan det ser ut.

Tre ting bør ses etter med øyet:

1. At tråden er **rolig** til du peker på et ansikt — ikke en vegg av bevegelse.
2. At profil-forhåndsvisningen faktisk lever, og at 20px-varianten fortsatt er lesbar mens den gjør det.
3. At brukerraden nederst ikke konkurrerer visuelt med Settings-raden rett over.

Kjør `pnpm dev` og åpne `/innboks` og `/innstillinger/profil`.

⚠️ **Ingen test dekker at lister faktisk er `stille`.** Den garantien ligger i den påkrevde propen
og i kodegjennomgang, ikke i en assertion. En ekte test ville krevd `react-dom/server` som ny
devDependency i `packages/ui` — mulig, men jeg la det ikke til uten å spørre, særlig gitt
EBUSY-trøbbelet med installasjoner i dette miljøet.

## 6. Neste steg

1. **Visuell gjennomgang** — de tre punktene over.
2. **Chevron-avgjørelsen** er din: ekte meny (som nå) eller direkte navigasjon med et ærligere ikon.
3. **`/mekanikere` og `/min-dag/meg`** står fortsatt uten avatar, som nevnt sist. Med brukerraden
   på plass er `/min-dag/meg` (mekanikerens «Meg»-fane) den mest påfallende: den viser deg selv,
   uten ansiktet ditt.
