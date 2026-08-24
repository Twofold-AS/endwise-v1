# Rapport — 24.08.2026 — Vercel-region fra1 → cdg1 (Paris Static IP)

**Roadmap:** F0-07 (`planned`, region-pin oppdatert) · F1-07 (Static IP-egress, ingen token-endring)
**Godkjenning:** Mikael (eksplisitt: funksjoner i Paris slik at Quick-egress bruker `51.44.143.46` / AWS cdg1; andre Static IP-regioner slått av)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F0-07** | Alle `vercel.json` som pinnet Frankfurt (`regions: ["fra1"]`) pinner nå Paris: `regions: ["cdg1"]`. Filer: `apps/web/vercel.json`, `apps/api/vercel.json`, `apps/stream/vercel.json`. Cron-stier urørt. |
| **F1-07** | Next.js `preferredRegion` på ruter/layouts endret fra `fra1` til `cdg1`, ellers ville App Router overstyrt `vercel.json` og funksjonene blitt i Frankfurt. Quick-token-håndtering urørt. |

Kanoniske docs (techstack, deploy-plan, arkitektur, GDPR-veikart, roadmap F0-07/F1-07/F14-17) sier nå cdg1. Historiske rapporter er ikke omskrevet.

## 2. Hva gikk galt

Alt gikk som planlagt. Ingen blokkering.

## 3. Hvilke fikser ble gjort

Ingen. Ren region-pin.

## 4. Neste fase / neste steg

F0-07 er fortsatt `planned` (selve Vercel-prosjektene / miljøene). Etter merge: deploy slik at Quick-egress kommer fra `51.44.143.46`. Ikke merge uten eiers OK.
