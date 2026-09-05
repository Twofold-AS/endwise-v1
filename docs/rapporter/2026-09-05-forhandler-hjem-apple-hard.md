# Forhandler-hjem — hardere Apple (05.09.2026)

## Hva
Jonas DESIGN hard-fasit på dealer `/dashboard` hovedinnhold. #135 chrome er merget. #136 var for mild og supersedes.

## Scope
- IN: `phone-home*`, `phone-kort`, `dashboard/page.tsx` (kort-hub), `seksjon-faner` (ingen piller på hjem).
- OUT: PhoneShell, sidebar, Ronny, bevel, markedsside `/`, mekaniker-hjem.

## Uttrykk
- Parchment `#f5f5f7` (`bg-bg`) som scroll-flate, `overscroll-y-contain`.
- Hero-plate radius 16, tittel 28px, I dag/Pågår/Fullført som 28px-tall.
- Destinasjonskort radius 14, 17px tittel, 12px muted meta, Action Blue-chevron.
- Gap 16–20. Hit ≥44. `touch-action: manipulation`.
- Ingen `#111`, Galaxy, Grainient. Ingen dobbel topp-safe.

## IA
Hero → Timeplan|Rapporter → Innboks|Jobber → Kunder|Organisasjon → Hjelp (hopp Samarbeid) → Lager (+Butikk).
`HJEM_KORT_TOM` uendret fra #136.

## Verifisering
- 91 tester grønne (inkl. chrome-filer identiske med `origin/main`).
- Biome rent på PR-filene. CI «Lint · Typecheck · Test» er rød på pre-eksisterende Biome på `main` (ikke denne PR).
- Preview: https://endwise-v1-web-git-cursor-forhandler-hje-8f19bf-endwise-twofold.vercel.app
- `/dashboard` uten sesjon → `/signin` (magic link). Innlogget desktop-flate: parchment, hero-plate I dag/Pågår/Fullført, 2-og-2, I dag/Mer-etiketter.
- #136 lukket som superseded.
