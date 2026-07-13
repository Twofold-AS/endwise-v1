# Endwise

Monorepo for Endwise. Kanoniske kilder:

- **Roadmap / status:** `docs/endwise-roadmap.html` (`const ROADMAP` = én kilde til sannhet)
- **Tech-stack:** `docs/endwise-techstack.md` (v2.0 — Vercel hele veien)
- **Arbeidsregler:** `CLAUDE.md`

## Kom i gang

```bash
corepack enable
pnpm install
docker compose up -d          # lokal Postgres 16 + pgvector
cp .env.example .env.local
pnpm db:generate && pnpm db:migrate
pnpm dev
```

## Struktur

```
apps/web            Next.js 16 — dashboards + mekaniker-PWA
apps/api            Hono (offentlig REST) + tRPC v11 (interne flater)
apps/stream         SSE (Hono + Postgres LISTEN/NOTIFY)
apps/framer-agent   Vercel Container — Framer External Agent CLI
packages/*          db, auth, events, providers, modules, ui, widget-tokens, …
```

Node 24 · pnpm · Turborepo · Biome · TypeScript strict (0 `any`).
