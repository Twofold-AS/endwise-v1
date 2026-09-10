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

## Hvilke fikser ble gjort

Fixed + scrim som profilmenyen. `velgKjoretoyForJobb` gjenbruker regnr eller oppretter kjøretøy før `bookings.create`. Blå `#0066ff` fjernet fra dagsbuen (kun kommersiell).

## Neste

Verifisere i nettleser (toppkort, Analyser, innboks-popup, Opprett jobb med regnr). Ingen #114/#119.
