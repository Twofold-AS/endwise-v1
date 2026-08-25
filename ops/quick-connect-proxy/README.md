# Quick CONNECT-proxy (midlertidig egress)

Tynn HTTP CONNECT-proxy slik at Vercel kan nå Quick ApiV2 mens Yamaha har IP-lås.
**Av = fjern `QUICK_HTTPS_PROXY` i Vercel** — appen går da direkte, som i dag.

Dette er **ikke** den gamle dump-VM-en (`51.15.245.52`) og **ikke** JSON-synk.
Ny boks: Ubuntu 24.04, Scaleway DEV1-S PAR1. SSH-nøkkel: `endwise_scw`.

## Mons-krav (Sikkerhetssjef, 25.08.2026)

1. Auth på CONNECT: delt secret (`Proxy-Authorization` Basic). **Ikke** Vercel-IP-only (CWE-290).
2. CONNECT **kun** til `q3.quick.no:443`. Alt annet avvises (CWE-441/918).
3. Ingen TLS-terminering, ingen dekrypt, ingen disk-dump av JSON/PII, ingen `QUICK_TOKEN` på boksen.
4. Ingen body-/header-logg (CWE-532). Access-log: timestamp, CONNECT-host, status.
5. SSH/22 kun fra operator-IP (`SSH_ALLOW_FROM` i env — variabel, ikke hardkodet IPv4). CONNECT-port kan være offentlig; auth er secret.
6. systemd + `install.sh` for Ubuntu 24.04.

## Installasjon

```bash
ssh -i ~/.ssh/endwise_scw root@<boks-ip>
# kopier denne mappa, deretter:
cp quick-connect-proxy.env.example quick-connect-proxy.env
# sett PROXY_SECRET (openssl rand -base64 32) og SSH_ALLOW_FROM=<operator-ipv4>/32
sudo ./install.sh ./quick-connect-proxy.env
```

I Vercel (kun server, aldri `NEXT_PUBLIC_`):

```
QUICK_HTTPS_PROXY=http://endwise:<secret>@<boks-ip>:3128
```

Ingen ekte host, passord eller Quick-token i git.
