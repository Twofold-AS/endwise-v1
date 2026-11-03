# Øktrapport 03.11.2026 — White label F2 (vertsruting)

**Roadmap:** F18-01 (white label-planens F2)
**PR:** én PR, stacked på F1. Ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F18-01 | `proxy.ts` rewrite til `/_kunde/<slug>` og `/_plattform` bak `ENDWISE_WHITE_LABEL`. Ingen DB i proxy. `lookup_tenant_by_host` (offentlige felt). Nøytral 404. (app) krever Bedrift. Kundesider Hjem/bestill/min-side/logg-inn/velg. Platform-stub med noindex. |

## 2. Hva gikk galt

Alt gikk som planlagt.

## 3. Hvilke fikser ble gjort

Ingen produksjonsfikser. Ny atferd bare når `ENDWISE_WHITE_LABEL=1` (eller SPIKE).

## 4. Neste fase / neste steg

White label-planens **F3** (branding). Ikke merget.
