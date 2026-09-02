# Rapport — Ronny-dock (tenking, se hele, hero-kort, overlay)

**Dato:** 02.09.2026 Europe/Oslo · Mikael etter innlogging på endwise.no (main, squash av #105)

## 1. Hva er gjort (per roadmap-ID)

- **F5-13:** Idle-syklus 5s uten `state: 'thinking'`. `BloubBot` og `PromptInputSubmit` tenker bare når `status === 'submitted' || status === 'streaming'` — ikke ved åpne dock eller stripe-klikk. Idle-ansikt (wink/burst/colere) fortsetter.
- **F5-13:** `data-ronny-utvid` («se hele») er flyttet ut av Prompt-kortet, på grainient-rammen under kortet. Knappen setter `visning === 'utvidet'`, ikke bare `foldet`/samtalehøyde. Første send vokser fortsatt tråden i dock.
- **F5-10 / F5-13:** Prompt-kortet bruker `PHONE_KORT_FYLL` + 18px + `#fff` / hairline `#e0e0e0` / ink `#1d1d1f`. Bredde flush med Verksted-hero: `max-w-[520px] px-3` på telefon, `md:max-w-[1120px] md:px-8` på desktop. `min-h-[8.75rem]` så det ikke er en tynn stripe. Padding under kortet mot grainient-bunnen.
- **F5-13:** `utvidet` er fast overlay (`fixed left-0 right-0 bottom-0`, `top: ankerTop`, `z-[60]`) fra stripen til viewport-bunn, full bredde over sidebar. Ingen `calc(100dvh - ankerTop - 8px)`. Ankeret i flyt forblir 44/32px — overlay dytter ikke layout. Escape: utvidet → dock → stripe.
- Beholdt: Grainient på ramme, rotateY-klikk, `gåTil` + `søkKunder`, magic-link/2FA, desktop-sidebar persistent i dock. Auth, PgBouncer, migrate og Mistral-env urørt.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen db:seed/db:setup. Ingen merge.

## 3. Hvilke fikser ble gjort

Tester i `workshop-bloub.test.ts` oppdatert for idle uten thinking, 5s, «se hele» utenfor kortet, hero-kort og fixed overlay.

## 4. Neste fase / neste steg

Draft PR fra `main`. Mikael ser preview. Ikke merge. Ikke ping Jonas.
