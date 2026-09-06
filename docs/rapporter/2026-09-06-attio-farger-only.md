# Rapport — 06.09.2026 — Attio-farger only på eksisterende chrome (F0-11 / F5-10)

**Roadmap:** F0-11 (`done` — hex oppdatert), F5-10 (`progress`), F5-13 (`done` — struktur urørt)  
**Godkjenning:** Mikael-lås 06.09.2026 — dropp Attio-layout-preview; behold Attio-farger. Jonas Design token-fasit samme dag (sidebar-wash `#f8f8f8`, aktiv-wash `#eaf1ff`, landing Apple).

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| **F0-11** | Lyst tema remapmet i `packages/widget-tokens/src/tokens.css`. `--primary` peker på ink (`--ew-ink-utility`), `--ring` på Focus Blue (`--ew-focus`). |
| **F5-10** | shadcn/beUI-knapper: primær = ink-fyll, sekundær/outline = hvit + slate-kant, lenke = Action Blue. Prompt-submit og Oppgrader-pille følger ink-CTA. |
| **F5-13** | Ingen IA/layout-endring. #135/#137 chrome og hjem-rutenett står. |

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen DB/migrasjon. #138 ble ikke gjenåpnet.

## 3. Fikser

- `--ew-bg` / `--ew-surface-2` `#f5f5f7` → ash `#f3f4f6`
- `--ew-sidebar` `#ffffff` → wash `#f8f8f8`
- `--ew-sidebar-active` / `--ew-accent-soft` → aktiv-wash `#eaf1ff`
- `--ew-fg` / `--ew-ink-utility` `#1d1d1f` → ink `#1c1d1f`
- `--ew-fg-muted` `#7a7a7a` → Overcast `#8f99a8`
- `--ew-border` / `--ew-border-strong` `#e0e0e0` → stone/slate `#e4e7ec` / `#d3d8df`
- `--ew-accent` `#0066cc` → Action Blue `#407ff2` (lenker/aktiv)
- `--ew-focus` ny `#94b9ff` (ring)
- `--ew-radius-control` 8px → 10px
- Landing-CTA scoped til Apple `#0066cc` (ikke dealer-ink)
- Ronny-kropp `#1d1d1f` / `#111111` og logogrønn `#1ED27D` urørt
- E-post-maler og widget-fallback urørt (ikke dealer-chrome)

## 4. Neste steg

Mikael går dealer-UI selv. Ingen Attio-layout-PR. F5-10 forblir `progress` (AI Elements / slot-text osv. står).
