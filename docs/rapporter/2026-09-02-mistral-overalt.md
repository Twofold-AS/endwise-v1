# Rapport — Mistral overalt (Ronny + kunde)

**Dato:** 02.09.2026 Europe/Oslo · Mikael-lås på draft PR #106  
**Branch:** `cursor/ronny-dock-apple-f4f5` · **Ikke merge.** Ikke ping Jonas.

## 1. Hva er gjort (per roadmap-ID)

- **F6-04 / F14-02:** `resolveModelProvider` ruter **begge** dataklasser til Mistral EU. Intern (`tenant_operational`: Ronny/workshop, drift-innsikt) gikk tidligere til Fireworks. Det var prisvalg, ikke lovkrav.
- **F5-13:** Ronny-dock (tenking, se hele, overlay) er uendret. Ronny starter nå på samme Mistral-sti som kunde-agenter.
- **F14:** `assertEuEndpoint` og `spawnAgent`-nekting av `customer_freetext` mot ikke-EU står. US-endepunktet er fortsatt sperret.
- Katalog: `MISTRAL_MODEL_FAST` / `STANDARD` / `HARD` / `EMBED` / `REALTIME` / `MODERATION` fra miljø. I `.env.example`: `mistral-small-2603` for FAST og STANDARD, `mistral-moderation-2603` for MODERATION. Ingen gjettede ID-er i runtime.
- Prod uten `MISTRAL_API_KEY`: `MissingEuProviderError` for **begge** klasser — ingen Fireworks-fallback. Dev uten nøkkel: mock (som før).
- `@ai-sdk/fireworks` er ikke slettet (EU-tester bruker `createFireworksProvider`). Agent-runtime velger den ikke.
- ⛔ Vercel AI Gateway. ⛔ Mistral Agents API. Function calling via chat completions + våre tools.

### Filer som rutet intern → Fireworks (før)

| Fil | Rolle |
|---|---|
| `packages/providers/src/resolve.ts` | **Runtime-buggen.** `customer_freetext` → Mistral; ellers → `createFireworksProvider` |
| `packages/providers/test/data-region.test.ts` | Testet «driftsdata med Fireworks-nøkkel → Fireworks» |
| `packages/agents/src/drift-innsikt/agent.ts` | Kommentar: «Derfor kan den kjøre på Fireworks» |
| `packages/agents/src/workshop/agent.ts` | «Samme provider-sti som drift-innsikt» (arvet Fireworks) |
| `docs/endwise-techstack.md` §2 / §5 | «kundevendt → Mistral, internt → Fireworks» |
| `docs/UI-PAKKER.md` | Samme setning |
| `packages/modules/src/billing/katalog.ts` + `plans.ts` | Markedsføringstekst |
| `docs/arkitektur.md` | Intern → Fireworks |

Kallstedene (`apps/api` chat/workshop, widget, tRPC `agent.run`/`agent.list`) brukte allerede `resolveModelProvider(agent.dataClass)` — de fikk Fireworks fordi resolve valgte den.

### Hva som nå peker på Mistral

- `resolveModelProvider` → alltid `createMistralProvider` når `MISTRAL_API_KEY` finnes (begge `dataClass`).
- Ronny (`workshop`, `/chat/workshop`), drift-innsikt, kunde-support, ai-diagnose, widget: samme resolver.
- Techstack, UI-PAKKER, billing-katalog, arkitektur, GDPR-veikart (02.09-blokk), `.env.example`.

Ronny og kunde-agenter treffer **ikke** Fireworks via resolve. `spawnAgent` kan fortsatt *ta imot* en eksplisitt Fireworks-provider for intern data (region-tillatelse) — det er EU-vernets kontrast-test, ikke runtime-valget.

## 2. Hva gikk galt

Context7 MCP (`Context`) krevde auth i denne økta — ikke brukt. Mistral-provideren (`@ai-sdk/mistral`, EU-endepunkt) fantes allerede; ingen ny SDK. Ingen nøkler dumpet. Ingen `db:seed` / `db:setup`.

## 3. Hvilke fikser ble gjort

Tester i `packages/providers/test/data-region.test.ts`: intern + Mistral-nøkkel → `mistral`; intern i prod med bare Fireworks-nøkkel → `MissingEuProviderError`; dev uten nøkler → mock for begge.

## 4. Neste fase / neste steg

Mikael fyller `MISTRAL_API_KEY` + `MISTRAL_MODEL_*` i Vercel selv. Draft PR. Ikke merge.
