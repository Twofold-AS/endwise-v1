# Rapport — Ronny-størrelse + profilmeny Modus

## Hva er gjort
- **F5-13:** Ronny og profil deler samme `size-7` / 28px-sirkel i hjem- og Settings-chrome. Bloub viewBox (158/100) skaleres med `ronnySizeForSirkel` så kroppen fyller disken.
- **F5-13:** Profilmeny smalere (260px). Theme → **Modus**. Hårlinje over og under Modus-raden. Segmentert kontroll; aktivt ikon har sirkel rundt. Hårlinje over vilkår. Vilkår 14/550. Popup-topp linjer dest-piller (`mt-2.5` = `PHONE_BAR2_PY`).
- Ink/canvas, blå Oppgrader beholdt. Pulse-kort, #114 og #119 urørt.

## Hva gikk galt
- Ronny så mindre ut enn profil selv om begge var 28px: Bloub-kroppen er 100/158 av SVG-boksen. Fikset med skalering inn i samme overflow-hidden-sirkel.

## Fikser
- Felles `PHONE_AVATAR_KLASSE` for Ronny og profil.
- `ronnySizeForSirkel(28) = 44` så disken blir 28px.
- Modus-segment + hårlinjer + smalere meny + dest-pille-justering.

## Neste
- Eier visual GO på draft-PR. Ikke merge.
