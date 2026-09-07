# Rapport — Linear dark dealer-chrome + sidebar-align

**Dato:** 7. september 2026  
**Roadmap:** F0-11 (done, hex), F5-10 (progress), F5-13 (done, align)  
**Kilde:** Mikael Linear Style Reference / midnight precision instrument

## 1. Hva er gjort

- **F0-11:** Kanonisk Linear-palett (`--color-void` … `--color-lavender`) i `packages/widget-tokens/src/tokens.css`. `[data-theme="dark"]` remapmet til Void/Carbon/Obsidian + Acid Lime CTA (`#e4f222` / void-tekst). Lyst `--ew-*` beholdt for landing/widget.
- **F5-10:** Dealer/app-skall setter `data-theme="dark"` + `data-app-theme="linear"` på chrome-roten i `(app)/layout.tsx`. `<html>` forblir light så offentlig landing holder Apple `#0066cc`. App-knapper i dark: lime, 6px, ~10×16, Inter 14/510. Ghost: graphite-hårlinje + mist. Titler 590 / paper. Kort 12 / badge 4.
- **F5-13:** Sidebar-nav: ytre boks flush-right (275 i 389). Tekst venstre, ikon høyre, `justify-between` + `gap-3`. Aktiv rad: graphite-tint + 2px lime-hårlinje + lime-ikon. 3-kolonne-mål urørt. Ingen Handlinger, ingen desktop-toggle, Ronny i B3.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen blokkering. Disarto-ikonbytte er ikke med (parallell PR).

## 3. Fikser

- Sidebar-align: fjernet `md:text-right` og ikon-først; tekst+badge venstre, ikon høyre.
- Oppgrader-CTA er lime uten Galaxy-dekor; Enterprise-merke beholder Galaxy på carbon.
- Analyse-serier byttet fra Attio-hex til Linear støttende aksenter (ikke lime).
- Tester oppdatert / ny `linear-dark-chrome.test.ts`.

## 4. Neste fase / neste steg

F5-10 gjenstår fortsatt (AI Elements, slot-text, dock-container queries). Visuell QA av dealer-chrome i nettleser mot Linear Do/Don't: én lime-CTA per flate, hårlinjer, ingen dekorativ gradient på chrome.
