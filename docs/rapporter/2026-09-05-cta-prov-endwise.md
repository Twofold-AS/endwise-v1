# Rapport — 05.09.2026 — CTA «Prøv Endwise» på `/` (F5-35)

**Roadmap:** F5-35 (`done`)  
**Godkjenning:** Jonas-fasit + Mikael: primær CTA «Prøv Endwise». H1 «Verkstedet, samlet.» urørt.

## 1. Hva er gjort

Jonas NO-GO: live preview viste «Book demo» (første commit `BookDemoLenke`). Kilden på branchen var allerede byttet; denne runden:

- Bekreftet merge mot `origin/main` (`1f5c5e1`, #130 + #128) — branchen er 3 commits foran, 0 bak.
- Fjernet «Book demo» / `BookDemo` / `book-demo` fra markedskilden som rendres på `/`.
- Tester feiler nå hvis noen av de strengene finnes i `_markeds/` eller offentlige sider.
- Primær CTA er `CTA_PRIMAR_TEKST = 'Prøv Endwise'` på nav, hero og bunn. Priskort: «Ta kontakt». `mailto:hei@endwise.no` uendret.

## 2. Hva gikk galt

Første landing-commit (`320fefc`) eksporterte `BookDemoLenke` med default «Book demo». Mikael-låsen kom i `b649fd7`, men preview/grep kunne fortsatt treffe den gamle komponenten. Alt annet gikk som planlagt.

## 3. Fikser

`PrimarCtaLenke` + `data-markeds-cta="prov-endwise"`. Testen `null Book demo / BookDemo / book-demo i markedskilden` skanner hele `_markeds/` + `/` og juridiske sider.

## 4. Neste

Mikael squash-merger #129 når GitHub er MERGEABLE. Ikke merget her.
