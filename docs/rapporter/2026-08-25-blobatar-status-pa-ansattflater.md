# Rapport — 25.08.2026 — Blobatar + status på de ekte ansattflatene

**Roadmap:** F6-19 utvidet (done) · F3-08 delvis (progress: liste + load/status, ikke ferdigheter)
**Gren:** `cursor/blobatar-varianter-status-07a2` mot `main`

## 1. Hva er gjort

### F3-08 / F6-19 — `/mekanikere` er ekte liste
Launch-funnet stemte på `main`: siden var `<Placeholder title="Mekanikere" phase="F3-08" />`.
I denne PR-en er den erstattet med `mechanics.oversikt` (blobatar + load + status).
Ferdighetsmerker og sertifiseringer gjenstår.

### F6-19 — hvor ansatte faktisk rendres
- **Team › Funksjoner** (`_funksjoner.tsx`) var den ekte ansattlista med initialer.
  Viser nå blobatar (seed = `user.id`) + status-humor når personen har mekanikerprofil.
- **Team › Inviter** er ventende invitasjoner (e-post, ingen bruker-ID) — ingen avatar.
- **Settings-huben** (`team/page.tsx`) er urørt.
- **`directory.participants`** returnerer fortsatt lagret avatar. Status-humor bor
  ikke her: innboksens samtaleliste/tråd har ingen statuslabel ved ansiktet.
- **Innboks Detaljer** (mekanikerkort): status-humor + norsk label, som før.
- **Sidebar:** valgt humor, ikke jobbstatus og ikke tvunget `happy`.
- **Meg / min-dag/profil:** valgt humor i ansiktet; status står som tekst.

### Mapping (Jonas)
- ledig → `happy` / «Ledig»
- på jobb / opptatt → `thinking` / «På jobb» / «Opptatt»
- fri (`active: false`) → `idle` / «Fri» — **ikke** `sleepy` (leses som trøtt)
- `sad` brukes ikke til arbeidsstatus
- Ingen presence, ingen nye kolonner

## 2. Hva gikk galt
Alt gikk som planlagt mot spesifikasjonen. `_inviter` fikk bevisst ingen ansikt:
det finnes ingen identitet å seede på før invitasjonen er godtatt.

## 3. Fikser
- Statusnøkkel `ikke_tilgjengelig`/`sleepy` rettet til `fri`/`idle`.
- Sidebar og profil sluttet å overstyre ansiktet med jobbstatus.

## 4. Neste steg
- F3-08: ferdighetsmerker og sertifiseringer på mekanikerlista
- F6-12: live-status (SSE/presence) hvis det noen gang skal finnes — ikke funnet opp her
