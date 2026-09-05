# Rapport — Mistral 429 (kode 1300) vs Ronny #122

**Dato:** 05.09.2026 · draft PR (ikke merge)

## 1. Hva er gjort (per roadmap-ID)

- **F6-14:** Undersøkt om KI-Ronny scope-lock (#122) øker Mistral-kall nok til vedvarende `429 Rate limit exceeded` (kode 1300) i 2+ dager.
- **F6-14 / LLM10:** `maxRetries: 0` på begge `streamText`-innganger (`runAgent`, `streamAgentChat`). AI SDK-default var 2 (= 3 HTTP-forsøk per tool-steg).
- **F5-10:** Ronny-UI oversetter 429/1300 til ærlig norsk («opptatt / vent»), ikke rå SDK-tekst.

## 2. Hva gikk galt

Ingenting i implementasjonen. Funnet er at **#122 ikke er årsaken** til fler-dagers 429.

## 3. Hvilke fikser ble gjort

`MODELL_MAX_RETRIES = 0` i `@endwise/agent-runtime`. Tester låser at begge kallsteder sender verdien til `streamText`.

## 4. Funn (undersøkelsen)

### 1) Workshop-sti: preflight kaller ikke Mistral

`vurderRonnyInn` kjører i `/chat/workshop`, `streamAgentChat` og `runAgent` **før** `streamText`. Jailbreak/off-topic returnerer fast nektetekst uten modell-tokens (bekreftet i `ronny-scope-lock.test.ts`).

`filterInput` (L1) er regex, ikke Mistral-moderasjon. Scope-gate / `createMistralModerator` sitter bare på **widget**-chat (kunde), ikke Ronny.

Residual fra #122: trivia uten nøkkelord kan fortsatt nå modellen; da er output-policy baknettet *etter* ett kall.

### 2) `maxRetries` ga 3× på hver 429

`streamText` i AI SDK 7 (`ai@7.0.64`) defaulter til `maxRetries: 2`. Hvert tool-steg er et eget HTTP-kall med egne retries. Ved 429: opptil **3 forsøk × inntil 5 steg = 15** kall per brukermelding. SDK-en respekterer `Retry-After` bare hvis 0–60 s; lengre vent blir eksponentiell backoff og treffer kvoten igjen.

### 3) Streaming + tools multipliserer ikke RPM mot *før* #122

Workshop brukte allerede `streamAgentChat` + `stopWhen: isStepCount(5)` + live tools. Streaming er ett HTTP-kall per steg, samme som `generateText`. #122 la til «foretrekk verktøy» i systemprompten — typisk **1 → 2** modellkall på data-spørsmål (kall + oppsummering), ikke en ny løkke. Off-topic/jailbreak **færre** kall enn før.

### 4) Hva som faktisk kan holde 429 i 2+ dager

Mistral 1300 er **org-kvote** (RPS, tokens/minutt *eller* tokens/måned). RPS/TPM resettes på sekunder/minutter. **Fler-dagers** 429 matcher månedstak / Free-mode / feil nøkkeltype (Vibe-plan), ikke et #122-burst.

Sterkere volum-skifte enn #122: **02.09.2026 — Mistral overalt** (Ronny + kunde + diagnose på samme nøkkel). Widget kaller moderasjon + chat. `/chat/workshop` har **ingen** app-rate-limit (widget har 20/5 min). Token-tak per tenant (F6-04) er ikke bygd.

## 5. Neste fase / neste steg

- Draft PR: `maxRetries: 0`. Ikke merge.
- Sjekk Mistral Admin → Limits (plan, månedstak, hvilken nøkkel prod bruker).
- Ikke bytt modell i kode (workshop er allerede `role: 'fast'` / `MISTRAL_MODEL_FAST`).
- Eventuelt senere: rate-limit på `/chat/workshop` (produktvalg, ikke denne PR-en).
