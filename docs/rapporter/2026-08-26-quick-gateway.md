# Øktrapport 26.08.2026 — F8-01 tynn live Quick-gateway (Mons GO)

## Hva er gjort (F1-07 / F8-01)

- Ny ops-tjeneste `ops/quick-gateway/`: HTTPS-lytter på Scaleway-boksen som videresender **kun** allowlistede GET-stier til `q3.quick.no:443` med per-request Quick-token.
- Auth Endwise→gateway: delt `GATEWAY_SECRET` (`X-Endwise-Gateway-Secret` eller Bearer). Valgfri mTLS via `TLS_CLIENT_CA_PATH`. Ikke Vercel-IP (CWE-290).
- systemd-herding uten `MemoryDenyWriteExecute` (den krasjet Node på boksen). SSH fortsatt kun fra `SSH_ALLOW_FROM` (ikke `0.0.0.0/0`).
- Endwise Quick-klient: når `QUICK_GATEWAY_URL` + `QUICK_GATEWAY_SECRET` er satt, sendes dealer-token til gatewayen. Probe/`setConfig`/`customer|item|stockentry`-fetch bruker svaret som et direkte Quick-kall. Uset = av. CONNECT (`QUICK_HTTPS_PROXY`) ignoreres når gateway er på.
- Tester: path-allowlist 403, token ikke til disk, logg uten body/headers, 401 uten secret, happy-path med mocket Quick.

## Hva gikk galt

Alt gikk som planlagt. PR #28 er ikke rørt. CONNECT-proxyen er ikke fjernet. Ingen Stripe, invite-SQL, helpdesk #46 eller avatar-PR. Ingen hemmeligheter i git.

## Fikser

Ingen runtime-fikser utover testdekning av Mons-constraints.

## Neste steg

- **Ikke merge** før Yamaha/ops har boks, TLS og `GATEWAY_SECRET`. Deretter sett `QUICK_GATEWAY_URL` + `QUICK_GATEWAY_SECRET` i Vercel. La `QUICK_HTTPS_PROXY` være uset.
- `api.endwise.no` / Let's Encrypt kan komme senere — bind/host holder.
- F1-07/F8-01 forblir `progress` (mekanikere på tvers, booking/PUSH gjenstår).
