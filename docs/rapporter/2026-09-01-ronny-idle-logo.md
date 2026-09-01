# Rapport — Ronny idle-syklus, rotateY og logo-lås (01.09.2026)

## 1. Hva er gjort

- **F5-13 / F5-01:** Ingen blink på Ronny eller teksten. «La KI-Ronny ta styringen» er statisk. Idle-syklus hvert 5. sekund over seks vendor-bloub-uttrykk: `colere`, `surpris`, `wink` (blunk), `curieux`, `attentif`, `heureux`.
- **F5-13:** Klikk spinner horisontalt (`rotateY(360deg)`) med perspektiv så ryggen synes, deretter bunndock. Ingen `rotateX` / flip over hodet. Surpris-øyne beholdt på klikk.
- **F5-13:** Logo i lukket toppbar og åpen overlay deler `SHELL_HEADER_RAD` (`h-row` + `px-3`) og `SHELL_LOGO_WRAP`. Samme 18px, samme venstre-innfelt, samme vertikale sentrering. Overlay-header uten `py-2` / `px-1`.

## 2. Hva gikk galt

Alt gikk som planlagt. Innlogget nettleser-preview kan ikke verifiseres her (ingen sesjon).

## 3. Hvilke fikser ble gjort

Ingen ekstra feilretting utover follow-upen.

## 4. Neste fase / neste steg

Mikael ser preview på PR #105 (`/dashboard`). Ikke merge.
