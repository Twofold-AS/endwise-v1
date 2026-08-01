# Arbeidsrapport — F0 Fundament

**Fase:** F0 «Fundament» (Uke 1–3)
**Sist oppdatert:** 14. juli 2026 (økt 1–2)
**Kilder:** `docs/endwise-roadmap.html` (`const ROADMAP`), `docs/endwise-techstack.md` v2.0

---

## 1. Hva er gjort

### Verifisering — alt grønt

| Kommando | Resultat |
|---|---|
| `typecheck` (16 pakker) | **grønn** — 0 feil |
| `biome check` | **grønn** — 0 feil, 0 advarsler |
| `next build` (apps/web) | **grønn** — kompilerer, 3 statiske ruter |
| `pnpm install` + `lefthook install` | **grønn** — pre-commit + pre-push-hooks installert |

### Roadmap-punkter

| ID | Punkt | Status | Leveranse |
|---|---|---|---|
| F0-01 | Turborepo + pnpm + Biome | **done** | `turbo.json`, `biome.json` (preset recommended, `!docs`, tailwindDirectives), `tsconfig.base.json` (strict, 0 `any`), `lefthook.yml`, `docker-compose.yml` (pgvector/pg16, kun lokal dev) |
| F0-02 | Hono + tRPC v11-skjelett | **done** | `apps/api`: Hono = offentlig REST, tRPC v11 på `/trpc` via fetch-adapter, `publicProcedure`/`protectedProcedure`, delt `AppContext` |
| F0-03 | Neon + RLS + Drizzle | **progress** | `packages/db`: `drizzle.config.ts`, `rls.ts` (`tenantPolicy`, `app.tenant_id` via `set_config(..., true)`), `withTenant()`-transaksjon, Neon-pooling. **Mangler:** Neon-prosjekt + kjørt migrasjon |
| F0-04 | Entitlements + Flags SDK | **progress** | `tenant_modules` (RLS) + `createEntitlements()` + `apps/web/flags.ts` (Edge Config-adapter). **Mangler:** Edge Config-store, `FLAGS_SECRET` |
| F0-05 | Eventbus + katalog | **done** | `packages/events` — typet emitter, `EventCatalog`, `tenantId` påkrevd på alle events |
| F0-06 | Modul-grensesnitt | **done** | `MechanicMatcher`, `AIProvider` (rollebasert — ingen hardkodede modeller), `IntegrationProvider`, `NotificationChannel` |
| F0-07 | Vercel-prosjekter fra1 + Container | **blocked** | `vercel.json` (fra1) for web/api/stream + `Dockerfile.vercel` for framer-agent er klare. **Krever Vercel-konto** |
| F0-08 | Neon PITR + restore-test | **blocked** | Krever Neon-konto |
| F0-09 | Vercel Firewall | **blocked** | Krever Vercel-konto |
| F0-10 | CI/CD | **progress** | `.github/workflows/ci.yml` (lint → typecheck → test, Node 24). Git-repo + remote er på plass. **Mangler:** Vercel Git-integrasjon + Neon-branch per PR |
| F0-11 | `@endwise/widget-tokens` | **progress** | Token-struktur (lys/mørk/aksent) + TS-kontrakt. **Verdiene er plassholdere** — prototypen mangler |
| F0-12 | `@endwise/ui` v0 | **progress** | **shadcn/ui satt opp** (`components.json`, `lib/utils`, `radix-ui`, verifisert med `shadcn add button`) + primitivene `Btn`, `Badge`, `Chip`, `Card`, `Input` + Tailwind 4 `@theme inline`-bro. **Mangler:** resten av galleriet (krever prototypen) |
| F0-13 | Vercel Workflows + Cron | **done** | `use workflow` / `use step`, `RetryableError`/`FatalError`, DLQ-steg + cron i `apps/api/vercel.json` |
| F0-14 | Observability | **progress** | `@vercel/otel` + Sentry (server/edge, `sendDefaultPii: false`). **Mangler:** DSN |
| F0-15 | Sikkerhetsgate i CI | **progress** | CodeQL, Semgrep (OWASP/CWE), pnpm audit + OWASP Dependency-Check, ZAP baseline, ASVS L2-PR-mal. **Mangler:** preview-URL til ZAP |

Alle teknologier ble slått opp i **context7** før bruk (Turborepo, Biome, Next.js 16, Hono, tRPC v11, Drizzle/RLS, Neon, Better-Auth, Vercel Workflows, Flags SDK, shadcn/ui).

---

## 2. Hva gikk galt

1. **`pnpm install` feilet på `prepare` (lefthook)** — mappa var ikke et git-repo. *Løst* (git init + hooks synket). Lefthook er beholdt; den står i techstacken.
2. **Git-kollisjon** — jeg og du kjørte `git init` samtidig, som la igjen `.git/config.lock`. *Løst av deg.*
3. **13 pakker feilet typecheck** — `allowImportingTsExtensions` var ikke aktivert, så `.ts`-endelser i importer ble avvist. *Løst.*
4. **Biome hadde 55 feil** — dels formattering, dels at `docs/endwise-roadmap.html` (levert dokument, ikke kildekode) ble linta, dels at Tailwind-direktiver ikke ble parset. *Løst.*
5. **Prototypen finnes fortsatt ikke i repoet.** F0-11/F0-12 krever «ekstrahert fra prototype». Jeg har laget struktur og navn — ingen designverdier er funnet på.
6. **To tomme `_tmp_3_*`-filer** i rota lar seg ikke slette fra sandkassen (filsystemet nekter). De er nå ignorert i `.gitignore`, men **slett dem manuelt**.

---

## 3. Fikser

- `allowImportingTsExtensions: true` i `tsconfig.base.json`; `@types/node` + `types: ["node"]` i `packages/db`.
- Biome: `linter.rules.preset: recommended` (erstatter deprecated `recommended`-felt), `css.parser.tailwindDirectives`, `docs/` ekskludert.
- `@hono/node-server` rettet fra v1 til v2 (faktisk publisert versjon).
- Fjernet deprecated `disableLogger` fra Sentry-konfigen.
- `_tmp_*` lagt til i `.gitignore`.
- **TypeScript pinnet til 5.9.3**, ikke 7.0.2 (nå `latest`) — økosystemet rundt Next 16 / drizzle-kit er ikke verifisert på TS 7. Ikke et stack-avvik; techstacken angir ingen TS-versjon.

---

## 4. Eksterne UI-avhengigheter — status mot techstacken

Techstack §2 (Frontend) og §4 (`packages/ui`) lister disse. Slik ligger de an:

| Pakke | I dokumentasjonen | Status |
|---|---|---|
| **shadcn/ui** | §2 + §4 | ✅ **Installert og konfigurert** (`packages/ui/components.json`, `radix-ui`, `cn()` i `lib/utils`, `shadcn add … -c packages/ui` verifisert) |
| **lucide-react** | §2 | ✅ Installert |
| **dither-kit** | §2 + §4 («pinnet + kopiert inn») | ❌ **Finnes ikke på npm.** Trenger kilde — GitHub-URL eller repo — fra deg |
| **matrix-loaders** | §2 + §4 («portet fra TheFold») | ❌ **Finnes ikke på npm.** Ligger i TheFold — trenger tilgang/kilde |
| **slot-text** | §2 + §4 | ⏸ Finnes på npm (0.3.3). **Ikke lagt til** — brukes først av KPI-tall (F3-05) |
| **cuelume** | §2 («valgfri polish, av som default») | ⏸ Finnes på npm (0.1.0). **Ikke lagt til** |
| **AI Elements** | §2 + §4 | ⏸ Finnes på npm (`ai-elements`). **Ikke lagt til** — hører til AI-laget (F6-13) |
| **Recharts** | §2 | ⏸ **Ikke lagt til** — brukes først i dashboard-charts (F3+) |
| **beUI** | §2 (loader «der det passer») | ❌ Finner ingen pakke med det navnet |

**Jeg trenger svar på to ting:**

1. **Hvor ligger `dither-kit` og `matrix-loaders`?** (GitHub-URL / TheFold-repo). De står i techstacken, men har ingen offentlig kilde jeg kan installere fra.
2. **Skal `slot-text`, `cuelume`, `ai-elements` og `Recharts` inn allerede i F0**, eller når flatene som bruker dem bygges (F3/F6)? Roadmap F0-12 nevner bare «primitiver», så jeg har latt dem stå — si fra hvis du vil ha dem inn nå.

Jeg har **ikke** lagt til noe som ikke står i dokumentasjonen.

---

## 5. Hva gjenstår

**Krever deg (eksterne kontoer):**

1. **Neon** (EU) → `DATABASE_URL` → `pnpm db:generate && pnpm db:migrate` (F0-03, F0-08)
2. **Vercel**: prosjekter for web/api/stream i **fra1** + Container for framer-agent, Git-integrasjon, Firewall, Edge Config (F0-07, F0-09, F0-04, F0-10)
3. **Sentry**-prosjekt → DSN (F0-14)
4. **Prototypen** inn i repoet → F0-11/F0-12 kan fullføres med ekte verdier
5. Kilde til **dither-kit** + **matrix-loaders** (se §4)
6. Slett `_tmp_3_*`-filene i rota

**Deretter: F1 — Auth, tenant og brukere** (Uke 3–6). Bør starte med **F1-09** (ADR-002-spike: Better-Auth vs Lucia, 1 dag), siden F1-01 og F1-03 avhenger av utfallet.
