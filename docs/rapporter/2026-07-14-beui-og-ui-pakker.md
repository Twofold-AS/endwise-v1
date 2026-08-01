# Arbeidsrapport — beUI inn, UI-pakkeminnet på plass

**Dato:** 14. juli 2026 (økt 5)

---

## 1. Hva er gjort

### beUI installert via shadcn-registry

Ikke gjettet — hentet fra shadcn sin egen registry-dokumentasjon (namespaced registries):

```json
// packages/ui/components.json
"registries": {
  "@beui": "https://beui.dev/r/{name}.json"
}
```

```bash
pnpm dlx shadcn add @beui/button-stateful --cwd packages/ui
```

**Hva vi fikk:**

| Fil | Hva |
|---|---|
| `src/components/motion/button/stateful.tsx` | `StatefulButton` — idle → loading → success/error, blur-swap og morphing bredde |
| `src/components/motion/button/base.tsx` | `MotionButton` — base m/ press-spring, hover-lift, valgfri ripple |
| `src/lib/ease.ts` | **Bevegelses-tokenene**: `SPRING_PRESS`, `SPRING_SWAP`, `SPRING_PANEL`, `EASE_OUT` … |
| `src/lib/hooks/use-hover-capable.ts` | Hover-deteksjon (touch-enheter fyrer fantom-`:hover`) |

CLI-en skrev om `@/`-importene til våre monorepo-aliaser (`@endwise/ui/lib/ease`) av seg selv —
registry-oppsettet er altså riktig konfigurert, ikke bare tilfeldigvis fungerende.

**`lib/ease.ts` er den skjulte gevinsten:** vi har nå kanoniske fjærer og easing-kurver.
Ingen skal finne opp egne animasjonsverdier.

**Verifisert på ekte:** ikke bare typecheck — jeg montert `StatefulButton` + `Sparkline` i en
faktisk Next-rute og kjørte `next build`. Ruten kompilerte og ble bundlet (`○ /probe`).
Probe-ruten er **fjernet igjen** — ingen UI er bygget.

### `docs/UI-PAKKER.md` — det levende minnet

Regelen står øverst, i klartekst: **sjekk fila før du bygger. Bruk pakke framfor egen kode.
Skriver du egen kode, noter hvorfor i §7.**

Fila dekker alle fem lag — tokens (`widget-tokens`), struktur (shadcn/ui), data (dither-kit),
tilstand (beUI), venting (matrix-loaders) — og for hver: hva den brukes til, hvordan den
installeres (shadcn-registry vs. egen CLI vs. vendorisert), versjon/commit-pin, lisens,
hvor i repoet den ligger, hva som er hentet inn, og **hva som kan hentes**.

Pluss to seksjoner som betyr noe i praksis:
- **§6** — pakker som står i techstacken men ikke er hentet ennå (`slot-text`, `ai-elements`,
  `cuelume`, Recharts). *Ikke skriv egne erstatninger for disse.*
- **§7 «Egenskrevet»** — i dag én rad: `Btn/Badge/Chip/Card/Input`, fordi roadmap F0-12 navngir
  dem eksplisitt. Med noten: **når prototypen er inne bør de revurderes** — dekker shadcn dem,
  skal de bort.

**`CLAUDE.md` har fått en ny regel §4** som binder meg til å lese `docs/UI-PAKKER.md` før jeg
lager UI, og å oppdatere den samme økt en ny pakke tas inn.

### MISSING-GITHUB-LINKS.md

**Åpne punkter: ingen.** Alle pakkene i techstacken har nå en kilde.

Det som fortsatt mangler er ikke en pakke: **prototypen**. Uten den er token-verdiene
plassholdere, og F0-11/F0-12 kan ikke lukkes.

---

## 2. Hva gikk galt

**Én sirkulær import.** beUI-CLI-en overskrev `src/lib/utils.ts` med den kanoniske `cn()`-
implementasjonen — men vår `src/lib/cn.ts` re-eksporterte fra `utils.ts`, som re-eksporterte
tilbake. `TS2303: Circular definition of import alias 'cn'`. Fanget av typecheck.

Ingenting annet gikk galt.

## 3. Fikser

`lib/utils.ts` eier nå `cn()` (shadcn-konvensjonen — det er dit registry-pakkene skriver).
`lib/cn.ts` er redusert til en ren re-eksport for bakoverkompatibilitet.

Biome er satt til å ikke linte tredjeparts-kildekode (`components/motion`, `lib/ease.ts`,
`components/dither-kit`, `vendor/`). Vi retter ikke andres kode — vi oppdaterer den.

**Verifisering:** typecheck (16 pakker) · biome · `next build` · **6/6 RLS-tester mot ekte DB** — alt grønt.

---

## 4. Roadmap

**Uendret.** F0-12 står fortsatt som `progress` — og det er riktig. UI-*pakkene* er komplette,
men punktets ordlyd er «primitiver fra komponentgalleriet», og galleriet ligger i prototypen.
Jeg setter den ikke til `done` på et halvt grunnlag.

---

## 5. Hva gjenstår

**Fra deg:**

1. **Recharts-spørsmålet** (UI-forslaget, spørsmål 1). Blokkerer chart-arbeidet.
2. **Prototypen inn i repoet** → F0-11/F0-12 kan lukkes.
3. **Lisens-avgjørelsen** på matrix-loaders.
4. Ja/nei på **F14 Desktop-app**.

**Uten deg kan jeg gå videre med:** F2 — Kjernedata, backend (F2-01 kjøretøyregister, F2-04
tjenestekatalog, F2-06 kunderegister, F2-08 Vegvesen-oppslag). Alle er RLS-tabeller på et
fundament som nå er bevist.

Ingen UI bygges før du har svart. Ingenting er pushet.
