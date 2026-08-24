# Endwise

Monorepo for Endwise. Kanoniske kilder:

- **Roadmap / status:** `docs/endwise-roadmap.html` (`const ROADMAP` = én kilde til sannhet)
- **Tech-stack:** `docs/endwise-techstack.md`
- **Arbeidsregler:** `CLAUDE.md`
- **Endringslogg:** `docs/roadmap-endringer.md`

## Fra bunnen på en ny maskin

### Forutsetninger

- **Node 24** (eller nyere 22+). Sjekk med `node --version`.
- **pnpm** via Corepack (følger med Node): `corepack enable`.
- **Docker** + Docker Compose (lokal Postgres 16 + pgvector).

### Steg for steg

```bash
# 1. Klon + installer
git clone <repo-url> endwise && cd endwise
corepack enable
pnpm install

# 2. Miljøvariabler. VIKTIG: fila heter .env (ikke .env.local) — db-verktøyene
#    og dev-scriptene laster rot-.env eksplisitt.
cp .env.example .env
#    Fyll MINST inn (lokalt): DATABASE_URL + APP_DATABASE_URL (defaults funker mot
#    Docker under), BETTER_AUTH_SECRET, ENDWISE_KEK, WIDGET_TOKEN_SECRET.
#      openssl rand -base64 32   # bruk for hver *_SECRET / ENDWISE_KEK
#    Resten (Stripe/Fireworks/Mistral/Twilio/Resend) kan stå tomme — da kjører de
#    aktuelle flatene i mock/degradert modus. Se kommentarene i .env.example.

# 3. Database: Postgres + pgvector + roller (docker/init/01-roles.sql)
pnpm db:up               # = docker compose up -d

# 4. Skjema-migrasjoner. Kjør db:generate FØRST — flere nyere tabeller
#    (integration_config, sync_conflicts, widget_keys + customers-kolonner) er ikke
#    committet som sporet migrasjon ennå, så drizzle-kit må generere dem hos deg.
pnpm db:generate         # produserer migrasjons-SQL fra src/schema
pnpm db:setup            # = db:migrate && db:grants
                         # migrate: skjema + 0024 slett_forhandler (CREATE OR REPLACE)
                         # grants: sql/grants.sql (RLS/FORCE + slett-SELECT) og
                         #         sql/functions.sql (slett_forhandler på nytt)

# 5. Demo-data (tenant A/B + kontoer + dagens bookinger)
pnpm db:seed

# 6. Kjør alt
pnpm dev                 # web :3000 · api :3001 · stream :3002
```

### Demo-innlogginger (etter `pnpm db:seed`)

Passord for alle: **`endwise-demo-1`**

| Rolle | E-post | Forhandler |
|---|---|---|
| endwise_admin | `mikkis@twofold.no` | Verksted A |
| dealer_admin | `admin-a@verksted.test` | Verksted A |
| dealer_staff | `ansatt-a@verksted.test` | Verksted A |
| **mekaniker** (PWA) | `mekaniker-a@verksted.test` | Verksted A |
| dealer_admin | `admin-b@verksted.test` | Verksted B |

Logg inn på `http://localhost:3000`. Mekaniker-kontoen låses til mobil-PWA-en («Min dag»);
admin/staff får forhandler-dashbordet.

### Verifisering

```bash
pnpm typecheck           # tsc --noEmit på tvers av alle pakker
pnpm lint                # biome check
pnpm build               # turbo run build (Next + tsc)
pnpm test                # inkl. RLS tenant-isolasjon (KREVER at DB er oppe: pnpm db:up)
pnpm format              # biome check --write (autofiks formatering/imports)
```

> RLS-testene (`packages/db/test/*isolation*`) hoppes over hvis `DATABASE_URL` +
> `APP_DATABASE_URL` ikke er satt. De kjører mot Docker-Postgres.

### To databaseroller — ikke én

| Rolle | Env | Brukes til |
|---|---|---|
| `endwise` (eier) | `DATABASE_URL` | Migrasjoner, seeding. **RLS gjelder ikke for eieren** |
| `endwise_app` | `APP_DATABASE_URL` | All runtime. RLS gjelder |

Kjører du appen som eier, er tenant-isolasjonen slått av uten at noe sier fra.

## Struktur

```
apps/web            Next.js 16 — forhandler-dashbord + mekaniker-PWA (Min dag)
apps/api            Hono (offentlig REST: widget, Quick, cron, Stripe) + tRPC v11 (interne flater)
apps/stream         SSE (Hono + Postgres LISTEN/NOTIFY)
apps/framer-agent   Framer External Agent CLI (Vercel Container)
framer-plugin       Framer-plugin for kundewidgeten (F4-01, skjelett)
packages/*          db, auth, events, providers, guardrails, agent-runtime, agents,
                    modules, ui, widget-tokens, widget-ui, tools/toolkits/*
```

Node 24 · pnpm · Turborepo · Biome · TypeScript strict (0 `any`). Vercel kobles på i F13.

## Feilsøking

**`git push` feiler med `cannot spawn .git/hooks/pre-push: No such file or directory`**
(eller `pre-commit`). Dette er en ødelagt Git-hook — typisk CRLF i shebang på Windows, ikke et
autentiseringsproblem. Fiks:

```bash
# Regenerer hookene (anbefalt) — lefthook skriver dem på nytt med riktig linjeslutt:
pnpm exec lefthook install

# ELLER hopp over hookene for ÉN push (nød-utvei):
git push --no-verify
```

Repoet har en `.gitattributes` som tvinger LF på script-/config-filer, så nyklonede kopier skal
ikke få dette. Får du det likevel etter klone: kjør `pnpm install` (som trigger `lefthook install`
via `prepare`-scriptet), eventuelt `pnpm exec lefthook install` manuelt.

> Git-hookene (`.git/hooks/*`) er genererte og IKKE en del av repoet — de lages av lefthook
> lokalt. `lefthook.yml` (pre-commit: Biome + typecheck · pre-push: test) kaller alt via `pnpm`/
> `turbo`, så kommandoene er OS-uavhengige.
