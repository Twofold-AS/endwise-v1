# Rapport — Mikael desktop-chrome (01.09.2026)

## Hva er gjort

- **F5-13:** Hvit sidebar, større logo + forhandlernavn på én rad, ingen header-divider, nav-gap +2px. Samarbeid, Bot og Hjelp-dest ute. Tjenester (`/prisliste`) deretter Organisasjon under Kunder. Ingen avatar i sidebar (kollapset = kun logg ut). Hjelp er TipCard. Breadcrumb-topbar borte. Workshop-bloub i ShaderGradient-stripe øverst i innholdskolonnen.
- **F5-10 / F5-01:** Lys-only. ThemeToggle og mørkt-brytere fjernet. `--ew-sidebar: #ffffff`.
- **F5-23:** TipCard / helpdesk-slider tilbake nederst i sidebaren. Artikler fra `seed-helpdesk.ts`.
- **F6-29:** `/bot` lever som URL, ikke i nav. Produkt-avatar viser bloub-ansikt (ikke grønn skive).
- **Annet:** Grainient slettet. ShaderGradient (`@shadergradient/react` 2.4.20) dokumentert i UI-PAKKER og techstack.

## Hva gikk galt

- `pnpm add`/`remove` feiler på leftover `prepare` (lefthook vs custom hooksPath). Pakker lagt inn i `package.json`; install kjøres med `--ignore-scripts`.
- Innlogget nettleser-preview mot Vercel kan ikke verifiseres her uten sesjon.

## Fikser

- `still`-sti: `setLook(..., 0)` ga NaN i `lookAtTime` og hoppet over øynene. Morph > 0 + `sample(0.35)` + papir-øyne oppå masken. Avatar uten `overflow-hidden`.

## Neste steg

- Preview etter innlogging. Ikke merge. Ikke ping Jonas.
