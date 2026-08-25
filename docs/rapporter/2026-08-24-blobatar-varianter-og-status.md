# Rapport — 24.08.2026 — Blobatar-varianter og ansattstatus

**Roadmap:** F6-19 utvidet (done) · F3-08 delvis (progress: liste + load/status, ikke ferdigheter)
**Gren:** `cursor/blobatar-varianter-status-07a2` mot `main` (`cdf9ec1`)

## 1. Hva er gjort

### F6-19 — flere uttrykk i velgeren
- Happy-låsen i `AvatarVelger` er opphevet. Brukeren velger blant bibliotekets ti
  kuraterte `expression`-eksporter (undersøkt i `blobatar/expression`, ikke gjettet).
- «Ny tilfeldig» trekker også uttrykk.
- Persistering via eksisterende `profile.setAvatar` — feltet støttet humor fra før.
  Ingen schema-/API-utvidelse for humor.

### F6-19 — blobatar viser ansattstatus
- Statusfeltet som FAKTISK finnes: `mechanics.active` + dagens levende bookinger
  (`draft`/`confirmed`/`in_progress`) mot `capacity`. Ingen syk/ferie-kolonne,
  ingen presence, ingen nye DB-kolonner.
- Mapping: ledig → `happy` · på jobb / opptatt → `thinking` · ikke tilgjengelig → `sleepy`.
- Norsk label står ved siden av uttrykket.
- Identitet (form/farge/tone/seed) er urørt. Status overstyrer KUN humor på
  `/mekanikere`, Meg, min-dag/profil og Detaljer-panelet. Velgeren viser det
  lagrede uttrykket.

### Ikke rørt (som avtalt)
- Settings-faner / innstillinger-hub (inkl. `_funksjoner.tsx` med initialer)
- CountBadge / Ny
- live-SSE
- Sidebar (fortsatt always-happy)
- Fil-opplasting, Kentucky-grønn, PRO-badge

## 2. Hva gikk galt
Alt gikk som planlagt mot spesifikasjonen. Hypotesen om syk → `sad` ble forkastet:
det finnes ingen syk/borte-kolonne å mappe.

## 3. Fikser
Ingen regresjonsfikser utover å oppdatere P0-tester som krevde happy-låsen.

## 4. Neste steg
- F3-08: ferdighetsmerker og sertifiseringer på mekanikerlista
- Ev. blobatar på Team › Jobbfunksjon (annen agent eier settings-huben)
