# Dealer — Organisasjon (Jonas-lås 2026-09-05)

Hører til dealer-chrome PR. **Ikke** Apple-redesign av forhandler-hjem.

## Top-bar 2 / piller

- **Fjern** Organisasjon top-bar 2 (Oversikt · Timeplan · Ansatte · Abonnement · Integrasjoner).
- **Ingen** `DestinasjonSeksjonBar` i `(app)/layout.tsx`. Dealer-stien monterer den ikke.
- Endwise-admin/partner kan montere den i `endwise/layout`.
- **Ingen** ny pille-rad noe sted på dealer-flater.
- Telefon-chrome (merke / Ronny / toggle / tilbake-pil) står.

## `/organisasjon` (og telefon)

Erstatt pillene med en **gruppert liste**:

1. Ansatte
2. Timeplan
3. Abonnement
4. Integrasjoner

Valgfri dealer-meta øverst (forhandlerkort). Ingen Oversikt-pille.

## Don't

- Ikke redesigne forhandler-hjem-kort i denne PR-en.
- Ikke ny pille-rad.
- Ikke «Endwise»-ordmerke i chrome-logo.

## Oppgrader / Enterprise-merke

Galaxy på **både** Oppgrader-CTA og Enterprise-merke (`data-plan-badge`). Merke uten lenke. Ikke Galaxy på Ronny.
