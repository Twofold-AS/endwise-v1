# Rapport — forhandler-hjem Apple (Jonas GO 05.09.2026)

## Hva er gjort

- **F3-05 / F5-13 / F5-10:** Forhandler-hjem er destinasjonskort etter Jonas Apple-fasit.
  Hero (forhandlernavn, I dag · Pågår · Fullført, surface+hairline radius 16) + 2-og-2
  Timeplan|Rapporter · Innboks|Jobber · Kunder|Organisasjon · Samarbeid|Hjelp
  (Samarbeid hoppes når det er skjult i nav) · Lager (+Butikk ved shop).
- Desktop bruker samme kort; sidebar urørt. Ingen org-piller på hjem.
- Fasit: `docs/endwise-forhandler-hjem-apple-fasit.md`.
- Tester: `apps/web/test/forhandler-hjem-apple.test.ts` + oppdaterte hjem-låser.

## Hva gikk galt

Alt gikk som planlagt. Ingen ny UI-pakke. Ronny, markedslanding og mekaniker-hjem urørt.

## Fikser

- `DestinasjonSeksjonBar` er tom på `/dashboard` og `/verkstedet` (ikke på `?visning=dag` eller Organisasjon).
- Tomtilstander følger fasit-tabellen (ikke «Ingen nye meldinger» / mock-KPI).
- Desktop KPI-dump / AnsattePaJobb / Dagens saker er flyttet ut av hjem — de lever på dag-flaten.

## Neste steg

- Merge etter review. Chrome-PR #135 er separat.
- Mekaniker-hjem er bevisst utenfor denne PR.
