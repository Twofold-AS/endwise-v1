# Øktrapport 03.11.2026 — White label F0 (ADR + spike)

**Roadmap:** F16-01 · F16-02 · F16-03 · F16-04 (white label-planens F0)
**PR:** én PR fra `main`, ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F16-01 | ADR-005 på norsk: adresser, subdomene, innlogging, roller, 2FA, invitasjon, branding/GDPR, sesjon, admin. Mons' «Sikkerhetskrav (Mons)» står verbatim. **Godkjent av Mikael 2026-11-03** (Mons §3.11 formelt OK). |
| F16-02 | `opplosTenantFraHost` + reservert-liste. Proxy kaller den bare ved `ENDWISE_WHITE_LABEL_SPIKE=1`. Matcher/no-store uendret. |
| F16-03 | Migrasjon 0045: branding, domener, reserverte slugs, invitation_codes, member_permissions. RLS + skisse. |
| F16-04 | HMAC-hjelper for 6–8 tegns kode, forsøk, utløp, konstant-tid. |

Ingen atferdsendring for dagens `endwise.no`-brukere (flagg av).

## 2. Hva gikk galt

Alt gikk som planlagt i implementasjonen. Context7/Context.dev MCP krevde innlogging — dokumentasjon ble hentet via Vercel MCP (Next 16 `proxy.ts`) og eksisterende ADR-002.

## 3. Hvilke fikser ble gjort

Ingen produksjonsfikser. Spikene er additive.

## 4. Neste fase / neste steg

Mikael lukket F0-spørsmålene 2026-11-03. **F1 er ikke startet.** PR #185 merges ikke i denne økten.

Beslutninger: Mons §3.11 godkjent; eksisterende forhandlere slettes (ingen daglig-leder-migrasjon, fresh start via invite); reservert-liste forblir utkast; avsender `Endwise <noreply@endwise.no>`; DNS blir der den er (`_acme-challenge` / CNAME); IP-allowlist utsatt.
