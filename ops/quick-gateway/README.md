# Quick live-gateway (tynn HTTPS-videresending)

Tynn HTTPS-tjeneste på Scaleway-boksen slik at Vercel kan nå Quick ApiV2 mens Yamaha har IP-lås **og** CONNECT-stien gir Quick HTTP 500.

**Ikke** CONNECT-proxy (`ops/quick-connect-proxy`). **Ikke** dump-VM `51.15.245.52`. **Ikke** PR #28 (nettleser-probe).

**Av = fjern `QUICK_GATEWAY_URL` i Vercel** — appen går da direkte (eller via valgfri CONNECT hvis den env-en er satt).

Ny boks: Ubuntu 24.04, Scaleway DEV1-S PAR1. SSH-nøkkel: `endwise_scw`.

Gateway er **ikke** et andresystem: den streamer Quick-svaret tilbake. Endwise skriver kunder/deler/lager til eksisterende Postgres som i dag. Ingen JSON-dump, ingen cron-scrape, ingen token-lager på boksen.

## Mons-krav (Sikkerhetssjef, 26.08.2026)

1. Auth Endwise→gateway: delt secret og/eller mTLS. **Ikke** Vercel-IP-only (CWE-290).
2. Gateway kaller **kun** `q3.quick.no:443` og en fast allowlist av Quick-stier (`client/info`, `customer/batch`, `item/batch`, `stockentry/batch`). Ingen vilkårlig URL (CWE-441/918).
3. Forhandlerens Quick-token er **per request** fra Endwise (header). **Aldri** skrevet til disk på boksen (CWE-922). Kun prosessminne, droppes etter kallet.
4. Ingen request/response-body eller header-logg (CWE-532). Statuskode + varighet er OK.
5. Stream/returner Quick-svar til Endwise. Ingen andresystem, ingen JSON-dump, ingen cron-scrape, ingen token-lager.
6. SSH/22 kun fra operator-IP (`SSH_ALLOW_FROM` — variabel, ikke `0.0.0.0/0`). Gateway-port kan være offentlig; auth er secret.
7. systemd-herding **uten** `MemoryDenyWriteExecute` (den krasjet Node på denne boksen).

## Allowlist

`GET /{instans}/api/v2/client/info`  
`GET /{instans}/api/v2/customer/batch`  
`GET /{instans}/api/v2/item/batch`  
`GET /{instans}/api/v2/stockentry/batch`

Instans = ett segment (`Test_Public`, `ProdShared008`). Alt annet → 403, ingen utgående kall.

## Installasjon

```bash
ssh -i ~/.ssh/endwise_scw root@<boks-ip>
# kopier denne mappa, deretter:
cp quick-gateway.env.example quick-gateway.env
# sett GATEWAY_SECRET (openssl rand -base64 32) og SSH_ALLOW_FROM=<operator-ipv4>/32
sudo ./install.sh ./quick-gateway.env
```

`install.sh` lager et selvsignert sertifikat hvis `TLS_CERT_PATH` / `TLS_KEY_PATH` mangler. Bytt til ekte sertifikat når `api.endwise.no` finnes — DNS er senere; bind/host holder nå.

Valgfri mTLS: sett `TLS_CLIENT_CA_PATH` til CA som utsteder Endwise-klientsertifikatet. Delt secret er påkrevd uansett.

I Vercel (kun server, aldri `NEXT_PUBLIC_`):

```
QUICK_GATEWAY_URL=https://<boks-host-eller-ip>:8443
QUICK_GATEWAY_SECRET=<samme som GATEWAY_SECRET på boksen>
```

La `QUICK_HTTPS_PROXY` være uset mens denne stien er på.

Ingen ekte host, passord eller Quick-token i git.
