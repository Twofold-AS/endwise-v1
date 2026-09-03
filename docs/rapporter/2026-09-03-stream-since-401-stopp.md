# Rapport — stream.since 401-løkke

**Dato:** 03.09.2026 · F6-02 / F13-03 · `cursor/stream-poll-401-stop-7b3f`

## 1. Hva er gjort (per roadmap-ID)

- **F6-02 / F13-03:** LiveSync (`apps/web/app/(app)/_lib/live-sync.tsx`) starter ikke `stream.head` / `stream.since` (og åpner ikke SSE) uten *både* Better-Auth-sesjon og `session.me.tenantId`.
- 401 / `UNAUTHORIZED` / «Du er ikke innlogget.» fra `stream.head` eller `stream.since` setter `stoppet`: `enabled: false`, `refetchInterval: false`, ingen window-focus / reconnect. Polleren invaliderer ikke appen og sender ikke til `/signin`.
- Hjelpere i `live-event.ts` (`kanPolleStreamSince`, `kanHenteStreamHead`, `erStreamUautorisert`, `streamPollIntervalMs`) er enhetstestet. Kilde-låser i `live-ui` / `chrome-first-paint` oppdatert.
- Auth-protokoll, RLS og `protectedProcedure` er urørt. Ingen 24/7-polling av fulle lister.

## 2. Hva gikk galt

Alt gikk som planlagt etter TDD (rød test for manglende hjelpere / gammel `harSesjon && chromeKlar`-gate → grønn).

Rotårsak: #111 (`3fdc444`) stoppet poll bare når `useSession` manglet bruker. I prod er Mikael innlogget (`session.me` 200), men `stream.since` kan likevel 401 (`!userId || !tenantId || !role` i `protectedProcedure`). `retry: false` hindrer umiddelbar retry, men `refetchInterval` (8 s når SSE ikke er live) fortsatte. Det stablet kall mot PgBouncer og frøs siden.

## 3. Hvilke fikser ble gjort

TenantId fra `session.me` er bryteren for å *starte* poll. Første 401 på head/since er bryteren for å *stoppe*. `refetchInterval` er en funksjon som leser query-feilen, så intervallet dør også før React-state rekker å oppdatere.

## 4. Neste fase / neste steg

Draft PR. Ikke merge. Etter deploy: `GET /trpc/stream.since` skal ikke kunne fyre hvert 8. s etter 401. Verksted forblir refetch-on-enter; innboks/pakker bare invalidate.
