# Rapport — chrome-first first-paint (sidebar-hang)

## 1. Hva er gjort

**F5-13 / F13-01 (chrome-first mot PgBouncer :6432)**

- Hypotesen stemte: `httpBatchLink` er all-or-nothing. Sidebaren (`itemsForRole`) er tom til `session.me` lander. Første maling batchet chrome sammen med lager/kunder/jobber/stream. `session.me` holdt i tillegg en `withTenant` åpen og ba om flere (verksteder via `Promise.all`) — det stjeler pool-slotter mot `max: 5`.
- Chrome (`session.me`, `forhandler.kort`, `helpdesk.ulesteAntall`, `billing.subscription`) går i egen `httpBatchLink` via `splitLink`.
- Dashboard monterer telefon-hjem **eller** desktop-verksted (ikke begge). LiveSync venter med `stream.*` til `session.me` har svart.
- Isolate-port: `TENANT_TX_CONCURRENCY = 2` på `withTenant` / platform-tx. Per-request `TRPC_BATCH_CONCURRENCY = 2` på `protectedProcedure`.
- `requireSession` wrapper `getSession` i `medTidsfrist` (5000 ms, samme som `connectionTimeoutMillis` — ikke 0). Klient: `SESSION_ME_CLIENT_TIMEOUT_MS = 8000`.
- `prepare: false` og :6432 TLS-hopp urørt. Visuell IA og auth-låser urørt.

## 2. Hva gikk galt

Ingenting blokkerte implementasjonen. Lefthook `prepare` i dette miljøet feiler mot Cursor-hooks-path; tester kjøres via lokal vitest.

## 3. Hvilke fikser ble gjort

- `packages/db/src/concurrency.ts` + port i `client.ts`
- `session.me` uten nøstet tenant-tx
- `splitLink` i `providers.tsx`
- Viewport-montering på `/dashboard`
- Tidsfrist på sesjonsoppslag (server + klient)

## 4. Neste fase / neste steg

Merge etter review. Verifiser i prod at innlogget dealer-shell viser nav uten å vente på lager/kunder/jobber, og at first-paint-nettverket er den lille chrome-batchen.
