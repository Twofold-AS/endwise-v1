# Forhandler-hjem — hardere Apple (etter #135/#136)

#135 merget (chrome). #136 = mild kort-pass. **This PR:** hardere Apple on **main content / card surface only**.

## Scope lock
- IN: dealer destination cards (`phone-home*` + dashboard content column).
- OUT: top-bar, sidebar, Ronny sheet/overlay, bevel, marketing `/`.
- Skill apple-web-app: layout/safe-area/touch on **content scroll** only — not new chrome.

## Harder than #136
1. Scroll-root: one clear column under fixed top-bar; overscroll-none / no rubber-band revealing wrong bg; parchment `#f5f5f7` behind cards.
2. Air: larger vertical rhythm (gap 16–20); hero more “plate”; clearer hierarchy.
3. Hero: keep I dag/Pågår/Fullført; Apple typography/spacing (meta 12 muted, tall title); no `#111` fill.
4. Cards: **overstyrt 05.09 kveld (system-refresh):** radius 8 hero + grid, padding 24, Frost/white, hairline. Tidligere 16/14. Optional grouped sections (“I dag” / “Mer”).
5. Touch: whole card ≥44; `touch-action: manipulation` on card links; no user-scalable=no.
6. Safe-area: content padding under existing chrome only (no double top-safe).
7. Empty states: same HJEM_KORT_TOM as #136 — no regress.

## Grid (unchanged IA)
Hero → Timeplan|Rapporter → Innboks|Jobber → Kunder|Organisasjon → Samarbeid|Hjelp → Lager (+Butikk).

## Don't
- Don’t invent new IA. PhoneShell / Ronny-sheet-låser står. Sidebar er Fluid inset (egen system-refresh).
- Don’t add bottom bar / pills / Mer.
- Don’t add A2HS install hints unless asked.

## Success
PR + preview URL; chrome files unchanged; visual delta obvious vs mild #136.
Supersede/close #136 if still open.
