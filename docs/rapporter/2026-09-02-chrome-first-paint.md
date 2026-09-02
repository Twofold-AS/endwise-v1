# Rapport — chrome-first first-paint (sidebar-hang)

## 1. Hva er gjort

**F5-13 / F13-01 (chrome-first mot PgBouncer :6432)**

- Hypotesen stemte: `httpBatchLink` er all-or-nothing. Sidebaren (`itemsForRole`) er tom til `session.me` lander. Første maling batchet chrome sammen med lager/kunder/jobber/stream. `session.me` holdt i tillegg en `withTenant` åpen og ba om flere (verksteder via `Promise.all`) — det stjeler pool-slotter mot `max: 5`.
- `session.me` går på egen `httpLink`. Chrome (`forhandler.kort`, `helpdesk.ulesteAntall`, `billing.subscription`) er egen `httpBatchLink`. Sider (lager/kunder/jobber/stream) er en tredje.
- Dashboard monterer telefon-hjem **eller** desktop-verksted (ikke begge). LiveSync venter med `stream.*` til `session.me` har svart.
- Isolate-port: `TENANT_TX_CONCURRENCY = 2` på `withTenant` / platform-tx. Nøsting kaster (unngår deadlock). Kø-frist 5s. Per-request `TRPC_BATCH_CONCURRENCY = 2` på `protectedProcedure`.
- `requireSession` wrapper `getSession` i `medTidsfrist` (5000 ms, samme som `connectionTimeoutMillis` — ikke 0). Klient: `SESSION_ME_CLIENT_TIMEOUT_MS = 8000`. Chrome-feil viser «Kunne ikke laste menyen», ikke en tom ferdig sidebar.
- `prepare: false` og :6432 TLS-hopp urørt. Visuell IA og auth-låser urørt.

## 2. Hva gikk galt

Ingenting blokkerte implementasjonen. Lefthook `prepare` i dette miljøet feiler mot Cursor-hooks-path; tester kjøres via lokal vitest. GitHub CI på `main` er allerede rød (biome-format i `packages/ui`, `pnpm audit` browserslist, ZAP mot `example.invalid`) — ikke introdusert her.

## 3. Hvilke fikser ble gjort

- `packages/db/src/concurrency.ts` + port i `client.ts` (ikke-reentrant + kø-frist)
- `session.me` uten nøstet tenant-tx
- `httpLink` + `splitLink` i `providers.tsx`
- Viewport-montering på `/dashboard`
- Tidsfrist på sesjonsoppslag (server + klient) og fail-soft i sidebar

## 4. Neste fase / neste steg

Ikke merge. Verifiser innlogget mot preview/prod at dealer-shell viser nav uten å vente på lager/kunder/jobber, og at first-paint-nettverket er `session.me` alene + en liten chrome-batch.
