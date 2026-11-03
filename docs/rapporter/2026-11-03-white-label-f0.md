# Øktrapport 03.11.2026 — White label F0 (ADR + spike)

**Roadmap:** F16-01 · F16-02 · F16-03 · F16-04 (white label-planens F0)
**PR:** én PR fra `main`, ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F16-01 | ADR-005 på norsk: adresser, subdomene, innlogging, roller, 2FA, invitasjon, branding/GDPR, sesjon, admin. Mons' «Sikkerhetskrav (Mons)» står verbatim. |
| F16-02 | `opplosTenantFraHost` + reservert-liste. Proxy kaller den bare ved `ENDWISE_WHITE_LABEL_SPIKE=1`. Matcher/no-store uendret. |
| F16-03 | Migrasjon 0045: branding, domener, reserverte slugs, invitation_codes, member_permissions. RLS + skisse. |
| F16-04 | HMAC-hjelper for 6–8 tegns kode, forsøk, utløp, konstant-tid. |

Ingen atferdsendring for dagens `endwise.no`-brukere (flagg av).

## 2. Hva gikk galt

Alt gikk som planlagt i implementasjonen. Context7/Context.dev MCP krevde innlogging — dokumentasjon ble hentet via Vercel MCP (Next 16 `proxy.ts`) og eksisterende ADR-002.

## 3. Hvilke fikser ble gjort

Ingen produksjonsfikser. Spikene er additive.

## 4. Neste fase / neste steg

White label-planens **F1** (subdomene-regler, `reserver_slug`, migrasjonsrapport). Ikke start før Mikael merger F0 og Mons/Mikael har sagt OK til §3.11.
