# Rapport — telefon-søk, profilmeny, Settings › Konto

## Hva er gjort
- **F1-02 / F1-11:** Autentikator-bekreftelse heter bare «Bekreftelse».
- **F5-13:** Telefon top-bar 2 mer luft. Profil-sirkel token-invertert. Søk-ikon `text-fg`. Overlay uten dest-ikonstripe. `search.global` grupperer treff (Kunde, Jobber, Innboks, Kjøretøy, Deler, Team, Tjenester, Hjelp) + Sider på klient.
- **F5-13:** Profil-bokstav åpner Mobbin-meny (Oppgrader #0066ff, Forespørsel, Innstillinger, Theme, Veikart, Oppdateringer, Logg ut, Vilkår). Ronny-sheet urørt.
- **F5-19:** Settings-chrome på telefon (tilbake + Innstillinger + underline-nav). Konto-fane: stille avatar, rader + Endre, Logg ut overalt, rød Slett.

## Hva gikk galt
- Context7 MCP krevde auth og ble ikke brukt. Stacken fulgte eksisterende tRPC/Drizzle-mønster.
- `personvern.slettMeg` finnes ikke. Slett-knappen er ærlig hvis Better-Auth `deleteUser` mangler.
- Eldre chrome-tester krevde at `data-shell-tilbake` aldri fantes — Settings-chrome brøt dem.
- `global-search.test.ts` matchet ordet «fake» i kommentaren «Ingen fake treff».
- `phone-profil-settings` matchet ikke `'Slett'` i ternær (`{… ? 'Sletter …' : 'Slett'}`).

## Fikser
- Dest-ikonstripe fjernet fra overlay (låst i tester).
- `?fane=konto` alias til intern id `profil`.
- Tilbake-tester oppdatert: pil kun bak `erSettingsSti`.
- Søke-test unngår kommentaren; Slett-sjekk er `/['"]Slett['"]/`.

## Neste
- Eier merger draft PR. Visuell GO på telefon: søk-grupper, profilmeny, Konto.
- Eventuelt ekte selvbetjent kontoslett (F12/F14) hvis eier vil ha mer enn ærlig feil.
