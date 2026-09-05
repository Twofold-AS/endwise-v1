# Forhandler UI-system — designlås (05.09.2026 kveld)

Bygger videre på #137 (`47595f4` — hard Apple-hjem). Overstyrer kun kort-radius (8px) og sidebar-skinne. Hero/IA/tomtekst fra #137 står. Telefon-chrome og Ronny-låser står.

## Tokens (`@endwise/widget-tokens`)

| Rolle | Verdi | Bruk |
|---|---|---|
| Apple Blue | `#0071e3` | Fylt primær-CTA + valgt/aktiv fyll |
| Link Blue | `#0066cc` | Outlined CTA, inline-lenker |
| Signal Blue | `#2997ff` | Dekor only, aldri interaktiv |
| Carbon | `#1d1d1f` | Primærtekst |
| Frost | `#f5f5f7` | Side/scroll-canvas |
| Ice | `#f4f8fb` | Hevet wash / hover |
| Pebble | `#e2e2e5` | Disabled fyll |
| Hairline | `#d2d2d7` | 1px kant |
| White | `#ffffff` | Kort / inset-innhold |
| Pille | `980px` | Knapper / tags |
| Kort | `8px` | Kort, input, bilder |
| Sheet-topp | `16px` | Telefon bunnsheet |

Ingen drop-shadow på kort, knapper, nav, sidebar. Brødtekst 17/400/−0.016em. Maks UI-vekt 600.

**Unntak:** Galaxy Oppgrader/Enterprise kan være `#111` + galaxy-overlay.

Fluid Functionalism-sidebar ble **ikke** installert (Base UI + framer-motion er utenfor techstack). Eksisterende dealer-sidebar er omskrevet til samme kontrakt.

## Sidebar

- Desktop: **inset** (hvitt innholdskort i Frost), **offcanvas**, ingen ikon-skinne — peek (hover/klikk)
- Resize 160–360px; `sidebar_state`-cookie kun desktop
- Telefon: modal drawer under 768px, persisteres aldri
- Treff: 24px ikon-knapper, 16px ikoner
- Grupper + merker + hover-handlinger + aktiv rad semibold + traveling bg
- IA: Verkstedet, Innboks, Jobber, Kunder · Samarbeid, Rapporter, Organisasjon, Lager/Butikk · footer Hjelp + bevel-avatar + Galaxy-CTA
- Visningsvelger ute. Organisasjon er én destinasjon (liste på siden, ingen top-bar 2-piller)

## Telefon-chrome (urørt)

Merke midt, hale-pil, Ronny venstre for toggle (toggle ytterst), sticky z-60, ingen stripe. Sheet 80/100 radius 16. Desktop Ronny høyre overlay max 400px. Spinn kun `data-ronny-spin="1"`.

## Hjem

Frost-canvas. Hvitt kort radius 8, hairline, padding 24. Hero I dag/Pågår/Fullført. Tom hero: fylt Apple Blue + outlined Link Blue.
