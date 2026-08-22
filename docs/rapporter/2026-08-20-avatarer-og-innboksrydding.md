# Rapport — 20.08.2026 — blobatar-avatarer (F6-19) + knapperydding i innboksen (F5-14)

**Roadmap:** F6-19 → `done` (NYTT punkt) · F5-14 utvidet med knapperyddingen
**Godkjenning:** Mikkis (eksplisitt bestilling) — **§2-endring**, ny UI-pakke

---

## 1. Hva er gjort

### 1.1 Pakken

`blobatar` + `@blobatar/react` `^2.3.1` · MIT · ~4,4 kB · **null egne avhengigheter** · alt
genereres klientside. Ingen avatar-URL, ingen tredjepartsforespørsel. Hentet inn bak `Avatar` i
`packages/ui/src/components/avatar.tsx` — appene importerer aldri pakken direkte, samme regel som
for Recharts og lucide. Installert i **både** `packages/ui` og `apps/web` (Next transpilerer
UI-kilden i appens resolusjonskontekst — samme felle som `motion` og `recharts`).

Dokumentert i UI-PAKKER §10 (nytt kapittel + kartet + «Sist oppdatert») og techstack §2.

### 1.2 Hvor avataren vises

Innboksens samtaleliste · meldingene i tråden · Detaljer-panelet (kunde **og** mekaniker) ·
kundelista · kundekortet · forhåndsvisning i Settings › Profil.

⛔ **Ikke** på kjøretøy (F2-03 eier modellbilder med ekte silhuetter), **ikke** på forhandleren som
organisasjon (den er ikke en person — `Kontokontekst` beholder sitt nøytrale ikon med vilje),
**ikke** i widgeten eller på kundevendte flater.

### 1.3 Redigering i profilen — tre kontroller av 39 mulige

Pakken eksponerer **39 trait-nøkler** (`eye.gap`, `body.rot`, `freckles.size`, `gaze.x`,
`motion.saccadePhase` …), hver pinnbar som en 0–1-posisjon. Alt *kan* gjøres redigerbart.
Forslaget mitt, og det som er bygget, er tre:

| Kontroll | Hvorfor akkurat denne |
|---|---|
| **Form** — 10 silhuetter | Det som faktisk skiller to ansikter på en liste. Pakken sier det selv om sin egen stil: silhuetten ER identiteten |
| **Farge** — 8 punkter rundt sirkelen | Det folk kjenner igjen seg selv i. 8 og ikke 360: en gradvis hue-slider er mer presisjon enn valget har |
| **Tone** — 6 forfattede svatsjer | Bibliotekets eget sett. En fri L/C-slider er nettopp det som får genererte paletter til å se genererte ut |

Hver knapp **viser** resultatet med brukerens egen seed i stedet for å beskrive det — «Knott» sier
ingenting, en knott gjør det. «Per navn» er en ekte, valgbar tilstand per kontroll, ikke fravær av
et valg.

## 2. De fem valgene som betydde noe

### ⛔ 2.1 Seeden er en stabil ID, aldri et navn

Retter noen «Kari Nordmman» → «Kari Nordmann», skal ikke kunden bytte ansikt. To kunder som begge
heter «Ola Hansen» skal ikke dele et. `Avatar` tar `seed` (ID) og `navn` (kun `title`/`alt`).
`normalize={false}`, siden bibliotekets trim/lowercase er riktig for et navn og meningsløst for en
UUID.

### ⛔ 2.2 Serveren bestemmer seeden

`directory.participants` returnerer nå `seed` ved siden av navnet: kunde → `customers.id`,
mekaniker → `mechanics.id`, ansatt → `user.id`.

Dette er ikke pynt. Deltaker-IDen en melding bærer er en Better-Auth-bruker, men kundekortet
kjenner bare `customers.id`. Hadde klienten valgt seed selv, ville **samme menneske hatt ett
ansikt i innboksen og et annet på kundekortet** — nøyaktig det du ba om at ikke skulle skje.

### 2.3 Valgene bor i `user_preferences`, ikke `member_profiles`

Skjemaet hadde allerede svaret: varslingslyder ligger der fordi det er «en egenskap ved MENNESKET,
ikke ved arbeidsplassen». En avatar er det samme — bytter du forhandler, tar du ansiktet med deg.
Kallenavn er det motsatte og bor tenant-skopet.

⚠️ Konsekvensen er at tabellen **ikke har RLS**. Isolasjonen kommer derfor fra spørringen:
`participants` slår opp avatarer for **kun de IDene den allerede har bekreftet hører til
tenanten**. En ID vi ikke kan navngi, spør vi heller ikke om et ansikt for.

### ⛔ 2.4 Tre navngitte kolonner, ikke en `jsonb` med bibliotekets traits

Lagret vi blobatars `TraitOverrides` rått, ville **klienten** bestemt hvilke egenskaper som kan
pinnes — `motion.*` og `gaze.*` inkludert — og vi ville lagret nøkler vi ikke vet hva betyr.
Serveren eier vokabularet: `avatar_shape`, `avatar_hue`, `avatar_tone`, alle nullbare.

### ⚠️ 2.5 Vi lagrer formNAVNET, ikke 0–1-tallet

Tallbåndene er frosset per major i blobatar, men et band kan flytte seg i neste major — og da ville
en lagret `0.95` stille blitt en annen form på alle ansikter. Et navn kan remappes; et tall kan
bare være feil. Vokabularet står tre steder (CHECK i basen, zod i modules, navn→band i ui), og
CHECK-en er tredjeparten som gjør drift til en hard feil i stedet for et ansikt som ble feil.

## 3. Knapperyddingen i innboksen

Du pekte på «se alle meldinger». Gjennomgangen fant fire ting:

| Fjernet/flyttet | Hvorfor |
|---|---|
| **«← Meldinger»** i trådhodet | `layout.tsx` holder samtalelista MONTERT på tvers av trådbytter. Lista står altså til venstre mens du leser. En knapp tilbake til noe du aldri forlot er ikke navigasjon — den er en påstand om at du er et annet sted enn du er |
| ⛔ **«Flere filtre»-trakten** | **Hadde ingen `onClick`.** Tooltip, `aria-label`, hover-tilstand — og den gjorde ingenting. Samme slag som den døde «Ny kunde»-knappen (F5-02) og `/innboks?ny=1` som ingen leste. En knapp som ikke virker lærer folk at knappene her ikke er til å stole på |
| **«Ny samtale»** flyttet | Lå KUN på `/innboks` — den ene skjermen der man ikke leser en tråd, altså ikke der man er når man vil starte en ny. Nå i sidebar-hodet, der lista står, tilgjengelig hele tiden. Netto null knapper: den tok trakten sin plass |
| **Én tomromsbeskjed, ikke to** | «Velg en samtale i lista til venstre» sto i ingressen, og «Ingen samtale valgt» 60 piksler under. Forklaringen som faktisk lærer bort noe — hva de tre partene ER — står igjen |

## 4. Hva gikk galt

### ⚠️ 4.1 `pnpm install` feilet gjentatte ganger med EBUSY

Noe på maskinen (Visual Studio-indeksering eller antivirus) holder mapper i `node_modules` mens
pnpm lager symlinker. Det etterlot avhengighetstreet inkonsistent en periode — `better-auth`,
`workflow` og `twilio` var uoppløselige og typecheck ga 15 falske feil. Løste seg etter gjentatte
`pnpm install`. **Hvis det skjer igjen: lukk IDE-en før install.**

### ⚠️ 4.2 Testene måtte lære Better-Auth-tabellene å kjenne

To ekte hindre, begge funnet ved å kjøre: `member.created_at` er `NOT NULL` **uten** default
(Better-Auth eier tabellen), og `member.organization_id` peker på `organization`, ikke på `tenants`
— ADR-002 sier `organization.id` ER tenant-IDen, men det er fortsatt to tabeller, og begge må
finnes.

### ⚠️ 4.3 Drizzle skjuler constraint-navnet

`toThrow(/constraint_navn/)` bestod ikke: Drizzle pakker databasefeilen i sin egen «Failed
query»-melding, og navnet ligger i `cause`. En regex mot `message` ville bestått på feil grunnlag
— eller feilet selv om regelen virket. Testene leser navnet der det faktisk står.

### 4.4 To miljøbegrensninger

- **context7 (CLAUDE.md §3) var ikke tilgjengelig.** For en helt ny pakke er det verre enn ved
  forrige oppgave. API-et er derfor lest fra pakkens egne `.d.ts`-filer og kildekode i
  `node_modules` — autoritativt, men ikke det regelen ber om.
- **Nettleserpanelet nekter å navigere** (viewport 0×0, «navigation denied»). Se §6.

## 5. Verifisert

⭐ **Båndkartet er testet mot biblioteket selv.** `FORM_BAND` er ti tall jeg leste ut av blobatars
vektede `BANDS`-liste og regnet midtpunktet av for hånd — den eneste delen av dette som kunne vært
**stille** feil: er ett tall på feil side av en grense, får brukeren en annen form enn knappen
viste, og ingenting kaster. `_layout()` rapporterer hvilken form biblioteket faktisk valgte, og
alle ti treffer, på tre ulike seeds. Testen er samtidig versjonsvakten: bumper noen til 3.x og
båndene flytter seg, blir det rødt før noen oppdager det i innboksen.

| Suite | Før | Etter |
|---|---|---|
| api | 76 | **87** (11 nye avatartester) |
| ui | 0 (ingen suite) | **14** (ny) |
| modules · db · auth · agents | 120 · 49 · 19 · 17 | uendret, alle grønne |

Avatartestene dekker: standard = alt fra seeden · lagring · at `null` tilbakestiller **én**
egenskap uten å røre de andre · ukjent form/farge/tone avvist av zod · rå INSERT avvist av CHECK
(begge constraints, ved navn) · at `setAvatar` ikke tar noen `userId` fra input (CWE-639) · at
`participants` gir seed + avatar for egen tenant · at nabo-tenanten får **verken navn, seed eller
ansikt**.

typecheck 22/22 ✓ · `next build` ✓ · biome rent på egne filer (de 3 repo-funnene er
pre-eksisterende) · migrasjon `0012_brief_shotgun.sql` kjørt + `db:grants` · roadmap 181 punkter,
181 unike, 0 ukjente ui-verdier.

**`@source`-fella er unngått:** alle fire Tailwind-klassene som kun finnes inne i `avatar.tsx`
(`inline-grid`, `place-items-center`, `rounded-control`, `bg-surface-2`) er verifisert til stede i
den bygde produksjons-CSS-en. Uten det ville avataren rendret ustylet, uten en eneste feilmelding
— nøyaktig gotchaen UI-PAKKER §1 advarer om.

## 6. ⚠️ Ikke verifisert

**Visuelt.** Nettleserpanelet i dette miljøet nekter å navigere til localhost (viewport 0×0,
«navigation denied») — samme begrensning som 05.08-rapporten og tidligere i dag. Rutene
`/innboks`, `/kunder` og `/innstillinger/profil` svarer 200 og dev-serverloggen har ingen
render-feil fra denne koden, men **jeg har ikke sett en avatar tegnet.**

Det som særlig bør ses etter med øyet: hvordan 20px-avataren leser i samtalelista (den minste
størrelsen, og den mest brukte), og om formknappene i profilen er til å skille fra hverandre på
22px. Kjør `pnpm dev` og åpne `/innboks` og `/innstillinger/profil`.

## 7. Neste steg

1. **Visuell gjennomgang** — det eneste som gjenstår før F6-19 er fullt verifisert.
2. **Flater jeg bevisst IKKE utvidet til:** `/mekanikere`-lista og `/min-dag/meg` viser de samme
   menneskene med ikon eller initialer. Du navnga innboks, tråd, Detaljer og kundekort, så jeg
   stoppet der — men konsistensargumentet gjelder de to også. Si fra, så tar jeg dem.
3. **Kunder uten innlogging** får alltid seeden sin avatar, siden de ikke har noe sted å lagre et
   valg. Det er riktig i dag. Skal en kunde med «Min side» kunne velge selv, er det en
   kundevendt flate og dermed utenfor det vi ble enige om nå.
