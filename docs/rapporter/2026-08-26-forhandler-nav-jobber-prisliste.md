# 26.08.2026 — Forhandler-nav: Verkstedet uten ▾, Prisliste under Jobber

## Hva er gjort

- **F5-13:** Verkstedet er én knapp til dagens Dagen (`/dashboard`). Ingen dropdown-barn.
- **F5-15 / F5-04:** Jobber ▾ har Oversikt (tidligere Liste), Kalender og Prisliste. `/prisliste` aliaser eksisterende katalog. `/verkstedet` lander fortsatt på Dagen.
- **F5-19:** Ansatte ▾ (Team, Kompetanse, Timeplan) står over Rapporter. Hjelp-slideren over Innstillinger er urørt. Kallenavn i identitetsblokka er urørt.
- Mekaniker- og Lager-nav uendret. Ingen Kontor/Gulvet. Ingen Admin-tab.

## Hva gikk galt

Ingenting — Mikael flyttet Prisliste og tok vekk Verkstedet-dropdown etter forrige nav-lås.

## Fikser

- `FORHANDLER_NAV`: Verkstedet uten `children`; Jobber-barn `Oversikt` / `Kalender` / `Prisliste`.
- Alias `/prisliste` → `/innstillinger/tjenestekatalog`. Breadcrumb og PARKED_LABEL sier Jobber · Prisliste.

## Neste

Verifiser live at Forhandler-sidebar viser Verkstedet uten pil, og at Prisliste ligger under Jobber.
