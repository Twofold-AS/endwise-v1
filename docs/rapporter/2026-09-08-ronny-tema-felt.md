# Rapport — Ronny-tema + standardfelt + profilmeny

## Hva er gjort
- **F5-13:** Ronny-chrome inverteres med delt `.ink-invert` (samme polaritet som profil `bg-fg text-bg`). Lyst = ink `#141414`, mørkt = hvit/lys.
- **F5-13:** Ronny-sheet og desktop-panel bruker `bg-surface text-fg` — ikke tvunget `#fff` / `#1d1d1f`. Ikoner og tittel arver `text-fg`.
- **F5-13:** Profilmeny-skiller er `.ew-haarlinje` (`--ew-fg-faint` #adadad/#707070) — synlig mot surface. Vilkår 17/700.
- **F5-10:** Standardfelt `.ew-felt` i `packages/ui/src/theme.css` (`--ew-inset` `#f0f0f0` / `#262626`, `rounded-sm` 16, 2px hvit fokus). `FELT_LG` innlogging, `FELT_MD` skjema/settings, `FELT_SM` chrome-søk og prompt.

## Hva gikk galt
- Tidligere `paper="var(--ew-bg)"` på Ronny ga mørke øyne + mørk kropp i mørkt tema (mixHex krever hex). Løst med fast lyst papir + `.ink-invert`.
- Prompt-kortet var eget hvitt kort utenpå feltet. Fjernet; selve `PromptInput` er feltet.
- `h-px bg-border` og `--ew-border-strong` (#3d3d3d) forsvant mot surface `#262626`. Hårlinje peker nå på `--ew-fg-faint`.

## Fikser
- Delt CSS i `theme.css` (`.ink-invert`, `.ew-felt`, `.ew-haarlinje`) i stedet for én-off-hex.
- Form/settings-felter som brukte pille+`bg-bg` peker på `FELT_MD`.
- Tester låser invert, surface-sheet, `.ew-felt` og synlig hårlinje.

## Neste
- Eier visual GO på draft-PR (lys+mørk: Ronny-chrome, sheet, prompt/felt, profilmeny). Ikke merge.
