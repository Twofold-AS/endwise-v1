# Rapport — 05.09.2026 — Svart logo på offentlig landing (F5-35)

**Roadmap:** F5-35 (`done`)  
**Godkjenning:** Mikael-lås etter #133 — logo på endwise.no `/` skal være svart/ink, ikke `#1ED27D`.

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-35** | Offentlig merke (`Merke` i `_markeds/markeds-chrome.tsx`) bruker `bg-fg` (ink `#1d1d1f`) på masken, ikke `bg-[#1ED27D]`. Wordmark var allerede `text-fg`. |

- CTA forblir Action Blue `#0066cc` (`bg-primary`).
- Ingen Book demo.
- `logo.svg` og dealer-chrome (`PhoneShell`, `SidebarHeader`) røres ikke — de bruker `<img src="/logo/logo.svg">` uten markeds-masken.
- Fasit, UI-PAKKER og roadmap F5-35 oppdatert: logo på landing er ink, ikke grønn.

## 2. Hva gikk galt

Alt gikk som planlagt. Grønnfargen satt ikke i `logo.svg` (pathene har ingen fill), men i markeds-chromet som maske + `bg-[#1ED27D]`.

## 3. Fikser

- Testen `offentlig merke er ink/svart, ikke logogrønn` krever `bg-fg` og forbyr `#1ED27D` i `_markeds/` (uten kommentarer).
- Eksisterende «ingen forbudt merkevare»-test forbyr nå `#1ED27D` helt på markedssiden, ikke bare ved CTA.

## 4. Neste steg

- Preview: `pnpm --filter @endwise/web dev` → `http://localhost:3000/` — merke i nav og footer skal være `#1d1d1f`, CTA `#0066cc`.
- Draft PR, ikke merge.
