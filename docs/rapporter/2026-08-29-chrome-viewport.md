# Rapport — Chrome-mobil viewport (29.08.2026)

## Hva er gjort

- **F5-01 / F5-13:** App-skallet på telefon fyller synlig viewport. Rot-`viewport` har `viewportFit: 'cover'`. html/body er `100dvh`. Felles `APP_SHELL` (`h-dvh` + `env(safe-area-inset-top/bottom)` + `overscroll-none`) i forhandler-layout og MobileShell.
- Logo / første bar sitter under statusfelt / safe-area. Siste chrome / home indicator har bunnsinnfelt. Ingen `h-screen` / `100vh` på sideroten.
- **F7-01:** MobileShell bruker samme skall. `env()` er tatt av `<main>` (feil element) og av dobbel bunn-padding på nav.
- Test: `phone-chrome` låser dvh + safe-area, ikke rå `100vh`.
- Nav er urørt: ingen kort-hjem, bunnbar eller Mer-sheet.

## Hva gikk galt

Alt gikk som planlagt mot Mikaels viewport-beskrivelse. Ingen avvik i nav-IA, tokens eller Team-paneets egen `100dvh`-lås.

## Hvilke fikser ble gjort

- Rotårsak: `h-screen` (`100vh`) + `overflow-hidden` på begge skall, uten `viewport-fit=cover`. Chrome-mobil sin `100vh` inkluderer den kollapsende adresselinjen, så topp/bunn havnet under Chrome-UI / notch / home indicator (eller ga gap).
- Team sin `h-[calc(100dvh-3.5rem)]` ble ikke flyttet ut på hele siden.
- CSS-fallback `height: 100%` + `100dvh` på samme regel ble droppet — Biome `noDuplicateProperties`. Bare `100dvh`.

## Neste steg

- Verifiser på ekte Chrome Android/iOS (adresselinje vis/skjul, notch, home indicator).
- Custom permissions (Tilganger) er synlig disabled — ikke bygget.
