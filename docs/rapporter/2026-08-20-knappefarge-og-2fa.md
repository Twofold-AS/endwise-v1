# Rapport — 20.08.2026 — Grå tekst på svarte knapper · dobbeltekst ved 2FA

**Roadmap:** ingen statusendringer
**Godkjenning:** Mikkis (eksplisitt feilmelding)

---

## 1. ⛔ Grå tekst på svarte knapper

Du hadde rett i at dette luktet på noe felles. Det var det — men ikke der jeg først lette.

### Det var IKKE tokenet

Kjeden var riktig hele veien:

```
--ew-accent: #111111  →  --primary  →  bg-primary
--ew-accent-fg: #ffffff  →  --primary-foreground  →  text-primary-foreground
```

Og begge knappekomponentene setter riktig par: beUI har
`bg-primary text-primary-foreground`, shadcn det samme.

### Rotårsaken: `cn()` kastet fargeklassen

Jeg målte den faktiske knappen i nettleseren, og klassen som havnet på den var:

```
bg-primary hover:bg-primary/90 h-control px-3.5 text-label gap-2 rounded-control w-full
```

`text-primary-foreground` er **borte**.

Vi har tre egne font-størrelser i `theme.css` — `text-title`, `text-label`, `text-body` (dine
designprinsipper, §6). Stock tailwind-merge kjenner dem ikke, og antar derfor at `text-label`
konflikter med `text-primary-foreground` fordi begge starter med `text-`. Den beholder den siste
og kaster den første.

**Rekkefølgen avgjorde hvilken halvdel som forsvant:**

| Komponent | Rekkefølge i koden | Hva som røk | Hvordan det så ut |
|---|---|---|---|
| beUI `Button` — Logg inn, Lagre, Send, Opprett | variant → size | **fargen** | teksten arvet `--ew-fg`: grå på svart (lyst), lysegrå på hvitt (mørkt) |
| shadcn `Button` | base → variant | **størrelsen** | riktig farge, feil skriftstørrelse — mindre synlig, like galt |

Det er dette som gjorde at det så ut som «flere knapper rundt om» i stedet for som én ødelagt
knapp: **alt** som går gjennom `cn()` var rammet. Én linje kode, hele appen.

### Fiksen

`extendTailwindMerge` registrerer de tre som ekte font-størrelser. Da konflikter `text-label` kun
med andre font-størrelser, og fargen står i fred. Én endring i `cn()` — ingen overstyring per
knapp, som du ba om.

⚠️ **Prisen:** legger noen til en ny `--text-*` i `theme.css` uten å registrere den i `cn()`,
kommer nøyaktig samme feil tilbake, like stille. Det står som en advarsel i fila, og er fanget av
testene under.

### Kontrast, målt i begge temaer

⭐ **Mørkt tema, målt end-to-end i nettleseren:**

| | Tekst | Bakgrunn | Kontrast |
|---|---|---|---|
| Før | `#ededed` | `#ffffff` | **~1,1:1** — praktisk talt usynlig |
| Etter | `#111111` | `#ffffff` | **18,9:1** |

⚠️ **Lyst tema er utledet, ikke målt end-to-end.** Jeg leste token-verdiene live i samme nettleser
(`--primary: #111`, `--ew-accent-fg: #fff`) og bekreftet at de flipper korrekt med `data-theme` —
men selve knappens bakgrunn ville ikke oppdatere seg ved temabytte i dette panelet, som ikke
komposierer. Utledningen er hvit på svart, samme 18,9:1. Verdt et blikk når du er i lyst tema.

Begge ligger langt over WCAG AAA (7:1).

### Låst i test

`packages/ui/test/cn-merge.test.ts` — fem tester som dekker begge rekkefølgene, alle tre
størrelsene, og **to som sjekker at konfliktdeteksjonen fortsatt virker**. Den siste er den
viktigste: fiksen måtte ikke bli «slå av konflikter for `text-*`», som ville løst symptomet og
ødelagt det tailwind-merge er til for.

## 2. Dobbel tekst ved 2FA

Steg 2 sa det samme to ganger:

- **Overskriften:** «Vi sendte en 6-sifret kode til {e-post}. Den varer i noen minutter.» (14 px)
- **Under knappen:** «Engangskode sendt til {e-post}.» (12 px)

Du ba om at den minste går, og det er den under knappen.

⚠️ **Men den kunne ikke bare slettes.** Samme element brukes som kvittering for «Send ny kode» — å
fjerne det ville tatt bort den eneste tilbakemeldingen på at gjensendingen faktisk skjedde.

Løsningen er å ikke **sette** notisen ved første sending (overskriften dekker det), og beholde den
for gjensending, der den sier noe nytt: «Ny engangskode sendt.» Elementet står, men vises bare når
det har noe å melde.

## 3. Verifisert

typecheck 22/22 ✓ · `next build` ✓ · biome rent på egne filer.

| Suite | Før | Etter |
|---|---|---|
| ui | 14 | **19** (fem nye for `cn()`) |
| api · modules · db · auth | 106 · 120 · 49 · 19 | uendret, alle grønne |

Knappen på `/signin` er inspisert i ekte nettleser etter fiksen: den beholder nå **både**
`text-primary-foreground` og `text-label`.

## 4. ⚠️ Ikke verifisert

**Selve 2FA-skjermen.** Jeg kommer ikke forbi steg 1 uten gyldig passord, og engangskoden går til
serverloggen din. Endringen er ett fjernet `setNotice`-kall, og jeg har bekreftet i koden at
overskriften står urørt og at det eneste gjenværende notis-kallet med tekst er «Ny engangskode
sendt.» ved gjensending.

**Knappene i innstillingene.** Fiksen er i `cn()` og gjelder alle, men jeg har bare målt
«Logg inn». De andre bruker samme komponent, så de retter seg med den — men det er verdt et blikk
neste gang du er innom Settings.

⚠️ Sjekklist-skillen for designgjennomgang var ikke tilgjengelig i denne omgangen, som du sa.
