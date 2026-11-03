# Øktrapport 03.11.2026 — White label F1 (subdomene-regler)

**Roadmap:** F17-01 (white label-planens F1)
**PR:** én PR, stacked på F0/main. Ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F17-01 | `@endwise/modules/slug`: 3–32, æøå, reservert-utkast, forslag ved kollisjon. `slug_ledig`/`reserver_slug` SECURITY DEFINER. `tenant_slug_history` + 30 min reservasjon. `tenants.slugLedig`/`reserverSlug` bak flagg, krever åpen eier-invitasjon. Ingen migrasjonsrapport (Mikael). Dagens `tenants.create` urørt. |

## 2. Hva gikk galt

Alt gikk som planlagt.

## 3. Hvilke fikser ble gjort

Ingen produksjonsfikser. Ny atferd bare når `ENDWISE_WHITE_LABEL=1`.

## 4. Neste fase / neste steg

White label-planens **F2** (vertsruting). Ikke merget.
