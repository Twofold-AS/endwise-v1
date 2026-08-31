# Morph Bot (vendorisert runtime)

Kilde: https://github.com/scrya-com/grokbot-animation
Gren: `main`
Pinnet commit: `031a583194be0e2cb9164b25dceb4674a57f35ec` (27. august 2026)
Hentet: 31. august 2026

Kun den selvstendige `component/`-runtime-en er kopiert inn (ikke lab-editoren,
Flutter-porten, ANALYSIS eller deres CSS-tema). Ingen npm-avhengighet — oppstrøms
har ikke `license`-felt, og pakken skal ikke inn i produktets avatar (`Avatar` /
blobatar er urørt).

## Filene

- `morph-bot.js` — Web Component `<morph-bot>`
- `grok-bot-engine.js` — motor
- `original-data.js` — tilstandsdata
- `catalog.js` — 39 tilstander, 18 former, 14 Morphs
- `materials.js` + `materials.d.ts`
- `runtime/*` — geometri, fysikk, SVG, Morph, partikler
- `morph-bot.d.ts` — oppstrøms typer

## Oppdatering

Hent på nytt fra oppstrøms og bytt ut mappa. **Ikke rediger filene her.**

## Bruk i Endwise

Intern gjennomgangsside `/bot`. Importeres kun derfra, ikke fra `@endwise/ui`-barrelen.

På `/bot` spleises **Endwise-blob** (`packages/ui/src/morph-bot/endwise-blob.js`)
inn før motoren starter: form `endwise`, seks øye-sett, ingen Grok-EXPRESSION-
pooler og ingen 18-formsvelger. Blink er motorens Y-skala. Morph-oneshots beholdes.
