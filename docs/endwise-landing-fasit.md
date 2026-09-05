# Endwise landing — fasit (2026-09-05)

Låst av Jonas. **Overstyring samme dag:** Mikael via Jonas — primær CTA er «Prøv Endwise». **Overstyring samme dag (etter #129 / #132):** Mikael/Jonas — primær CTA-fyll er Action Blue `#0066cc`, ikke produkt-`#111`. **Overstyring 05.09.2026 (etter #133):** Mikael — logo på `/` er svart/ink, ikke logogrønn.

Gjelder den offentlige markedssiden `/` i `apps/web` (ikke dealer-chrome).

## Visual

- Lys default, Inter, parchment `#f5f5f7`, ink `#1d1d1f`, hårlinje `#e0e0e0`
- Primær CTA: Action Blue `#0066cc` (`--ew-accent` / `bg-primary`), hover/strong `#0071e3`, soft `#e8f1fb` — tokens fra `packages/widget-tokens`
- Logo (merke + wordmark) er ink `#1d1d1f` / `bg-fg` / `text-fg` — aldri `#1ED27D` på landing. CTA forblir Action Blue.
- Mye luft, max innhold ~1120–1200
- Myke produktrammer 12–16 radius
- Ingen blobatar/maskot, ingen roadmap-rød `#EE2924`, ingen grønn CTA
- Ingen «Start gratis», ingen sticky megameny
- Topp: logo + Logg inn + primær CTA

## Hero

- H1: **Verkstedet, samlet.**
- Én linje om booking/innboks/jobber
- Primær CTA: **Prøv Endwise** (Action Blue `#0066cc`, hvit tekst) → eksisterende demo-flyt / `hei@endwise.no`
- Sekundær: Logg inn
- Ett produktbilde-spor (plassholder OK)
- Ingen karusell/video

## Seksjoner KUN i denne rekkefølgen

1. Hero
2. Tre like løfter: Booking · Innboks · Verkstedet
3. Produktskudd: stort desktop-UI + telefon Min dag (tekst/bilde veksler én gang)
4. Pris tre kort: Start 4 490 / Pro 8 490 / Enterprise 12 490 (eks. mva); valgt = `border-fg` + soft; CTA «Ta kontakt» / samme destinasjon; ingen setepris
5. Kort tillitslinje (norsk, Quick, Vegvesen/Autosys hvis sant — ingen falsk logo-vegg)
6. Footer-CTA (samme primær: **Prøv Endwise**) + footer-lenker (personvern, vilkår, kontakt)

## Bilder

3–5 faste spor til midlertidige UI-skjermbilder. Lyse plassholdere OK. Layout skal tåle bytte uten reflow. Ikke stock-mekanikerfoto.
