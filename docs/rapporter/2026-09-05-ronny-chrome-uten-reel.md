# Rapport — 05.09.2026 — Jonas hard-fix: chrome-Ronny uten tenke-/varsel-reel (F5-10 / F5-13)

**Roadmap:** F5-10 (`progress`), F5-13 (`done` — chrome-polering)

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| **F5-10** | `workshop-bloub.tsx` sheet-header + desktop-header bruker `<RonnyBot />` (ikke rå `BloubBot`). Tittel er rolig «Ronny»; `ronny-tenker-tekst` / shimmer er av. `sr-only` «Ronny tenker…» står. |
| **F5-10** | `RonnyBot`: `state="idle"` + `playing={false}` (Bloub `defaultCycle` er tenke-/varsel-reel). `data-ronny-spin` bare `'1'` under klikk-spinn. |
| **F5-10** | `globals.css`: `[data-ronny-spin="1"]` — ikke alltid-på `[data-ronny-spin]`. |

### Kallsteder endret

1. `apps/web/app/(app)/_workshop/workshop-bloub.tsx` — sheet + desktop-header
2. `apps/web/app/(app)/_workshop/ronny-bot.tsx` — wrapper (playing av, gated spin)
3. `apps/web/app/globals.css` — spin-selektor
4. Tester: `workshop-bloub.test.ts`, `dealer-chrome-sheet.test.ts`

Urørt (allerede `RonnyBot`): `phone-shell.tsx`, `ronny-avatar-knapp.tsx`. `/bot`-lab beholder rå BloubBot.

## 2. Hva gikk galt

Forrige lås satte `state='idle'` men lot `playing` stå. `playing` kjører `defaultCycle()` = SEQUENCE (`thinking`, `alert`, `notify`, …). Alltid-på `[data-ronny-spin]` + `.ronny-tenker-tekst` lyste også som «tenker/varsel».

## 3. Fikser

- Én chrome-wrapper. `playing={false}`. Tittel uten shimmer. Spinn kun ved klikk.

## 4. Grep (`_workshop` + `_shell`)

```
BloubBot     → kun ronny-bot.tsx (wrapper). workshop-bloub / _shell: 0
ronny-tenker → 0 i _workshop + _shell
data-ronny-spin → kun ronny-bot.tsx (`spin ? '1' : undefined`). CSS: `[data-ronny-spin="1"]`
thinking     → 0 i _workshop + _shell
```

`/bot` og `packages/ui` (lab + motor) er utenfor chrome.

## 5. Neste steg

F5-10 forblir `progress`. Ikke redesign forhandler-hjem.
