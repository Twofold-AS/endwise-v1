# Øktrapport 27.08.2026 — F0-15 pnpm audit high/critical

## 1. Hva er gjort (F0-15)

CI på main falt på `pnpm audit --audit-level high` (36 funn, 1 critical + 20 high).

- **better-auth runtime** i `packages/auth` og `apps/web`: `^1.6.23` → `~1.6.30`.
- **CLI:** `@better-auth/cli@1.4.21` erstattet med etterfølgeren `auth@~1.6.30` (samme Better Auth-CLI, ny pakkenavn). `@better-auth/cli@1.6.22` finnes ikke på npm; 1.4.x pinner `better-auth@1.4.21`. `auth@1.6.30` avhenger av `better-auth@1.6.30` — ekte bump, ikke override.
- Tre har nå **én** `better-auth@1.6.30` (runtime + CLI-nest).
- Transitive highs som foreldre ikke har sluppet: overrides i `pnpm-workspace.yaml` (pnpm 11 leser dem der, ikke i `package.json`). Ingen `auditConfig.ignoreCves`, ingen audit-level-senking.
- Auth-kallsteder uendret. Typecheck `@endwise/auth` / `@endwise/web` / `@endwise/api` grønt. Auth-tester: 104 passert, 28 hoppet over.

`pnpm audit --audit-level high` avslutter 0. Igjen: 1 low + 5 moderate.

## 2. Hva gikk galt

Alt gikk som planlagt etter at CLI-navnet var avklart. `@better-auth/cli` har ingen 1.6.x (latest=1.4.21). Version-selektorer `pakke@5` traff ikke 5.x — byttet til `pakke@^5.0.0`. `lefthook install` i `prepare` feiler i dette miljøet pga. `core.hooksPath`; `pnpm install --ignore-scripts` fullførte lockfila. Ingen produktfelt, priser, SMS, shop, sidebar eller Quick rørt. PR #28 ikke gjeninnført.

## 3. Fikser

| Advisory | Lukket med |
|---|---|
| GHSA-pw9m-5jxm-xr6h critical (OAuth refresh replay / oidc+mcp) | better-auth **1.6.30** runtime + CLI-nest |
| GHSA-9h47-pqcx-hjr4 high (oidc alg=none / plain PKCE) | same |
| GHSA-86j7-9j95-vpqj high (XSS `javascript:` redirect_uri, ≥1.6.13) | same |
| GHSA-7w99-5wm4-3g79 high (concurrent auth-code) | same |
| GHSA-392p-2q2v-4372 high (refresh-token family fork) | same |
| GHSA-g38m-r43w-p2q7 high (OAuth auto-link unverified email) | same |
| GHSA-fmh4-wcc4-5jm3 high (unverified invitation) | same |
| GHSA-qq9h-g4jm-xgf3 high (pre-account hijack magic-link/OTP, ≥1.6.22) | same — **ikke** bare CLI-nest |
| GHSA-r5fr-rjxr-66jc high (lodash ≤4.17.23) | override `lodash@4.18.1` (4.17.24 er ikke publisert) |
| GHSA-v2hh-gcrm-f6hx, GHSA-7p8r-x3mc-p8w7 high (fast-uri) | override `fast-uri@3.1.6` |
| GHSA-f88m-g3jw-g9cj high (sharp <0.35) | override `sharp>=0.35.0` → 0.35.4 |
| GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 high (postcss) | override `postcss>=8.5.18` → 8.5.19 |
| GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 high (brace-expansion) | override 2.1.4 og 5.0.9 |
| GHSA-4cwx-7wf7-3272 high (undici) | override `undici@^7.29.0` → 7.29.0 |
| GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8 high (nanoid) | override 3.3.18 og 5.1.16 |

## 4. Neste steg

- F0-15 forblir `progress` (ZAP mot ekte preview, OWASP Dependency-Check, pentest).
- Ikke merge før CI er grønn. Ikke rør Docker/ZAP.
