# Øktrapport — F5-56 kastbar HIG-preview på hjem

**01.09.2026 · Ikke merge**

## Hva er gjort (F5-56)

Kastbar forhåndsvisning av Apple HIG-*prinsipper* (ikke Apple-varemerke) kun på innlogget hjem:

- Forhandler: `/dashboard` og `/verkstedet` (ikke `?visning=dag`)
- Mekaniker: `/min-dag`

Rolle-tokens (label, secondary/tertiary, canvas, grouped, fill, separator, accent) i lyst og mørkt, scoped til `[data-hjem-hig]`. Inter beholdt. Kort er innfelte grupper på full-bleed lerret. 44pt-gulv på telefon. Én primærhandling («Se alle jobber»). Desktop viser samme kort-destinasjoner; sidebar urørt.

## Hva gikk galt

Ingenting blokkerende. Context7 MCP var utilgjengelig (trenger auth); Tailwind 4-mønsteret er det samme som i `theme.css`.

## Fikser

- Isolasjon via `data-hjem-hig` på hjem-flaten + telefon-chrome når `erHjemHigFlate` — ikke på layout-rot, sidebar eller workshop-FAB.
- Globale `--ew-bg` `#000` / `#fff` urørt (widget-tokens-tester består).
- `VerkstedetDesktop` beholdt i `dashboard/page.tsx` for rollback.

## Neste

Mikael åpner draft-PR-preview. Liker han den ikke: slett PR. Ikke merge.
