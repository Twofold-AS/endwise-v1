# Rapport — 05.09.2026 — Ronny uttrykk-only + fast telefon-chrome (F5-10 / F5-13)

**Roadmap:** F5-10 (`progress`), F5-13 (`done` — chrome-polering på ferdig skall)

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| **F5-13** | PhoneShell er `fixed inset-x-0 top-0 z-[60]`. In-flow spacer holder innhold under baren. Åpen telefon-sidebar starter under `h-row` (`top-[calc(env(safe-area-inset-top)+var(--ew-row-h))]`). Sidebar-header (`SidebarHeader` / venstre merke) er `hidden md:flex`. Merke forblir `absolute` midt; Ronny\|toggle forblir i samme høyre cluster. Toggle veksler `PanelLeftOpen` / `PanelLeftClose`. |
| **F5-10** | Ronny-avatarer (toppbar, sheet-header, desktop overlay, `RonnyBot`) bytter bare ansikt/humør. `state` er alltid `'idle'`. ⛔ thinking. ⛔ alert/notify. Klikk-spinn = `rotateY` + `surpris`. «Ronny»-tittel / `sr-only` «Ronny tenker…» beholdt. PromptInputSubmit urørt. |

Beholdt: merke-only logo, tailed TilbakePil, sheet 80/100 r16, desktop overlay 400, Galaxy kun CTA + Enterprise-merke, ingen DestinasjonSeksjonBar i `(app)/layout`.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen ny UI-pakke. Åpen sidebar dekket tidligere hele viewport (`inset-0`) og viste venstre merke i overlay-headeren — det var ikonet som hoppet til venstre kant.

## 3. Fikser

- Fast toppbar over overlay (z-60 > z-50), ikke sticky inne i kolonnen.
- Telefon-sidebar uten egen header-chrome.
- Idle-syklus er `ExpressionId[]` / `{ expression }` — ikke Bloub-state-ikoner.

## 4. Neste steg

F5-10 forblir `progress`. Ikke redesign forhandler-hjem. Innboks-tråd-chrome (Tilbake/slett/inviter) står.
