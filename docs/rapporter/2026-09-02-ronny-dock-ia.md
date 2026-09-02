# Rapport — Ronny-dock IA (radius, canvas, tenking, Apple-ease)

**Dato:** 02.09.2026 · samme gren/PR #108 · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F5-10 / F5-13:** Ronny-panelet har 18px radius idle og åpen, topp og bunn. Samme radius på prompt-kortet. Reverserer «lukket = radius 0 / firkantet topp».
- **F5-13:** Ingen hvit canvas bak meldingene — Grainient/panelet synes gjennom. Bobler (`MessageBubble`) beholder egen flate.
- **F5-13:** Halvert padding under håndtaket (`pb-3` → `pb-1.5`, knapp `py-2` → `py-1`). Luft mellom stripe og bobler redusert (`pt-3` → `pt-1` + `pt-0.5` på svar-kort).
- **F5-10:** Hårlinjen under «Spør Ronny» er borte (`border-b` på `data-ronny-prompt-linje` fjernet).
- **F5-13:** Når agenten tenker: teksten «Ronny tenker…» med shadcn-shimmer (gradient + `bg-clip-text`) i takt med BloubBot `state='thinking'`. Ingen ekstra spinner. Conversation/Shimmer er ikke hentet — notert i UI-PAKKER §8.
- **F5-13:** Åpne/lukke er Apple HIG-kort (`cubic-bezier(0.32, 0.72, 0, 1)`, 200ms). Ingen `ease-out`-bounce, ingen `translate-y`-overshoot.
- **F5-13:** Full-åpen composer har ikke eget Grainient — prompt-kortet sitter på panelet. Idle/peek-composer beholder Grainient.

Beholdt: sticky composer, peek = bare assistent, strek-håndtak (ikke pil), telefon-logg 14px, felt ≥16px, ingen tool-liste, ASCII-tools, Apple DESIGN.md, ingen Morph/mørk chrome/Fireworks.

## 2. Hva gikk galt

Ingen kodeblokkering. Innlogging/DB mangler i dette miljøet, så live Ronny-stater i nettleser mot ekte sesjon kunne ikke kjøres her. Skjermbilder tas av de fem tilstandene via isolert forhåndsvisning der det er mulig.

## 3. Hvilke fikser ble gjort

Tester i `workshop-bloub.test.ts` oppdatert mot ny radius, transparent svar-kort, Apple-ease, tenke-shimmer og full-åpen uten composer-Grainient.

## 4. Neste fase / neste steg

Draft PR #108 oppdateres. Mikael ser preview. Ikke merge. Ikke ny PR.
