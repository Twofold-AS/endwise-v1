# Arbeidsrapport — F0 Fundament

**Dato:** 13. juli 2026
**Fase:** F0 «Fundament» (Uke 1–3) — første ufullførte fase i roadmap
**Kilder:** `docs/endwise-roadmap.html` (`const ROADMAP`), `docs/endwise-techstack.md` v2.0

---

## 1. Hva er gjort

| ID | Punkt | Status | Leveranse |
|---|---|---|---|
| F0-01 | Turborepo + pnpm + Biome | **done** | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `tsconfig.base.json` (strict, 0 `any`), `lefthook.yml`, `docker-compose.yml` (pgvector/pg16, kun lokal dev) |
| F0-02 | Hono + tRPC v11-skjelett | **done** | `apps/api`: Hono for offentlig REST, tRPC v11 montert på `/trpc` via fetch-adapter, `publicProcedure`/`protectedProcedure`, delt `AppContext` |
| F0-03 | Neon + RLS + Drizzle | **progress** | `packages/db`: `drizzle.config.ts`, `rls.ts` (`tenantPolicy`, `app.tenant_id` via `set_config(..., true)`), `client.ts` med `withTenant()`-transaksjon, Neon-pooling. **Mangler:** Neon-prosjekt + kjørt migrasjon |
| F0-04 | Entitlements + Flags SDK | **progress** | `tenant_modules`-tabell (RLS), `createEntitlements()` i `packages/modules`, `apps/web/flags.ts` med Edge Config-adapter. **Mangler:** Edge Config-store + `FLAGS_SECRET` |
| F0-05 | Eventbus + katalog | **done** | `packages/events`: typet emitter, `EventCatalog`, `tenantId` obligatorisk på alle events |
| F0-06 | Modul-grensesnitt | **done** | `packages/modules/contracts`: `MechanicMatcher`, `AIProvider` (rollebasert, ingen hardkodede modeller), `IntegrationProvider`, `NotificationChannel` |
| F0-07 | Vercel-prosjekter fra1 + Container | **blocked** | `vercel.json` (regions: fra1) for web/api/stream + `Dockerfile.vercel` for `framer-agent` ligger klart. **Krever Vercel-konto** |
| F0-08 | Neon PITR + restore-test | **blocked** | Krever Neon-konto |
| F0-09 | Vercel Firewall | **blocked** | Krever Vercel-konto |
| F0-10 | CI/CD | **progress** | `.github/workflows/ci.yml` (lint → typecheck → test, Node 24). **Mangler:** Vercel Git-integrasjon + Neon-branch-per-PR |
| F0-11 | `@endwise/widget-tokens` | **progress** | Token-struktur (lys/mørk/aksent) + TS-kontrakt. **Verdiene er plassholdere** — prototypen finnes ikke i repoet |
| F0-12 | `@endwise/ui` v0 | **progress** | `Btn`, `Badge`, `Chip`, `Card`, `Input`, `cn()` + Tailwind 4 `@theme`-bro. Resten av galleriet krever prototypen |
| F0-13 | Vercel Workflows + Cron | **done** | `apps/api/src/workflows/cleanup.ts` (`use workflow` / `use step`, `RetryableError`/`FatalError`, DLQ-steg) + cron i `apps/api/vercel.json` |
| F0-14 | Observability | **progress** | `@vercel/otel` + Sentry (server/edge, `sendDefaultPii: false`). **Mangler:** DSN |
| F0-15 | Sikkerhetsgate i CI | **progress** | `.github/workflows/security.yml`: CodeQL, Semgrep (OWASP/CWE), pnpm audit + OWASP Dependency-Check, ZAP baseline + ASVS L2-PR-mal. **Mangler:** preview-URL til ZAP |

Alle teknologier ble slått opp i **context7** før bruk (Turborepo, Biome, Next.js 16, Hono, tRPC v11, Drizzle/RLS, Neon, Better-Auth, Vercel Workflows, Flags SDK).

Prosjektminnet ligger i **`CLAUDE.md`** i repo-rota.

## 2. Hva gikk galt

1. **`pnpm install` kunne ikke kjøres i den mountede mappa** — filsystemet nekter symlink/unlink (EPERM). Kopierte repoet til et Linux-tmp og kjørte install der, men npm-registeret i sandkassen var kraftig strupt (~30 s per forespørsel) og installasjonen fullførte ikke innen rimelig tid. **Konsekvens: `pnpm typecheck` / `pnpm build` er ikke kjørt.**
2. **Prototypen mangler i repoet.** F0-11/F0-12 sier «ekstrahert fra prototype» — den finnes ikke her. Jeg har derfor laget struktur + navn, men *ikke* funnet på designverdier.
3. **To tomme temp-filer** (`_tmp_3_*`) ble lagt igjen av pnpm i rota og lar seg ikke slette fra sandkassen. Slett dem manuelt.

## 3. Fikser

- Byttet fra install-i-mount til install-i-tmp (workaround for EPERM).
- Verifiserte i stedet uten avhengigheter: all JSON/YAML parser, alle `.ts`/`.tsx` parser (Node type-strip), null `any` i kildekoden, null referanser til forkastede teknologier (techstack §6).
- Rettet versjoner mot faktiske publiserte versjoner (`@hono/node-server` v2, ikke v1).
- **TypeScript pinnet til ^5.9.3**, ikke 7.0.2 (som nå er `latest`): økosystemet rundt Next 16 / Drizzle-kit er ikke verifisert på TS 7. Ikke et stack-avvik — techstacken angir ikke TS-versjon — men flagges her.

## 4. Neste steg

**Før F1 kan startes** (krever deg):

1. Opprett **Neon**-prosjekt (EU) → `DATABASE_URL` → `pnpm db:generate && pnpm db:migrate` (F0-03, F0-08)
2. Opprett **Vercel**-prosjekter for `web`/`api`/`stream` i **fra1** + Container for `framer-agent`, koble Git-integrasjon, slå på Firewall, opprett Edge Config (F0-07, F0-09, F0-04, F0-10)
3. Opprett **Sentry**-prosjekt → DSN (F0-14)
4. Kjør `pnpm install && pnpm typecheck && pnpm lint` lokalt — første ekte kompileringsverifisering
5. Legg inn prototypen så F0-11/F0-12 kan fullføres med ekte verdier

**Deretter: F1 — Auth, tenant og brukere** (Uke 3–6). Starter med F1-09 (ADR-002-spike: Better-Auth vs Lucia, 1 dag), siden F1-01/F1-03 avhenger av utfallet.
