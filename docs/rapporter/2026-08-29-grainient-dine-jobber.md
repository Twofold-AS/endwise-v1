# Rapport — Grainient-kort, Dine jobber og Timeplan (29.08.2026 natt)

## Hva er gjort

- **F5-13:** Mikael IA-lås. Grainient forhandler-kort (react-bits `Grainient-JS-CSS`, `ogl`) øverst på Forhandler-, Mekaniker-, Selger- og Support-hjem (telefon + desktop). Lys palett `#ffffff` / `#ededed` / `#f5f5f5`, mørk `#777777` / `#333333` / `#111111`. Hero-kort full bredde, `rounded-xl`, ikke 1080-kvadrat. Lesing via `forhandler.kort` (protected), ikke admin-`get`.
- **F7-01 / F7-02:** «Dine jobber» (`/dine-jobber`) erstatter «Min dag»-hero og Detaljer-accordion. Jobb-bokser: tid, MC/ATV/BÅT-ikon, kundenavn, pil til eksisterende `/min-dag/[id]` START/FERDIG. Desktop-sidebar: label byttet, IA ellers urørt.
- **F5-13 (telefon):** Bevel (avatar + Innstillinger + logg ut) i dokumentflyt nederst på siden — ikke sticky/fixed. Tilbake sitter på samme rad som logo, ytterst til høyre. `h-dvh` + `env(safe-area-inset-*)` bare på logo-chrome.
- **F7-03:** Timeplan: måned over dag-stripe, piler i stedet for overflow-scroll, valgt dag ytterst til venstre, fast 08:00–20:00-rutenett. Oslo-døgn fra `#90` (`packages/modules/src/tid.ts`).
- **F3-09:** Ny jobb-starttid er to expander-knapper (Dato = Oslo-kalender, Klokke = time+minutt-spinner). Ingen `datetime-local`.
- **F5-19:** Feriedager per ansatt som merket mock/kommer i Innstillinger (telefon + desktop). Ingen backend, ingen e-post.

## Hva gikk galt

`pnpm dlx shadcn@latest add @react-bits/Grainient-JS-CSS` hentet registry, men `pnpm add ogl` feilet på leftover `prepare` (`lefthook install` mot custom hooksPath). Grainient er derfor lagt inn fra registry-JSON-en (`packages/ui/src/components/grainient.tsx` + `grainient.css`) med `@react-bits`-registry i `components.json` — ikke en håndrullet gradient. `ogl` ^1.0.11 i både `@endwise/ui` og `@endwise/web`.

Context7 MCP ble ikke brukt for Grainient-API — kilden er registry-fila og eksisterende Oslo-tid i repoet.

Innlogget nettleser-verifisering av Grainient/WebGL kunne ikke kjøres her (ingen sesjon/DB).

## Hvilke fikser ble gjort

- `forhandler.kort` som protected les, så mekaniker/selger/support kan vise butikkfelt uten admin-`get`.
- Telefon-bevel flyttet inn i `overflow-y-auto`-kolonnen (etter `<main>`), `PHONE_SAFE_BUNN` med padding over home-indicator.
- Timeplan-tester leser både siden og `TimeplanStripe` (pilene bor i stripen).
- `phone-home.test.ts` oppdatert: mekaniker-hjem har ikke lenger Min dag / Detaljer-accordion.

## Neste fase / neste steg

- Ferie-mock venter på ekte forespørsel + visning (ingen e-post i denne runden).
- Quick urørt. Booking-AI urørt. Desktop-sidebar urørt utenom «Dine jobber»-label og logo-invert som allerede er på main.
