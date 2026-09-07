# Rapport — dest-nav tom etter #149 (07.09.2026)

## Hva er gjort (roadmap)

- **F5-13** — Bugfix etter Jonas NO-GO på mergede #149. Delt `destinasjonerForShell` + `rolleForNav` i `nav.ts`. Telefon top-bar 2 og desktop-sidebar bruker samme Endwise-IA (Verkstedet, Innboks, Timeplan, Kunder, Tjenester, Organisasjon, Lager). Shop-av skjuler bare Butikk. Aktiv = canvas-soft. ⛔ pip / border-left. ⛔ #114/#119. Status `progress` til Jonas visual re-GO.

## Hva gikk galt

Rotårsak verifisert: `itemsForRole` returnerer `[]` når `role` er `null` (før `session.me` lander) eller et Better-Auth-alias (`owner` / `admin`) som ikke finnes i `OrgRole`. Hjem-kortene trenger ikke rolle, så Verkstedet så ferdig ut. #149 koblet telefon top-bar 2 på samme tomme mapping. Desktop-tomteksten «Ingen destinasjoner å vise.» trigget på `shell === 'forhandler' && !shopEnabled` — `shopEnabled` defaulter til `false` før sesjon, så first-paint så ut som ferdig tom meny.

Alt annet i Mobbin-låsen og telefon-chrome sto. Ingen ny stack-pakke.

## Fikser

- `rolleForNav` normaliserer `owner`/`admin` → `dealer_admin`, plattform-remap, og chrome-first skall-default når rolle mangler.
- `destinasjonerForShell` er én liste for PhoneShell og Sidebar (inkl. inspect → forhandler-IA).
- Fjernet den villedende shop-tomteksten.
- Tester i `destinasjoner-for-shell.test.ts` (RED → GREEN). `itemsForRole(null)` er fortsatt ærlig tom.

## Neste

- Jonas visual re-GO på draft-PR. Ikke merge.
- Ekte innloggede skudd når sesjon finnes; mock-skudd i denne økten viser piller + sidebar-rader.
