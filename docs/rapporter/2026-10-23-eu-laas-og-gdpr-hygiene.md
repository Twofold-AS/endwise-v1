# Rapport — EU-lås og GDPR/AI-hygiene

## Hva er gjort (per roadmap-ID)

- **F14-02:** `assertEuEndpoint` er allowlist (`api.eu.mistral.ai`). `api.mistral.ai` og `api.us.mistral.ai` feiler ved oppstart. Region utledes fra URL. `tenant_operational = eu`.
- **F14-01:** Pseudonymisering utvidet (fnr, små bokstaver i regnr, kjente navn) og koblet inn i `streamAgentChat` / `runAgent` / `spawn`. Én kart-instans per kjøring deles med `wrapTools`. Maskeres før moderasjon. Widget cacher inntil 200 nyeste/aktive kundenavn.
- **F14-05:** Scope-gate på `/chat`, widget, `agent.run` og ai-diagnose. Moderasjonsfeil blokkerer.
- **F14-03:** `AI_LOG_RETENTION_DAYS` (default og tak 7) for `stream_events` (maskert tekst). AI-audit uten promptinnhold (rekursiv allowlist).
- **F0-14:** Guardrail-brudd skrives til `audit_log` i tillegg til `console.warn`.
- **F14-15 / F14-06:** Underdatabehandlerliste i kode uten Fireworks; Mistral merket EU-endepunkt.
- **F14-eval:** Ronny eval-sett i CI mot mock.

## Mistral EU — modeller og API-er

Vi bruker chat completions + function calling + `/chat/moderations`. Det er det regionale endepunktet støtter. **Agents API, Batch API og Files API brukes ikke** (og er ikke støttet på `api.eu.mistral.ai`).

Modell-ID-er kommer fra miljø (`MISTRAL_MODEL_*`). `.env.example` har `mistral-small-2603` og `mistral-moderation-2603`. Tilgjengelighet på EU-endepunktet varierer — Mikael bør kjøre `GET https://api.eu.mistral.ai/v1/models` med produksjonsnøkkelen og bekrefte at FAST/STANDARD/MODERATION finnes der.

## Åpne punkter (ikke i denne PR-en)

1. Mikael må selv sette/fjerne `MISTRAL_BASE_URL` i Vercel Production + Preview (skal være `https://api.eu.mistral.ai/v1` eller utelates — default er EU). En gammel verdi `https://api.mistral.ai/v1` vil nå **stoppe oppstart**.
2. Mikael må be Mistral om **skriftlig ZDR** (F14-11).
3. **DPIA gjenstår** (F14-14). Rolleavklaring, DPA-er og trening-av i Mistral-konsoll er juridiske (F14-07–10).
4. Sentry-DSN / F0-14 observabilitetskonto.
5. Security gate / ZAP er rød på main — ikke rørt her.

## Hva gikk galt

Ingenting blokkerende underveis. Context7 MCP var ikke tilgjengelig; Mistral-docs ble hentet fra docs.mistral.ai (regional inference).
