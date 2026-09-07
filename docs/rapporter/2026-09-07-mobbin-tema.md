# Rapport — Mobbin-tema (07.09.2026)

## Hva er gjort (roadmap)

- **F0-11** — Mobbin-tokens i `@endwise/widget-tokens`: canvas `#ffffff`, ink `#141414`, canvas-soft `#f3f3f3`, field/hairline-soft `#f0f0f0`, hairline `#e0e0e0`, muted/faint `#707070`/`#adadad`. CTA = ink. `#0066ff` kun som `--ew-accent` (Popular/savings). Mørkt = ink↔canvas. Inter 650/450/300. Pille 9999 · kort 24 · felt 16. Geist og `--ew-accent-pip` fjernet.
- **F5-10** — shadcn/beUI-bro: `--primary` / fokus / switch = ink. Dual theme beholdt som polaritet. Skyggefri tint-stige.
- **F5-13** — dealer-sidebar: aktiv rad = `bg-sidebar-active` (canvas-soft), stadium-pille, **ingen** pip / `border-left`. Geometri 389/598/452 urørt. Endwise-destinasjoner urørt.
- **F5-35** — landing gallery-white: ink primær, outline sekundær, canvas-soft tertiær, ink-footer `rounded-t-[24px]`, Popular-badge på Pro. Endwise-copy (MC/båt/ATV).

## Hva gikk galt

Alt gikk som planlagt for tokens, pip-stripping og landing. Ingen ny stack-pakke. `#114`/`#119` urørt. Transaksjonell e-post er fortsatt Apple `#0066cc` (egen oppgave, ikke produkt-/markedschrome).

Live `/home`-chrome er auth-låst i dette miljøet. Lys/mørk verifiseres på offentlig `/` og via token-/kildetester.

## Fikser

- Jonas/Mikael-lås: fjernet Synara warm pip og mock-pip i `ProduktRamme`.
- Tester som låste Synara/Geist/Attio-hex er oppdatert.
- `#0066ff` ligger ikke på CTA, switch, fokus eller sidebar.

## Telefon-chrome (samme dag, samme PR)

Se `docs/rapporter/2026-09-07-mobbin-telefon-chrome.md`. To toppbarer, sidebar skjult på smalt, Mobbin-hjemkort 24px. Desktop urørt.

## Neste

- Jonas visual GO på draft-PR (ikke merge).
- Ekte produktskudd i `BILDE_SLOTS.kilde` når skjermbilder er klare.
- Eventuelt synke transaksjonell e-post til Mobbin-ink i egen oppgave.
