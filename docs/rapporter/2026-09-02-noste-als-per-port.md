# Rapport — nøste-ALS per concurrency-port

## 1. Hva er gjort

**F5-13 / F13-01 (chrome-first leftover: falsk 500 på session.me)**

- Verifisert: `packages/db/src/concurrency.ts` hadde modul-global `AsyncLocalStorage` (`inneIGate`) delt av alle `createConcurrencyGate()`-instanser.
- PR #112 innførte to porter: isolate-`tenantTxGate` (`withTenant` / `withPlatform*`) og per-request `limitBatch` (`createConcurrencyGate(TRPC_BATCH_CONCURRENCY)` i `createRequestContext`).
- `protectedProcedure` kjører `limitBatch(neste)` → batch-portens `run()` satte den delte ALS. Resolver kalte `withTenant` → `tenantTxGate.run()` så `inneIGate.getStore()` og kastet `withTenant/withPlatform* kan ikke nøstes`. Intern 500, ikke ekte nøstet transaksjon. Matcher prod: `/trpc/session.me` 500, `/trpc/forhandler.kort` 500, chrome/page-batch 500, `/api/auth/get-session` 200.
- Fiks: ALS eies av hver `createConcurrencyGate`-instans. Batch-port rundt tenant-tx-port er tillatt. Ekte `tenantTxGate` i `tenantTxGate` kaster fortsatt. Kø-frist 5s urørt.
- Chrome-first beholdt: `session.me` på egen httpLink, dashboard phone-or-desktop, `connectionTimeoutMillis` 5000, `prepare:false`, :6432 TLS-hopp. Ingen visuell IA- eller auth-låsendring.

## 2. Hva gikk galt

Rotårsaken i #112 var riktig merket. Ingenting blokkerte fiksen. Lefthook `prepare` i dette miljøet feiler mot Cursor-hooks-path; tester kjøres via lokal vitest.

## 3. Hvilke fikser ble gjort

- `packages/db/src/concurrency.ts`: `new AsyncLocalStorage` flyttet inn i `createConcurrencyGate` (per instans).
- `packages/db/test/concurrency.test.ts`: (a) batch-gate rundt `tenantTxGate` lykkes; (b) `tenantTxGate` rundt `tenantTxGate` kaster; (c) kø-frist 5s.
- Roadmap F5-13 / F13-01 oppdatert.

## 4. Neste fase / neste steg

PR: https://github.com/Twofold-AS/endwise-v1/pull/113 — ikke merge.

Etter deploy: innlogget `session.me` skal ikke kaste nøste-feilen bare fordi den kjørte inne i `limitBatch`. Sidebar skal vise meny (ikke tom + «Prøv å oppdatere») så lenge sesjonen er gyldig.
