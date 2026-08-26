# Øktrapport 26.08.2026 — F8-01 curl-ekvivalent Quick-request (UA + HTTP/1.1)

## Hva er gjort (F8-01 / F1-07-probe)

- Live-funn: `curl` fra Scaleway-boksen mot `GET /ProdShared008/api/v2/client/info` gir HTTP 200; samme boks, samme sti og token via Node `fetch` ga HTTP 500. Ikke IP-allowlist.
- `ops/quick-gateway/gateway.mjs`: upstream matcher working curl — `User-Agent: curl/8.5.0`, `Authorization: Token token=…`, `Accept: application/json`, HTTP/1.1 via `https.request` (ingen undici-dep på boksen). Ingen ekstra headers.
- Endwise Quick-klient (`https-proxy.ts`, `client.ts`, `probe.ts`): samme form ved direkte kall og CONNECT (`undici.Agent` / `ProxyAgent` med `allowH2: false`). Gateway-stien sender fortsatt dealer-token (`Authorization: Token token=`) + `X-Endwise-Gateway-Secret`.
- Tester: 401 uten secret, 403 på ulovlig sti, 400 uten token; upstream-init har curl-UA og `allowH2: false`. Ingen kall mot live q3.quick.no.
- Gatewayen er ikke fjernet. PR #28 er ikke rørt.

## Hva gikk galt

Alt gikk som planlagt i denne økten. Context7 MCP var ikke autentisert; undici 7.29.0 `allowH2` er hentet fra offisiell type (`Client.Options`, default false — vi setter den eksplisitt).

## Fikser

Ingen runtime-fikser utover request-formen over. Mons-constraints uendret (ingen token/body/header-logg, token aldri på disk, allowlist urørt).

## Neste steg

- Deploy ny `gateway.mjs` på boksen og verifiser `client/info` via gateway (ikke merge før det er bekreftet live).
- Deretter valgfri Vercel-direkte-test med gateway-env uset — samme curl-form, rettferdig sammenligning.
- F8-01 forblir `progress` (booking/PUSH/kalender/DLQ gjenstår).
