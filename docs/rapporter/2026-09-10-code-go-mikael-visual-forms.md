# Rapport — CODE-GO Mikael visual + forms (10.09.2026)

## Hva er gjort

**F3-05** Toppkort: ukedag+dato øvre venstre i `text-label` (ikke fet). Halvsirkel uten midt-klokke og uten blå strek/nål — dither i Mobbin ink/hairline/soft. Fot `08.00` / `19.00` på samme linje som Planlagt/Pågår/Ferdig. Avvik|Forespørsler = Modus-plate (`p-0.5` + `h-7`). Endringer = text-label + hale-pil.

**F3-05** Analyser 50/50 (Tall for «forhandler» + Alle tall | zoomet dither med +vekst) **over** Jobb / På jobb.

**F5-14** Innboks-liste = Innstillinger-hårlinje. Tid/Gruppe = profil-popup (fixed + scrim). Ny melding = InnstillingSeksjon + synlig Send.

**F5-02 / F5-16** Kunder-søk = `PhoneSokFelt`. Opprett kunde / Registrer kjøretøy = InnstillingSeksjon.

**F3-09** Opprett jobb = InnstillingSeksjon. Regnr festes på bookingen (`velgKjoretoyForJobb`).

**Tjenester** «Ny tjeneste»-knapp fjernet fra Alle tjenester — opprettelse bare i top-bar.

## Hva gikk galt

Tid/Gruppe-popupen ble klippet av `overflow-hidden` på innboks-chrome og var for smal (`w-[min(100%…)]` av knapp-wrapper). Vegvesen-regnr på Opprett jobb ble bare vist, ikke festet på `bookings.vehicleId`.

CODE-GO-tester krevde `#e0e0e0` som literal i `pulse-kort.tsx` (konstanten bor i `phone-home-pulse.ts`). Biome formatterer Send over flere linjer — testen matcher `Send</StatefulButton>`. `vehicles.create` tok `string | null` fra Vegvesen; tRPC vil ha `string | undefined`. To apple-hard-sjekker (`forhandler-hjem-apple-hard`) feiler fortsatt mot Timeplan-piller / Planlagt i dealer-fila — det er hoved-main, ikke denne økta.

## Hvilke fikser ble gjort

Fixed + scrim som profilmenyen. `velgKjoretoyForJobb` gjenbruker regnr eller oppretter kjøretøy før `bookings.create`. Blå `#0066ff` fjernet fra dagsbuen (kun kommersiell). Hairline-hex i dither-slice + Send på én linje så CODE-GO-testene går.

## Neste

Nettleser: toppkort, Analyser 50/50, innboks-liste + Ny melding, Opprett jobb med kjøretøy, tjenester uten dup-knapp, Kunder-søk. Ingen #114/#119. Draft PR.
