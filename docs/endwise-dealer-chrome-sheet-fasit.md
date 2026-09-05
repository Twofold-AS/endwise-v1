# Dealer-chrome — Ronny-sheet (lås 2026-09-05)

Apple-tokens: parchment `#f5f5f7`, ink `#1d1d1f`, Action Blue `#0066cc`.

Kilde: Jonas/Mikael. Overstyrer eldre stripe/peek-IA (#130-era).

## Telefon (primær flate)

### Top-bar

1. **Logo midt** — kun merke (ink-maske på `logo.svg`), sentrert i baren (`absolute` midt). Ingen «Endwise»-ordmerke. Ink/svart, ikke grønn `#1ED27D`.
2. **Venstre** på undersider: kun tilbake-pil **med hale** (←-form, stroke 2). Ingen «Tilbake»-tekst. `aria-label="Tilbake"`. På hjem: tom / ingen pil.
3. **Høyre cluster** (ytterst → inn): sidebar-toggle ytterst høyre; **Ronny-avatar rett til venstre for toggle**.
4. Høyde: eksisterende `h-row` / shell-header + `safe-area-inset-top`. Én rad.

### Ronny

5. **Fjern Ronny-stripa helt** (ingen peek-dock, ingen Grainient-bunnstripe).
6. Trykk avatar → **sheet fra bunnen**, default **80 %** av synlig høyde (`dvh` / `visualViewport`, ikke rå `100vh` alene hvis tastatur).
7. Sheet-topp: `border-radius` **16** på topp-hjørner. Bakgrunn surface `#fff`. Parchment under scrim.
8. **Sheet-header** (én rad under drag-handle):
   - Venstre: **forstørr** → 100 % høyde (ikon, ikke tekst)
   - Midt: avatar + «Ronny»
   - Høyre: **X** lukk
9. **Drag-handle** over midten: ~36×5 capsule, muted. Swipe ned lukker; opp kan fullføre til 100 % hvis gest er tydelig — ellers kun forstørr-knapp til 100 %.
10. Scrim bak sheet. Safe-area nederst i composer.

### 80 % vs 100 %

- Default åpen: **80 %**
- Forstørr / maks: **100 %** (behold 16 radius til den treffer safe-top; ikke egen «app-vindu»-chrome)
- X og swipe-ned → lukket (0). Ingen tredje «peek»-høyde.

## Desktop

Desktop Ronny er **ikke** sheet. Se `docs/endwise-dealer-chrome-desktop-ronny-fasit.md`.

- **Persistent sidebar** (logo venstre). Avatar rett til venstre for sidebar-toggle i sidebar-header (`hidden md:inline-flex`).
- **Ingen** midt-logo-toppbar som erstatter sidebar.
- **Sheet kun på telefon** (`md:hidden` / phone shell). Ikke endre 80/100, radius 16, midt-logo, forstørr, handle.
- Høyre overlay-panel over main (max 400px), lett scrim, Escape/X. Ingen forstørr, ingen drag-handle, ingen stripe/peek, ingen midt-modal.

## Don't

- Ikke Ronny-stripe / peek-dock.
- Ikke «Tilbake»-tekst.
- Ikke grønn logo.
- Ikke Galaxy/Grainient på sheet-header.
- Ikke ny bunnbar.
- Ikke bytt marketing CTA.

## Do

- Tokens / UI-PAKKER Apple.
- `viewport-fit=cover` + safe-area.
- Hit targets ≥ 44 på avatar, X, forstørr, toggle.
- Egen sheet (vaul/shadcn Sheet er ikke hentet; samme mønster som eksisterende overlay).
- `TilbakePil` er stroke-2 pil med hale.
- Tester låser: ingen «Tilbake»-label i telefon-chrome; ingen stripe/peek; sheet-høyder kun 80/100.
