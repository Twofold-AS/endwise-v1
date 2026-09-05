# Forhandler-hjem — Apple-redesign (GO 2026-09-05)

Låst av Jonas. **Overstyrer tidligere telefon-hjem-IA** der den kolliderer
(Innboks|Timeplan · Statistikk|Salg, Samarbeid ute, org-pille på hjem, desktop
KPI-dump). Egen PR — ikke #135 dealer-chrome, ikke markedssiden `/`, ikke
Organisasjon-piller, ikke Endwise-admin, ikke mekaniker-hjem.

Gjelder forhandlerens destinasjonskort på `/dashboard` og `/verkstedet`
(`apps/web/app/(app)/_shell/phone-home*.ts(x)` + `dashboard/page.tsx`).

**Hardere visuelt pass** (etter mild #136): se
`docs/endwise-forhandler-hjem-apple-hard-fasit.md`. IA under er uendret.

## Scope

- **Telefon:** store kort-hjem (ikke sidebar-liste, ikke bunnbar).
- **Desktop:** samme destinasjonskort i innholdskolonnen. Sidebar urørt.
- **Tokens:** parchment `#f5f5f7`, surface `#fff`, ink `#1d1d1f`, muted `#7a7a7a`,
  hairline `#e0e0e0`. Action Blue `#0066cc` sparsomt. Inter. Ingen chrome-skygg.

## Hero — Verkstedet (full bredde)

- Navn: forhandlernavn (fallback «Verkstedet»).
- Tre tall: **I dag · Pågår · Fullført** (ekte `bookings.list`; skeleton ved last).
- Tap → inn i dagen / Verkstedet-destinasjon (`/dashboard?visning=dag`).
- Bakgrunn: surface `#fff` + hairline, radius 16 — **ikke** solid `#111`-fyll.
- Tom dag: tall `0` + «Ingen jobber i dag».

## Kort-rekkefølge (2-og-2 under hero)

1. Timeplan | Rapporter — Timeplan: 3–4 neste rader (tid + hva); tom «Ingen jobber i dag».
2. Innboks | Jobber — meta ulest / neste; tom «Ingen uleste» / «Ingen åpne jobber».
3. Kunder | Organisasjon — Organisasjon → liste-root (ingen piller).
4. Samarbeid | Hjelp — hopp Samarbeid hvis skjult i nav (ikke tom plassholder).
5. Lager (full bredde eller 2-col med Butikk ved shop-flagg) — tom «Ingen lave varer» / «Ingen deler ennå».

Ingen hjem-kort for Book / Oppslag / AI / Kompetanse / Prisliste / Abonnement.

Destinasjoner (eksisterende tre, ikke nytt IA-tre):

| Kort | href |
|---|---|
| Verkstedet | `/dashboard?visning=dag` |
| Timeplan | `/jobber?visning=kalender` |
| Rapporter | `/rapporter` |
| Innboks | `/innboks` |
| Jobber | `/jobber` |
| Kunder | `/kunder` |
| Organisasjon | `/organisasjon` |
| Samarbeid | `/samarbeid` (kun hvis raden står i `FORHANDLER_NAV`) |
| Hjelp | `/support` |
| Lager | `/lager` |
| Butikk | `/butikk` (kun `shop`-flagg) |

## Kort-uttrykk

- Surface `#fff` på parchment, hairline, radius 12–16.
- Tittel ink; meta 12px muted.
- Primærhandling = tap hele kortet. Ingen ny bunnbar.
- Fylt med ekte meta fra eksisterende tRPC — ærlig tomtilstand alltid.

| Kort | Tom |
|---|---|
| Hero | «Ingen jobber i dag» + 0/0/0 |
| Timeplan | «Ingen jobber i dag» |
| Innboks | «Ingen uleste» |
| Jobber | «Ingen åpne jobber» |
| Kunder | «Ingen kunder ennå» |
| Organisasjon | «Åpne organisasjon» |
| Rapporter | «Ingen tall ennå» |
| Lager | «Ingen lave varer» |
| Hjelp | «Artikler og support» |

## Don't

- Ikke ny bunnbar / hamburger / Mer-ark.
- Ikke Organisasjon-piller på hjem (`DestinasjonSeksjonBar` er tom på dealer-hjem).
- Ikke grønn logo / `#111` kortfyll overalt.
- Ikke Galaxy/Grainient på hjem-kort.
- Ikke Endwise-admin-chrome.
- Ikke mekaniker-hjem i denne PR.
- Ikke røre Ronny-sheet/overlay.
- Ikke redesigne markedssiden.

## Do

- Safe-area + dvh (eksisterende phone-shell). Hit ≥44.
- Bevel/Meg uendret.
- Smallest diff mot `phone-home.ts` / `phone-home-dealer.tsx` / `dashboard/page.tsx`.
