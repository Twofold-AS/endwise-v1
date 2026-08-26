# Øktrapport — Forhandler UX (26.08.2026)

## Hva er gjort

- **F5-13:** Forhandler-sidebar etter Mikaels sign-off: Verkstedet▾ (Dagen, Prisliste), Innboks, Jobber▾, Kunder▾, Ansatte▾ (Team, Kompetanse, Timeplan), Rapporter, Hjelp-slider, Innstillinger. Samarbeid skjult. Mekaniker/Lager urørt.
- **Alias:** `/jobber`, `/rapporter`, `/hjelp`, `/verkstedet` (eksisterende sider). `/ansatte` redirect til Team. `/innstillinger/koblinger` og `/innstillinger/integrasjoner` lander på Koblinger-fanen.
- **Tillit:** `/admin` og `/endwise` for innlogget forhandler = «Ikke tilgang», sesjonen beholdes. Norsk 404. Varselbrytere disabled. Én identitet i footer (session.me + skjelett). Test-artikler («Mikael testing», «Halla balla») filtreres fra forhandler-liste og badge. Rapporter: tomflate uten bookinger, ellers merket eksempel — ikke `analyse/_data.ts`. Quick-feil: én setning.
- **Ny jobb:** Ny kunde / Nytt kjøretøy i samme rute (navn+telefon, regnr).
- **Tomflater:** heading + setning + én primærhandling. Innboks-filtre har synlig tekst. Kalender utvider 07–18 når jobber ligger utenfor.

## Hva gikk galt

Alt gikk som planlagt i testharness. Live Quick-payload i Yamaha-prod er **ikke** verifisert i denne PR-en (ligger i #59).

## Fikser

- `krevEndwiseAdminSide` returnerer `forbidden` i stedet for å kaste til `/signin`.
- Helpdesk-slider tom = `null` (ikke «Ingen artikler ennå»).
- Inbox `SAK-xxxx` fjernet.

## Neste

- Live Quick-pull mot Yamaha når schema-PR er merget.
- Resource på gateway (ikke i denne PR).
- `sellPriceMinor` når ekte Quick-prisfelt er dokumentert.
