# Rapport — Innboks telefon/PC + tilbake-pil (28.08.2026 kveld)

## Hva er gjort

- **F5-14:** Mikael IA etter #80+#81 (`3ce99ef`). Oversikt-pilla er fjernet fra Innboks på alle viewports.
- **Telefon:** Top-bar 2 er filterraden (ikon + tekst: Alle chatter · Kunder · Intern · Endwise) pluss «Ny chat» (`MessageSquarePlus`). Landing er alle chatter. Filtre filtrerer lista, de er ikke destinasjoner.
- **PC (md+):** Ingen innboks-top-bar 2. Liste + detalj som før. Ikon-only filtre og «Ny chat» i list-header. Tom detalj: stor Inbox-ikon, «Ingen valgte meldinger», «Ny chat».
- **Tilbake-pil:** I #80-end-spacer på telefon (hovedmeny + top-bar 2). Betyr «rull mot start». Ingen hover, ingen aktiv/valgt.
- Organisasjon-piller uendret. Compose er fortsatt Kunde · Intern · Support. Mekaniker får ikke dealer-innboksen.

## Hva gikk galt

Alt gikk som planlagt mot briefen. Ingen avvik i RBAC eller compose-piller.

## Hvilke fikser ble gjort

- Filter-state løftet til `InboxFilterProvider` så telefon-bar og desktop-liste deler samme filter.
- Telefon-landing skjuler detaljkolonnen (`InboxHovedflate`) så lista er hele flaten.
- `PhoneHScroll` eier spacer + tilbake-pil, brukt av `PhoneNav` og top-bar 2.

## Merge mot #82 (1522036)

- `origin/main` (`1522036` Profil uten identitetskort) merget inn i `cursor/innboks-telefon-pc-e797` så #83 blir mergeable.
- Konflikt kun i `docs/UI-PAKKER.md` («Sist oppdatert»): beholdt både innboks-IA-notatet og profil-notatet.
- `docs/endwise-roadmap.html` auto-merget: F5-14 telefon/PC-steg + F5-19 profil-layout begge beholdt.
- Profilkode og -tester tatt fra #82 uendret. Innboks-IA uendret.

## Neste steg

- Draft PR #83 mot main. Ikke merget.
- F5-14 forblir `progress` (innboksen er bygget, IA iterates).
