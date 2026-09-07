# Rapport — Synara dual theme (07.09.2026)

## Plan (kort)

1. Tokens → `packages/widget-tokens` + `packages/ui/src/theme.css`
2. Theme provider: klasse `.dark` på `html` + `data-theme`, toggle + system
3. Sidebar-chrome: Synara-listemønster, Endwise-destinasjoner
4. Marketing `/`: Synara-stil, Endwise-copy
5. Geometri 389/598/452 uendret

## Hva er gjort (roadmap)

- **F0-11** — Synara lys/mørk tokens, Geist, hårlinje `color-mix`
- **F5-10** — dual theme end-to-end (dealer + landing)
- **F5-13** — seksjonsetikett, pip, tekst venstre, stille ikoner
- **F5-35** — landing uten Action Blue, pille-CTA, produktramme, måne-toggle

## Hva gikk galt

Alt gikk som planlagt for tokens, sidebar-mønster og landing. Ingen Linear/Disarto-rest. Ingen ny stack-pakke.

Live `/home`-chrome er auth-låst i dette miljøet (ingen sesjon/DB). Lys/mørk ble verifisert på ekte `MarkedsSide` og på samme nav-data/rad-klasser som dealer-sidebaren.

## Fikser

- Tester som låste Attio/Apple-hex og lys-only er oppdatert.
- Mekaniker-nav: Timeplan gruppert under Jobb (samme destinasjoner).

## Neste

- Ekte produktskudd i `BILDE_SLOTS.kilde` når skjermbilder er klare.
- Eventuelt synke transaksjonell e-post (fortsatt Apple `#0066cc`) i egen oppgave.
