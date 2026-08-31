# bloub (vendorisert motor)

Kilde: https://github.com/jeremy-prt/bloub
Gren: `main`
Pinnet commit: `b4bb3c1b5f93c7b87a2e8d620f667c4093d97749` (17. august 2026)
Hentet: 31. august 2026

Kun den rammeverkfrie motoren er kopiert inn: `src/bot/*` (uten `*.test.ts`)
og `src/ui/gaze.ts` (lookTarget / TURN_TIME, uten Vue). Vue-appen, editor,
i18n, eksport, customise-UI, capture, anime, intro, stockage og video er
**ikke** vendorisert.

Ingen npm-avhengighet. React-wrapperen bor i `packages/ui/src/bloub/` og
er vår. Motorfilene her skal ikke redigeres — geometrien er målt.

## Lisens — LES DENNE

MIT (se `LICENSE`) dekker **koden i dette vendor-treet**, ikke x.ai-designet
den imiterer. Ikke tilknyttet x.ai. «Grok» og «x.ai» tilhører sine eiere.

## Filene

- `engine.ts` — `BotEngine.sample(t)` (ren funksjon av tid, ingen Date.now)
- `states.ts` — 14 SEQUENCE-tilstander + swirl (grensesnitt, ikke katalog)
- `expressions.ts` — 16 hvileuttrykk
- `skins.ts` — former (default `cercle`) og fargehjelpere
- `profiles.ts` · `shape.ts` · `face.ts` · `math.ts` · `cycles.ts`
- `decor.ts` · `eyefit.ts` · `repere.ts`
- `gaze.ts` — lookTarget / TURN_TIME (importer rettet `@/bot/…` → relativt)

## Oppdatering

Hent på nytt fra oppstrøms på samme pin (eller ny pin etter avtale) og bytt
ut mappa. **Ikke rediger målingene.** Ikke rund av konstanter.

## Bruk i Endwise

Intern gjennomgangsside `/bot`. Importeres via `packages/ui/src/bloub/BloubBot.tsx`,
ikke fra `@endwise/ui`-barrelen. ⛔ Erstatter ikke `Avatar` / blobatar.
