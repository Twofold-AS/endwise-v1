# Rapport — KI-Ronny hard scope (ikke jailbreak / off-topic)

**Dato:** 04.09.2026 · draft PR · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F6-14:** Tema-gate for KI-Ronny. Defense in depth: systemprompt (`workshop/instructions.md`) + deterministisk inn/ut-policy (`scope-lock.ts`) + tool-allowlist. Off-topic og jailbreak nektes i `/chat/workshop` før Mistral kalles. Output-policy skriver om lekkasje, rollebytte og diktede tall uten verktøykall. L1 rammer nå også `parts`-array og DAN-mønstre.
- **F5-13 / F5-10:** Ingen chrome/UI-endring. Ronny forblir Mistral EU (`tenant_operational` → `resolveModelProvider`). Live tools uendret. Parkerte skriv uendret. Ingen FORCE RLS / DB.

## 2. Hva gikk galt

Alt gikk som planlagt. Chat-inngangen (`streamAgentChat`) kalte ikke `filterInput` fra før — L1 ligger nå i chat-ruta, i tillegg til Ronny-preflight.

## 3. Hvilke fikser ble gjort

Hard nekt uten modell for off-topic/jailbreak. Allowlist stripper ukjente verktøy. Tester for off-topic, jailbreak, tool-påkrevd booking-spørsmål og tillatte Endwise booking/del-spørsmål.

## 4. Neste fase / neste steg

Samme draft PR. Ikke merge.
