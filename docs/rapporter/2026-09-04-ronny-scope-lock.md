# Rapport — KI-Ronny hard scope (ikke jailbreak / off-topic)

**Dato:** 04.09.2026 · draft PR #122 · ikke merge

## 1. Hva er gjort (per roadmap-ID)

- **F6-14:** Tema-gate for KI-Ronny. Defense in depth: systemprompt + inn/ut-policy + tool-allowlist. Gaten sitter på `workshopAgent` (`preflight`, `toolAllowlist`, `rewriteOutput`) og håndheves i `runAgent` / `runAgentWithTools` / `spawn` / `streamAgentChat`. Off-topic og jailbreak nektes før Mistral på både `/chat/workshop` og `agent.run`.
- **F6-14:** `systemExtra` / `side.*` wrappes som `<klient_kontekst>`-DATA i runtimen. Klientfelt er aldri rå instruksjon.
- **F5-13 / F5-10:** Ingen chrome/UI-endring. Mistral EU urørt. Live tools uendret. Parkerte skriv uendret. Ingen FORCE RLS / DB.

## 2. Hva gikk galt

Første leveranse la gaten bare på chat-ruta. `agent.run` → `runAgent` omgikk den. `side.*` ble limt inn i systemprompten som prosa.

## 3. Hvilke fikser ble gjort

Agent-erklærte sperrer i runtimen (ikke Ronny-if i master-løkka). `pakkKlientKontekstSomData` + `pakkSideSomData`. Tester for `runAgent`/workshop + side-DATA-wrap.

## 4. Residualer (ikke merge-blokkere)

- **Regex false negatives:** trivia uten nøkkelord kan nå modellen; output-policy er baknettet, ikke en klassifikator.
- **Verktøy før output-filter:** tillatte spørsmål kan kalle tools før rewrite. Jailbreak/off-topic treffer preflight og kaller ikke Mistral. L2/L3/allowlist gjelder uansett.
- **gaaTil UUID:** format-hviteliste, ikke oppslag i tenanten. Klienten åpner stien; RLS skjuler andre tenants.
- **Parkerte skriv:** `opprettBooking` / `sokJobber` / `aapneInnboks` returnerer fortsatt `{ status: 'kommer' }`.

## 5. Neste fase / neste steg

Samme draft PR #122. Mons re-check. Ikke merge.
