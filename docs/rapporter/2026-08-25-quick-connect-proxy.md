# Øktrapport 25.08.2026 — F1-07 valgfri CONNECT-proxy for Quick

## Hva er gjort (F1-07 / F8-01)

- Server-side Quick-klient (`toolkit-quick` probe + `customer`/`item`/`stockentry`-fetch) respekterer **valgfri** `QUICK_HTTPS_PROXY` (`http://user:secret@host:port`).
- Uset/tom = dagens direkte `fetch`. Satt = undici `ProxyAgent` (HTTP CONNECT). TLS til `q3.quick.no` er ende-til-ende. Ikke global `HTTPS_PROXY`.
- `ops/quick-connect-proxy/`: CONNECT-only Node-proxy, Basic-auth, dest-lås `q3.quick.no:443`, systemd + `install.sh` for Ubuntu 24.04 DEV1-S PAR1. SSH-kilde er variabel (`SSH_ALLOW_FROM`), nøkkelnavn `endwise_scw` i kommentarer.
- Tester uten live Quick: uset = ingen ProxyAgent; satt = CONNECT mot lokal mock. Proxy: 407/403/405/200 + access-log uten secret/path.

## Hva gikk galt

PR #28 er ikke rørt. Ingen DB-migrasjon. Ingen TLS-terminering. Ingen Quick-token på proxy-boksen.

Security-gate i CI (pnpm audit + ZAP mot `example.invalid`) er rød på **main fra før** — ikke introdusert her. Direkte `undici` er bumpet til 7.29.0 (GHSA-4cwx-7wf7-3272). Lint/typecheck/test-jobben er grønn.

## Fikser

- `ProxyAgent.close()` i tester ga `UND_ERR_DESTROYED` — close svelges etter at cachen er tømt.
- 200-CONNECT-testen bruker lokal TCP-dummy som upstream, ikke live Quick.

## Neste steg

- **Ikke merge** før Yamaha/ops har en boks og secret. Deretter sett `QUICK_HTTPS_PROXY` i Vercel.
- **Av = fjern `QUICK_HTTPS_PROXY` i Vercel** når IP-låsen er borte.
- F1-07/F8-01 forblir `progress` (mekanikere på tvers, booking/PUSH gjenstår).
