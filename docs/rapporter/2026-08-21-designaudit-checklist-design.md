# Rapport — 21.08.2026 — Designaudit mot Checklist Design → 45 nye roadmap-punkter

**Roadmap:** 45 NYE punkter (F1-15…F1-25 · F4-16…F4-22 · F5-37…F5-55 · F6-20…F6-25 · F7-08, F7-09)
**Godkjenning:** Mikkis (eksplisitt bestilling)
**Kode endret:** ingen. Kun `docs/endwise-roadmap.html` og `docs/roadmap-endringer.md`.

---

## 1. Hva er gjort

### 1.1 Valg av sjekklister — 17 av 125

Skillen ligger på `C:\Users\mikae\.claude\skills\checklist-design` (v3.2.1, 125 sjekklister
bundlet, ingen nettverkstilgang brukt). `references/index.md` er lest, og sjekklistene er valgt
mot de flatene som faktisk finnes i repoet:

| Flate i Endwise | Sjekkliste |
|---|---|
| `/signin` | Login (Web app) |
| `/2fa-oppsett` | 2FA (Web app) |
| `/kunder`, `/kjoretoy` | Data Table · Filtering items · Empty State |
| `/kunder/[id]`, `/kjoretoy/[id]` | Single Item Detail |
| `/innboks`, `/innboks/[id]` | Chat (Web app) |
| `/innstillinger/*` | Settings · Account · Saving changes |
| `/innstillinger/team` | User Management |
| `/support`, `/support/[slug]` | Help Center |
| `/dashboard` | Admin Panel · Notifications |
| `/min-dag` (PWA) | Dashboard (Mobile app) |
| Bookingwidgeten | Multi-step form · Showing input error |

Bevisst ikke brukt: Analytics, Billing, Checkout, Kanban, API Keys, Integrations,
Audit Log, alle Website-sjekklistene og resten av Mobile app — de treffer ikke flater
som finnes, eller flater denne økten skulle dekke.

### 1.2 De 45 punktene

| Fase | Antall | Kategori | Hva |
|---|---|---|---|
| F1 | 11 | `sikkerhet` | Passordlivsløp og 2FA-administrasjon |
| F4 | 7 | `kunde/widget` | Bookingwidgeten som flerstegsskjema |
| F5 | 19 | `dashboard/forhandler` | Lister, detaljkort, brukerstyring, varselvalg, helpdesk |
| F6 | 6 | `ai` | Innboksen mot Chat-sjekklista |
| F7 | 2 | `dashboard/mekaniker` | Mekaniker-PWA |

Alle er formulert som **én oppgave man kan bli ferdig med**, med kort oppgavelinje (`o`) og
full begrunnelse bak klikk (`t`). Median oppgavelinje: 45 tegn (var 46 før).

## 2. ⛔ Tre funn som er ekte feil, ikke bare mangler

### 2.1 Det finnes ingen «Glemt passord» — men UI-et peker på den

`forgetPassword` og `resetPassword` er innebygd i Better-Auth og har **null kallsteder** i
repoet. `/signin` har ingen lenke. `/innstillinger/profil` sier «Endring er ikke bygget ennå».
Og `/min-dag/meg` sier til mekanikeren at passord «Endres ved å logge ut og velge
«Glemt passord»» — en instruks om å bruke en kontroll som ikke eksisterer.

Kombinert med at 2FA-en er e-postbasert og **uten gjenopprettingskoder**, betyr det at en
låst konto i dag bare kan åpnes ved å skrive i databasen. → F1-15, F1-16, F1-17, F1-21.

### 2.2 Profilsida påstår at 2FA ikke håndheves

`/innstillinger/profil` har et varselkort: «Tofaktor (F1-11) — påslag mangler …
`ROLES_REQUIRING_2FA` håndheves ikke server-side». Håndhevingen landet **12.08.2026** —
`/2fa-oppsett` sin egen filkommentar beskriver den i detalj. Kortet er altså ni dager
utdatert og forteller brukeren at kontoen er mindre sikret enn den er. → F1-19.

### 2.3 Widgeten kan booke feil tjeneste

I `packages/widget-ui/src/EndwiseWidget.tsx` nullstilles `chosen` (valgt starttid) **kun**
inne i `loadSlots()`, som bare kjører på knappetrykk. Rekkefølgen:

```
velg tjeneste A → «Vis ledige tider» → velg kl. 10:00 → bytt nedtrekk til tjeneste B → Send
```

sender `serviceVersionId` for **B** sammen med et slot som ble regnet ut for **A**.
Fiksen er tre linjer i `onChange`. → F4-20 (som også ber om at serveren avviser en start
som ikke finnes i tilgjengeligheten — klienten skal ikke være eneste vakt).

## 3. Hva auditen fant som IKKE ble til nye punkter

Fire ting traff noe roadmapen allerede eier. Ingen nye punkter — kun kryssreferanser i
teksten til de nye:

- **Varselsenter** (klokke med dropdown, uleste, «merk alle som lest») → **F5-08**, finnes.
- **Aktivitetslogg / audit-visning** → **F5-05**, finnes.
- **Tomme tilstander, feilmeldinger, lasteskjeletter** → **F5-06**, finnes. Kun den ene
  konkrete manglende handlingen ble skilt ut (F5-55: «Ny kunde»-knapp i tom liste).
- **Bildeopplast** → **F5-36** eier Vercel Blob for hjelpeartikler. F6-21 (vedlegg i
  meldinger) peker dit i stedet for å velge lagring på nytt.

Sjekklistepunkter som er **dekket i dag** og derfor ikke ga noe: kunde- og kjøretøylistene
skiller allerede «Ingen treff» fra «Ingen kunder ennå» (Zero state vs. no-results),
tjenestekatalogen har versjonering, historikk, deaktivering og reaktivering, invitasjoner
har liste og tilbakekall, og dashbordet kjører på ekte data med tom-, laste- og feiltilstand.

## 4. Hva gikk galt

Ingenting i utførelsen. Tre miljøbegrensninger er verdt å notere:

### ⚠️ 4.1 Nettleseren svarer på DOM, men kan ikke ta skjermbilder

Nytt siden 20.08: `preview_start` mot `http://localhost:3000` gir nå **`navOk: true`**, og
`get_page_text` og `read_page` returnerer ekte innhold. Det er lenger enn tidligere økter kom.
Men `computer{action:"screenshot"}` feiler fortsatt: *«the Browser pane is not displayed, so
the page is not compositing frames»*. Jeg kan altså lese struktur og tekst, men **ikke se**.

### ⚠️ 4.2 Flatene bak innlogging er ikke besøkt

Skillen er eksplisitt på at en review er lesing: ikke logg inn, ikke send skjemaer, ikke klikk
gjennom. Jeg logget derfor ikke inn — det ville uansett krevd 2FA-koden fra serverloggen.
Alt bak `/signin` er auditert mot **kildekoden**.

### ⚠️ 4.3 context7 (CLAUDE.md §3) ikke brukt

Ingen ny teknologi er tatt i bruk denne økten — auditen leser eksisterende kode og skriver
markup i en fil som allerede finnes. Better-Auth-API-ene som nevnes i F1-punktene
(`forgetPassword`, `changePassword`, `backupCodes`) er **forslag i punkttekst**, ikke kode,
og må verifiseres mot ferske docs når punktene bygges.

## 5. Verifisert

| | Før | Etter |
|---|---|---|
| Punkter | 182 | **227** |
| Unike IDer | 182 | **227** |
| Duplikater | 0 | **0** |
| Ukjente `ui`-verdier | 0 | **0** |
| Ukjente `status`-verdier | 0 | **0** |
| Ukjente `kat`-verdier | 0 | **0** |
| Punkter uten `o` | 0 | **0** |
| `o`-lengde (min/median/maks) | 25 / 46 / 61 | **25 / 45 / 61** |

⭐ **Ingen gammel ID er mistet** — kontrollert ved å parse `const ROADMAP` både før og etter
i samme kjøring og differere ID-mengdene, ikke ved å telle linjer. Script-blokken (268 794
tegn) parser rent med `new Function()`.

## 6. ⚠️ Ikke vurdert

Alt som handler om **utseende**: kontrast, hierarki, typografi, spacing, om avataren leser på
20px, om knapper er lette å finne, om mørkt tema holder. Sjekklistene har flere punkter i den
kategorien, og de er ærlig utelatt framfor gjettet på.

**Ingen av de 45 punktene bygger på en påstand om hvordan noe ser ut.** Hvert eneste er
forankret i noe som står i koden: en manglende rute, en `useState` som ikke lagrer, en
`div` der det skulle stått en `label`, en `useEffect` med feil avhengighetsliste.
F7-09 er ført opp nettopp som en **verifiseringsoppgave** — «gå gjennom trykkmål og
tommelsone på ekte telefon» — i stedet for som et konstatert avvik.

## 7. Neste steg

1. **F1-15 + F1-16 (glemt passord)** er den tyngste enkeltmangelen auditen fant, og den
   eneste som kan låse en ekte bruker ute av et ekte verksted.
2. **F4-20** er tre linjer og bør tas før widgeten møter en kunde.
3. **F1-19** er ren tekstretting og kan tas i samme omgang som hva som helst.
4. **Visuell gjennomgang gjenstår fortsatt** — den har stått som «neste steg» i tre rapporter
   nå. Kjør `pnpm dev` og se på `/innboks`, `/innstillinger/profil` og mekanikerflaten selv;
   det er den ene delen ingen økt i dette miljøet har klart å levere.
