# Rapport — Telefon hovedmeny (28.08.2026)

## Hva er gjort

- **F5-13:** Mikael telefon-IA etter #78. Desktop-sidebar urørt. Rolle-IA og Organisasjon-struktur urørt.
- Hovedmeny på telefon er `h-row` (40px-token) — tydelig større enn 32-raden, ikke `h-row-store`/44px.
- `logo.svg` pinnest først (samme 22px som sidebar-header, ingen recolor).
- Trykk på et hovedpunkt scroller det inntil logo (`scrollTo` left, `top: 0`). Ikke `scrollIntoView` — den kan flytte foreldre vertikalt.
- Top-bar 2 forblir 32-rad / `text-label` / `sidebar-active` / `surface-2` / `gap-2`.
- Begge barer: `overflow-x-auto overflow-y-hidden overscroll-y-none touch-pan-x`.
- Top-bar 2 på telefon har samme venstre-innfelt som innholdet etter logo, så Oversikt/Timeplan linjer med Organisasjon.

## Hva gikk galt

Alt gikk som planlagt mot Mikaels telefon-IA. Ingen avvik i rolle-IA, desktop-nav, Organisasjon-struktur, priser, SMS, shop eller tokens.

## Hvilke fikser ble gjort

- Valgte `scrollTo` på scrolleren i stedet for hypotesen `scrollIntoView`, fordi `scrollIntoView` kan gi akkurat den vertikale wobblen som skulle bort.
- Logo utenfor scroller (strukturelt pinnest) i stedet for `position: sticky` inne i `overflow-x` — mer pålitelig på iOS.

## Neste steg

- Custom permissions (Tilganger) er synlig disabled — ikke bygget.
- Inspect viser kun Oversikt live; øvrige seksjoner er «ikke åpen ennå».
