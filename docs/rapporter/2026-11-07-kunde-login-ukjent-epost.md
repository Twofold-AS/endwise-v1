# Rapport — Kunde-login: ærlig ukjent e-post på forhandler-vert

## Hva er gjort
- **F41-10 / F39-04:** På `<sub>.endwise.no/logg-inn` får ukjent e-post (ikke kunde hos akkurat denne forhandleren) tydelig norsk beskjed: «Vi finner ingen kunde med denne e-posten hos [forhandlernavn].» Telefon: «…dette nummeret…». Ingen kode sendes. Ingen auto-opprett av konto.
- Kjent kunde får e-postkode som før (`signInMagicLink` etter tenant-oppslag).
- Kodefeltet sier «Vi har sendt en kode til e-posten din.» — ikke «Hvis kontoen finnes…».
- `app.endwise.no` og `platform.endwise.no` er urørt (nøytral tekst beholdt).
- UI: Board `FeltInput` + `FeilFlate` + `StatefulButton`. Mobil først. Ingen `#0066ff`. Ingen feature flags eller preview-ruter.

## Hva gikk galt
- Ingenting i koden. Før: `beOmKode` returnerte alltid `{ ok: true }` og klienten gikk til kodesteg også ved ukjent ident (enumereringsvern). Mikael vil ha ærlig nei på kundeflyten.

## Fikser
- `avgjorBeOmKode` / `ukjentKundeMelding` i `@endwise/modules/kunde`.
- `kunde.beOmKode` returnerer `{ sendt: true } | { sendt: false, grunn }`.
- Klienten viser `FeilFlate` og blir på ident-steget når `sendt` er false.

## Neste
- Preview på Vercel: `/logg-inn?tenant=<slug>` (ikke production).
- Ikke merge.
