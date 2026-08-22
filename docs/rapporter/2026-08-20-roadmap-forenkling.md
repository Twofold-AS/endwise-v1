# Rapport — 20.08.2026 — Roadmapen forenklet

**Roadmap:** ingen statusendringer · 182 punkter før og etter
**Godkjenning:** Mikkis («fremdeles veldig rotete», «UI burde være simpelt»)

---

## 0. Hva jeg gjorde galt sist

Da roadmapen sist skulle bli lettere å lese, la jeg til **en akse til** (kategorier) og skrev om 27
punkter til FLATE/BYGGES/TRENGS. Altså mer struktur og mer tekst, da du ba om klarhet.

Kategoriene var riktige og står. Men FLATE/BYGGES/TRENGS gjorde punktene **lengre**, ikke
tydeligere — og jeg rørte ikke kontrollene i det hele tatt. Denne omgangen går motsatt vei.

## 1. Raden: før og etter

**Før** (F5-13, slik den faktisk ble rendret):

```
F5-13 │ SIDEBAR-FØRST SHELL (NY 03.08.2026, eierens redesign) — ÉN dominerende
      │ sidebar topp→bunn overtar for topbaren. Topbar reduseres til KUN
      │ breadcrumb (valgt nav-punkt); alle topbar-knapper fjernes. Toppseksjon:
      │ logo + forha… ⭐ BUNNEN OMBYGD 20.08.2026 (F6-19): brukeren flyttet fra
      │ kontekstbytteren i toppen til en EGEN RAD nederst … [6 linjer til]
      │                         [F5] [B · design] [● Bygget] [● Pågår]
```

**Etter:**

```
● F5-13  Bygg sidebar-først-shellet med kontekstbytte                        ›
```

Fra åtte elementer til tre: en farget prikk (status), IDen, og oppgaven. Hele raden er knappen som
åpner utdypingen.

## 2. Oppgavelinjene

Nytt felt `o` på **alle 182** punkter — én linje, formulert som en oppgave. Median 46 tegn, korteste
25, lengste 61.

| ID | Før (start av teksten) | Etter |
|---|---|---|
| F0-04 | «TO BRYTERE SOM OFTE FORVEKSLES: har forhandleren KJØPT noe, og har VI rullet det ut. ENTITLEMENTS = tenant_modules…» | Styr kjøpte moduler og feature-flagg fra databasen |
| F3-10 | «SAKSDETALJ (/saker/[id]) — hele saken på én flate, med ULIKT innhold… BYGGES: … TRENGS: …» | Lag saksdetalj med eget innhold for forhandler og mekaniker |
| F14-11 | «⚠️ KAN AVSLÅS — [JURIDISK] Mistral ZDR: søknad sendt OG INNVILGET. ZDR hos Mistral er ikke en bryter, det er…» | Søk om nulldata-lagring (ZDR) hos Mistral |
| F7-02 | «I dag-visning: jobbkort kronologisk + unread. FERDIG: dagens jobber i rekkefølge (mekaniker-scopet via RLS)…» | Lag «I dag» med dagens jobber i rekkefølge |

⛔ **Ingen tekst er slettet.** Den opprinnelige teksten ligger urørt i `t` og vises når raden åpnes.
Datoer, begrunnelser og ⚠️/⛔-notater hører hjemme der — de er nyttige når du først har funnet
punktet, og i veien når du leter etter det.

⚠️ Jeg skrev alle 182 for hånd. En automatisk avkorting av den eksisterende teksten ville gitt
«⭐ ABONNEMENT FASE 1 BYGGET 07.08.2026 — tre nivåer (START 4 490 · PRO…» som «oppgave», altså
nøyaktig problemet på nytt.

## 3. Kontrollene: 35 → 7

**Fjernet:** åtte KPI-kort · fremdriftsbar · sikkerhetsspor med én bar per fase · firedelt
fargeforklaring · 9 område-knapper · 3 spor-knapper · «Kun UI-gap» · «🔒 Kun sikkerhet» · 5
status-knapper · «Åpne alle» / «Lukk alle».

**Igjen:** søk · ett statusfilter (nedtrekk) · to grupperingsknapper · eksport · nullstill · lukk
alle utdypinger. **Sju.**

⛔ **Ingenting av det som ble fjernet var data.** Område, spor, UI-status og sikkerhetsmerke ligger
fortsatt på hvert punkt — de vises i utdypingen, sammen med fasen og tidsrommet. Det var
*visningen* som var for mye, ikke innholdet.

De åtte KPI-kortene er én linje nå:
`68 ferdig · 32 pågår · 77 ikke startet · 5 blokkert av 182`.

**Statusen kan fortsatt endres.** Knappen ligger i utdypingen i stedet for på raden, så
eksportflyten er uendret — men du treffer den ikke ved et uhell mens du skanner.

## 4. Ett valg jeg tok som du kan overprøve

**Jeg beholdt grupperingsbryteren** (kategori/fase), altså to av de sju kontrollene. Fasen sier
*når* og kategorien sier *hva*, og du har tidligere sagt at rekkefølgen betyr noe. Vil du ned til
fem kontroller, er fasevisningen den jeg ville kuttet — fasen står uansett i utdypingen på hver
rad.

## 5. Verifisert i ekte nettleser

Servert lokalt og kjørt, ikke bare påstått:

| | Resultat |
|---|---|
| Rader, kategorivisning | **182** (0 mangler) |
| Rader, fasevisning | **182** (0 mangler) |
| Kontroller i verktøylinja | **7** |
| Elementer per rad | **4** (prikk, ID, oppgave, pil) |

Filtrene testet: «ikke startet» → 77 · «ferdig» → 68 · søk «widget» → 25 · «F14» → 26 ·
«pseudonymiser» → 3. Det siste er verdt å merke seg: ordet finnes bare i den *fulle* teksten, ikke
i oppgavelinja — søket dekker begge, så ingenting ble utilgjengelig av at teksten flyttet.

Utdypingen for F5-13 leser: «Status Pågår · Fase F5 · Adminpanel basis (Uke 13–18) · UI Bygget ·
Område design», etterfulgt av hele den opprinnelige teksten.

Data: **182 punkter, 182 unike IDer**, 0 uten oppgavelinje, 0 uten kategori, 0 ukjente ui-verdier.
Status uendret: 68 / 32 / 77 / 5.

## 6. Neste steg

1. **Les gjennom oppgavelinjene.** Jeg skrev 182 ut fra hva punktene sier i dag; du vet hva de
   *skal* si. De som er feil er én linje å rette i `oppgaver`-feltet.
2. **Si fra om fasevisningen kan gå.** Det ville tatt kontrollene fra sju til fem.
3. Utdypingen viser fortsatt den gamle teksten slik den er — inkludert FLATE/BYGGES/TRENGS fra
   forrige omgang. Den er nå plassert riktig (bak et klikk), men kan gjerne strammes inn senere.
