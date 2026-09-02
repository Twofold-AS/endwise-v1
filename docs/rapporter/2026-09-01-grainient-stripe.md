# Rapport — Grainient 32px bot-stripe (01.09.2026 kveld)

## Hva er gjort

- **F5-10 / F5-13:** Workshop-stripen er Grainient, maks 32px, full bredde. ShaderGradient og r3f/three er fjernet. Hvit forklaringstekst. Hvit bloub ytterst til høyre uten sirkel/chip (`color="#ffffff"`, `paper="#111111"` så øynene leses).
- **F5-13:** Sidebar-logo 18px. Forhandlernavn borte fra header. Innstillinger-rad og bunn-divider borte. Gjelder også telefon-overlay.

## Hva gikk galt

- Forrige follow-up (bytt til Grainient) var ikke landet i treet — ShaderGradient sto fortsatt. Gjenopprettet Grainient fra git og fjernet ShaderGradient i samme runde.

## Fikser

- Øyne: hvit kropp + mørkt paper, ikke staff ColorId.

## Neste steg

- Preview på #105. Ikke merge. Ikke ping Jonas.
