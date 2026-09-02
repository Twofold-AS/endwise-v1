# Rapport — Ronny sticky composer + iOS 16px-felt

**Dato:** 02.09.2026 Europe/Oslo · Mikael lock (sticky IA + iOS-zoom)

## 1. Hva er gjort (per roadmap-ID)

- **F5-13:** Stripe-tap åpner sticky Grainient-composer nederst (`fixed inset-x-0 bottom-0`, overlay, dytter ikke layout). Send: peek under stripen viser bare Ronnys svar (ikke brukermelding). Horisontal strek (`RonnyHandtak`) — tap eller dra ned åpner full logg (samme dekning som før: alt unntatt toppbar + stripe). Håndtaket lukker/folder også. Escape: utvidet → dock → stripe.
- **F5-10 / F5-13:** Full logg bruker `Message`/`MessageBubble`. Telefon-logg `text-[14px]` med `gap-6` mellom meldinger. Desktop 17px body. Composer-polering beholdt: «Spør Ronny …», tømmes ved send, hårlinje `#e0e0e0`, Action Blue `#0066cc`. Ingen tool-liste. ASCII-tools urørt (`gaaTil` osv.).
- **F5-01 / F5-10:** iOS Safari-zoom: alle interaktive felt minst 16px på telefon. Global regel i `globals.css` (`max(16px, 100%) !important` under 768px) på input/textarea/select/contenteditable. Prompt Input `text-[16px] md:text-label`. Login e-post er `text-body` (17px); magic-kode/OTP allerede `text-[16px]`. Viewport uten `maximumScale: 1` / `userScalable: false`.

## 2. Hva gikk galt

Alt gikk som planlagt mot den låste IA-en. Context7 MCP krevde auth og ble ikke brukt — API-er lest fra eksisterende kallsteder. Innlogget iPhone-Safari kunne ikke kjøres her; zoom-regelen er den klassiske 16px-gulvet.

## 3. Hvilke fikser ble gjort

Tester oppdatert (`workshop-bloub`, `phone-sidebar`, `desktop-chrome`) + ny `ios-input-zoom.test.ts`. UI-PAKKER og roadmap notert.

## 4. Neste fase / neste steg

Draft PR. Mikael ser preview på iPhone (fokus skal ikke zoome). Ikke merge.
