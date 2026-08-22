# Rapport — 20.08.2026 — Helpdesk med artikler, datadrevet slider, brukermeny og profil-rute

**Roadmap:** F5-23 → `progress` · F5-36 **NYTT, `blocked`** · F5-13 og F6-19 utvidet
**Godkjenning:** Mikkis (eksplisitt bestilling, fire punkter)

---

## 1. Oppdelingen, og hva som ikke ble bygget

Du ba meg dele opp fornuftig og si fra om noe burde tas i egen omgang. Det gjorde jeg ett sted:

**Bildeopplasting er ikke bygget.** Ikke fordi det er mye arbeid, men fordi det er **blokkert på en
beslutning som er din**. `packages/uploads` er fortsatt en tom plassholder med teksten
«Implementeres i F2. Vercel Blob via signerte URL-er», og repoet har *tre* ulike svar på hvor filer
skal ligge:

| Kilde | Sier |
|---|---|
| techstack §4 | Vercel Blob via signerte URL-er |
| F2-03 | R2-lagring |
| F13-03 | Vercel + Scaleway (Neon droppet) |

CLAUDE.md §2 sier «Trenger stacken en endring: stopp og spør». Jeg har stoppet, og lagt det inn som
**F5-36, `blocked`**, med hva som skal bygges når du har valgt. Merk at samme avklaring også låser
opp **F2-03 (modellbilder)** — det er én beslutning, to punkter.

Alt annet er bygget.

## 2. Helpdesk: artikkelbasen (F5-23)

To nye tabeller, begge **globale uten RLS**. Det er et valg, ikke en forglemmelse: en
hjelpeartikkel er Endwise sitt innhold og er nøyaktig lik for alle 250 verksteder. Ga vi den
`tenant_id`, måtte vi enten kopiert hver artikkel 250 ganger og holdt dem i synk, eller skrevet en
policy som slipper alle gjennom — altså RLS som ikke isolerer noe. Samme resonnement som skjemaet
allerede fører for `user_preferences`.

⛔ **Fordi RLS ikke beskytter dem, er ruta hele beskyttelsen:**

- skriving → `endwiseAdminProcedure` (kun `endwise_admin`)
- lesing → `protectedProcedure`, og aldri upubliserte
- lest-av → `ctx.userId` er eneste kilde

**Rollegaten er det viktigste her.** Skrivestien er bevisst `endwiseAdminProcedure` og **ikke**
`adminProcedure`: en `dealer_admin` er admin i sitt eget verksted, og `adminProcedure` ville
sluppet dem inn — til å skrive innhold som havner i 249 andres sidebar. Det er testet direkte.

**«Ulest» er fraværet av en lest-rad**, ikke et flagg som må vedlikeholdes. En ny artikkel er
dermed automatisk ulest for alle uten at publiseringen skriver 250 rader, og en slettet bruker
etterlater ingen tellefeil. Merkingen skjer når artikkelen **åpnes** — vi vet ikke om noen har lest
teksten, og å late som ville gitt en teller som lyver begge veier.

**6 basisartikler** i seeden, idempotent på slug, som forklarer det som faktisk finnes: innboksen,
tjenestekatalogen og versjonering, tofaktor, invitasjoner, lageret og «tilgjengelig», og avatarene.

## 3. Slideren i sidebaren (F5-13)

Problemet du beskrev var reelt og verre enn det så ut: den gamle var et fritt `flex flex-col` med
fire hardkodede tips av ulik lengde, som byttet hvert niende sekund. Siden kortet ligger **nederst**
i kolonnen, dyttet hver eneste tekstbytte navigasjonen over seg opp og ned. En slider som flytter
på navigasjonen er verre enn ingen slider.

Nå: høyden låst i **én konstant**, bildet med fast forhold, teksten klippet med `line-clamp`. Fire
artikler med helt ulik tittellengde gir nøyaktig samme boks. Plassen holdes av også mens det lastes
— å rendre `null` der ville gitt samme hopping, bare én gang i stedet for hvert niende sekund.

Utformingen er som bestilt: grønn «New» øverst, overskrift med linje under teksten, pil som sier at
den kan leses, bilde under. Innholdet er de **4 nyeste publiserte artiklene** — skriver du en ny,
dukker den opp uten at noen rører kode.

⚠️ «New» vises kun når artikkelen er ulest **for deg**. Ellers står «Fra helpdesken» — et merke
alle alltid ser, betyr ingenting.

## 4. Brukerraden og profil-ruta (F6-19)

Popupen åpner nå med samme `side`, `align` og `sideOffset` som Settings-flyouten rett over. To
menyer som ligger 40 piksler fra hverandre og spretter ut hver sin vei, leses som to ulike
mekanismer — og da må brukeren lære begge.

**Profilen fikk egen rute: `/profil`.** Du spurte om jeg mente den burde flyttes, og svaret er ja.
Den nås nå fra brukerraden, ikke fra Settings, og `/innstillinger/profil` var en URL som påsto at
siden er en underside av konfigurasjon. Gammel sti **redirecter** — et bokmerke skal ikke råtne av
en flytting vi selv valgte. «Min profil» er samtidig fjernet fra Endwise-Settings, siden
brukerraden finnes i alle kontekster.

## 5. Endwise-admin skriver artiklene

Ny flate på `/endwise/helpdesk`, i Endwise-konteksten sammen med dev-mode-bryteren — av samme grunn
som den: en publisert artikkel er en plattformhandling, ikke en verkstedhandling.

Overskriften er **ett felt** som brukes både i helpdesken og i slideren, slik du ba om. To felt
ville før eller siden drevet fra hverandre.

⚠️ Bildet **velges**, det lastes ikke opp — se §1. Serveren validerer mot allowlisten, så en URL til
en tredjepart ikke kan skrives inn i et tekstfelt (det ville vært en referrer-lekkasje og en
avhengighet til noen andres oppetid, innført ved et skjemafelt).

## 6. ⚠️ Designavvik jeg har dokumentert i stedet for å skjule

Du ba om **grønn** «New»-badge. UI-PAKKER §6 sier at New-badgen er **rød**. Jeg fulgte
bestillingen, men skrev avviket øverst i UI-PAKKER med begrunnelsen: uleste meldinger venter på at
du gjør noe, en ny artikkel gjør ikke det, og to tall i samme kolonne skal ikke se like presserende
ut. Grønnen er `--ew-success`, som §6 selv kaller «informasjon, ikke merkevare».

Sier du at nav-radene også skal bli grønne, er det en linje — men da bør §6 oppdateres, ikke
omgås.

## 7. Verifisert

| Suite | Før | Etter |
|---|---|---|
| api | 87 | **101** (14 nye) |
| ui · modules · db · auth | 14 · 120 · 49 · 19 | uendret, alle grønne |

Testene dekker: dealer_admin og dealer_staff avvist på opprett, oppdater og kladdeliste · bilde
utenfor allowlisten avvist · kladder usynlige også via direkte `bySlug` · `markerLest` gjelder kun
deg, ikke kollegaen i samme tenant · dobbel lesning teller ikke dobbelt · `markerLest` tar ingen
`userId` fra input · slug endres aldri ved oppdatering · to like titler gir ulik slug i stedet for
en krasj.

typecheck 22/22 ✓ · `next build` ✓ med `/support`, `/support/[slug]`, `/profil` og
`/endwise/helpdesk` i rutetabellen · biome rent på egne filer · migrasjon
`0013_third_the_watchers.sql` kjørt + `db:grants` · seed kjørt (6 artikler) · roadmap 182 punkter,
182 unike, 0 ukjente ui-verdier.

## 8. ⚠️ Ikke verifisert

**Visuelt.** Nettleserpanelet nekter fortsatt å navigere til localhost i dette miljøet. Det gjelder
særlig to ting her:

1. **At slideren faktisk har fast høyde i praksis** — det var hele bestillingen. Tallet (208px) er
   satt ut fra innholdet, men om bildet, to linjer overskrift og prikkeraden går opp nøyaktig, må
   ses. Blir det feil, er det én konstant å justere.
2. At de fire artikkelbildene ser greie ut beskåret til 16:9 og til slideren.

Kjør `pnpm dev`, logg inn som `mikkis@twofold.no` (endwise_admin) og se `/support`,
`/endwise/helpdesk` og sidebaren.

## 9. Neste steg

1. **Velg lagringssted for filer** — det låser opp F5-36 og F2-03 i samme slengen.
2. **Visuell gjennomgang**, særlig sliderhøyden.
3. **F5-11 (support-kanalen)** er den andre halvdelen av F5-23 og står fortsatt `planned`. Den har
   et åpent spørsmål i roadmapen som ikke er mitt å svare på: hvem på Endwise-siden mottar en
   eskalering?
