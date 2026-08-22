# Rapport — 20.08.2026 — To bugs, rød badge, accordion og humør på avataren

**Roadmap:** F6-19 og F5-13 utvidet · ingen statusendringer
**Godkjenning:** Mikkis (eksplisitt bestilling, fem punkter)

---

## 1. ⛔ BUG: mørkt tema overlevde ikke en refresh

**Rotårsaken var ikke at lagringen feilet — den fantes ikke.**

`app/layout.tsx` har `data-theme="light"` hardkodet på `<html>`. Begge tema-bryterne — shellets
`ThemeToggle` og profilsidas **egen kopi** — skrev bare `document.documentElement.dataset.theme`
ved klikk. Ingen av dem lagret noe. Bryteren virket helt til du navigerte, og da satte serveren
alle tilbake til lyst.

At logikken lå to steder er den andre halvdelen av feilen: to kopier av samme regel kan bare bli
enige ved et sammentreff.

**Fiksen har to deler, og den andre er den som ikke er åpenbar:**

1. `_lib/tema.ts` eier lagring og bytte. Én kopi, begge bryterne bruker den.
2. **Oppstart skjer i et inline-skript i `<head>`, ikke i en `useEffect`.** En React-effekt kjører
   etter første maling — temaet ville rukket å blinke hvitt før det ble mørkt igjen, på hver
   eneste navigasjon. Et blokkerende skript kjører før noe tegnes.

⭐ **Verifisert i ekte nettleser.** Etter full sidelast: `data-theme="dark"`, og
`getComputedStyle(body).backgroundColor` er `rgb(23, 23, 23)` — nøyaktig `#171717` fra §6.

## 2. ⛔ BUG: visningsnavn oppdaterte ikke sidebaren

**Rotårsak: navnet hadde to hjem.**

`profile.setName` skriver `user.name` i basen og invaliderer `profile.meg` og `session.me` — den
gjorde alt riktig. Men sidebaren leste `session?.user?.name` fra **Better-Auths** klientsesjon,
som er en helt annen cache, og som ingenting rørte. Navnet ble lagret; sidebaren så bare et annet
navn.

**Fiksen fjerner det ene hjemmet** i stedet for å legge til enda en oppfriskning som noen glemmer
neste gang noe skal endres. `session.me` returnerer nå `navn`, `useOrgRole` eksponerer det, og
sidebaren leser derfra. Invalideringen som allerede fantes gjør resten av jobben.

Låst i to tester: at `session.me` gir eget navn, og at `setName` slår gjennom umiddelbart — for
meg, og ikke for naboen.

## 3. «New» er rød igjen

Grønn-unntaket fra tidligere samme dag er reversert. **Noten i UI-PAKKER er omskrevet, ikke
slettet** — den sier nå at det ble prøvd og omgjort, og hvorfor, så neste person slipper å ta
runden på nytt.

Helpdesk sier nå **«New» + antall**. Innboks beholder tallet alene og aksentfargen, så de to
tellerne fortsatt kan skilles fra hverandre.

⛔ **Fem `isNew: true` er fjernet fra nav-radene.** Et merke som står på fem av elleve rader i
månedsvis slutter å bety «nytt» og begynner å bety «bakgrunn». Feltet står igjen i typen, med en
kommentar — mekanismen er riktig når noe faktisk ER nytt, men da skal den også tas av igjen.

Det eneste «New» i sidebaren nå er helpdesk-badgen, og den er datadrevet: den forsvinner av seg
selv når du har lest artiklene.

## 4. Accordion i sidebaren

Tilstanden **måtte** flyttes ut av `NavRow`. Hver rad hadde sin egen `open`, og en rad som bare
kjenner seg selv kan ikke vite at en annen skal lukkes — det var derfor Kunder og Saker sto åpne
samtidig.

⛔ **Animasjonen er `grid-template-rows: 0fr → 1fr`, ikke `max-height`.** En høydeanimasjon trenger
et tall å gå mot, og `height: auto` kan ikke animeres. Den vanlige omgåelsen er en gjettet
maks-høyde — men gjetter du for lavt klippes siste rad bort, og gjetter du for høyt henger
animasjonen i lufta fordi den bruker like lang tid på piksler som ikke finnes. `0fr → 1fr` lar
nettleseren regne ut den ekte høyden uansett hvor mange underpunkter raden har.

⚠️ Setteren sendes inn rå i stedet for pakket i en pil-funksjon per rad. `useState`-settere er
stabile mellom renders; en `(pa) => set(...)` ville fått ny identitet hver render, og da måtte
effekten som åpner aktiv rad enten utelate den fra avhengighetene (og bli undertrykt) eller kjøre
i loop. Nå er avhengighetslista ærlig og lint-advarselen borte fordi årsaken er borte.

## 5. Avataren i hjørnet animerer alltid

Du hadde rett i at kostnadsargumentet ikke gjelder her. `alltid` er dyr fordi inline SVG med ~et
dusin noder ganges opp i en liste — her er det én avatar, din egen, på samme sted uansett side.

Dette er nå den andre `alltid` i appen, ved siden av profil-forhåndsvisningen.

## 6. Profil-editoren: fire nedtrekk, og humør

Skjemaet viste 24 knapper samtidig (10 former + 8 farger + 6 toner). Med humør ville det blitt 34,
og siden hadde vært en fargeprøve å skanne i stedet for fire valg å ta.

Nå er hver egenskap **ett nedtrekk** som viser det valgte og åpner en liste ved klikk — ett åpent
om gangen, samme mekanikk som sidebaren. ⚠️ **Forhåndsvisningene er beholdt:** det var hele
poenget med rutenettene («Knott» sier ingenting, en knott gjør det). Det som er fjernet er
samtidigheten, ikke bildene.

Rekkefølge som bestilt: **form → farge → humør → tone**. Den følger hvor mye valget endrer
ansiktet — silhuetten er identiteten, fargen er det neste øyet ser, humøret er uttrykket, tonen er
finjusteringen.

### Humør: ti av fjorten

⚠️ **Du hadde rett i at innvendingen min ikke gjelder her.** Jeg frarådet uttrykk da de var noe
*systemet* skulle sette — da påstår maskinen et humør på vegne av et menneske. Dette er det
motsatte: ditt eget valg om ditt eget ansikt.

Men jeg utelot fire: `sad`, `mad`, `sick` og `scared`. Begrunnelsen er ikke den samme som før — et
humør du setter én gang og glemmer er noe annet enn et humør du føler, og et ansikt som ser sint
eller sykt ut ved siden av navnet ditt i kollegaens innboks *hver dag* sier noe du sannsynligvis
ikke mente å si. Si fra hvis du vil ha dem inn; det er én linje i tre filer.

### Animasjonen koblet til humøret

Uttrykk rendres **også statisk** i blobatar — så et valgt humør synes i lister uten at vi slår på
bevegelse der. Det er bare selve *overgangen* mellom to humør som krever animasjon.

Derfor: humør-radene i lista bruker `hover` (de andre listene er `stille`). Flere positurer
skiller seg lite på 24px i stillbilde; peker du på raden, morfer den, så du ser forskjellen før du
velger. Lista er ti rader og åpen om gangen — ikke to hundre.

## 7. Verifisert

| Suite | Før | Etter |
|---|---|---|
| api | 101 | **106** (humør-validering, CHECK-constraint, navn-propagering) |
| ui · modules · db · auth | 14 · 120 · 49 · 19 | uendret, alle grønne |

typecheck 22/22 ✓ · `next build` ✓ · biome rent på egne filer · migrasjon
`0014_nice_killraven.sql` kjørt.

⭐ **Tema-fiksen er verifisert i ekte nettleser** — første gang jeg har fått bekreftet en
app-endring visuelt i denne økta. Din `pnpm dev` kjørte allerede, så jeg testet mot den.

## 8. ⚠️ Ikke verifisert

**Accordion-animasjonen, nedtrekkene og humør-morfingen.** De krever innlogging, og 2FA-koden går
til serverloggen din som jeg ikke kan lese. Jeg har verifisert server-siden, typene og at bygget
går gjennom.

**Navne-bugen er verifisert server-side, ikke i sidebaren.** Testene beviser at `session.me` gir
riktig navn og at `setName` slår gjennom umiddelbart; at sidebaren leser det feltet er en
prop-endring som typechecker. Verdt et blikk når du logger inn.

Ting å se etter: at utfoldingen faktisk føles jevn (200 ms), at nedtrekkslista ikke dytter
«Lagre»-knappen ut av synsfeltet, og at humørene er til å skille fra hverandre på 24px.
