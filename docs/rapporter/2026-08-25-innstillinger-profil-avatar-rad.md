# Rapport — 25.08.2026 — PR #38 rebase/merge mot main (#36/#37/#40/#41)

## Hva er gjort (F5-19)

- Merget latest `main` (`4e57867`, inkl. squash av #36, #37, #40 og #41) inn i PR #38.
- **Team-fanen er fjernet** fra Innstillinger: #41 la Team i sidebaren (`/innstillinger/team`). Faner: Profil · Integrasjoner · Abonnement · Varsler · Tjenester & priser.
- Profil: avatar 56px til venstre for visningsnavn | e-post. Form- og uttrykk-velgeren (#37) er foldet under. Ingen filopplasting, ingen sticky Save.
- #35 Ny/CountBadge, #36 live-SSE, #40 demo-seed beholdt. Sidebar-farger urørt.

## Hva gikk galt

Alt gikk som planlagt. Konflikter i `avatar-velger.tsx`, `integrasjoner/page.tsx`, `uiux-p0.test.ts`, `UI-PAKKER.md`, `endwise-roadmap.html`.

## Hvilke fikser ble gjort

- `AvatarVelger` kombinerer Jonas-raden med #37-uttrykk (ingen `medHappy`).
- Integrasjoner-innhold bruker `post.aktiv` (#36/#40).
- `/innstillinger/team` er egen destinasjon igjen, ikke settings-alias.

## Neste steg

- Mikael merger når CI er grønn. Ikke merget av agenten.
