# Endwise — Tech-stack (v2.0, kanonisk)

**Juli 2026 · Én leverandør: Vercel. Denne fila erstatter alle tidligere techstack-dokumenter.**

De gamle filene (v1.0, v1.1) beskrev en Hetzner/NestJS/BullMQ-arkitektur som ble forkastet da vi byttet til Vercel. De er slettet. **Alt under er den faktiske stacken**, konsistent med `endwise-total-rapport.md` og `endwise-roadmap.html`.

---

## 0. Grunnprinsipp

**Vercel hele veien.** Én leverandør for hosting, kjøring, AI, chat, varige jobber, flags og observability. Det gir samlet fakturering, ett mentalt kart, og null limlag mellom tjenester. De få unntakene (database, e-post, betaling, integrasjoner) er tjenester Vercel ikke leverer — de er bevisste valg, ikke rester.

**Portabilitets-rekkverk:** Vercel-spesifikt holdes i deploy-laget. Kjernen er standard Web-API-er (Hono), ren Postgres (Drizzle) og åpen Workflow-SDK — så en fremtidig flytt er mulig hvis det trengs. Konsentrasjonen er bevisst; rekkverket er forsikringen.

---

## 1. Døde valg → levende valg (les denne først)

Hvis du ser noe fra venstre kolonne i kode eller dokumenter, er det en feil som skal rettes:

| ❌ Forkastet (gammel plan) | ✅ Gjelder nå | Hvorfor byttet |
|---|---|---|
| Hetzner Cloud + Coolify + Traefik | **Vercel** (fra1 EU) | Egress-argumentet falt bort (Framer hoster widget, R2/Blob tar assets); én-leverandør; TheFold-deploy gjenbrukes |
| NestJS | **Hono + tRPC v11** | Hono for offentlig REST, tRPC for interne flater; modulær monolitt består som packages |
| BullMQ 5 + Redis (kø) | **Vercel Workflows + Vercel Cron** | Durable functions dekker jobbene; samme åpne Workflow-SDK som Eve; ingen egen Redis å drifte |
| QStash (vurdert) | **Vercel Workflows** | ADR-003 avgjort til Vercel-native |
| Trigger.dev | **Vercel Workflows** (inline der mulig) | TheFold bypasset selv Trigger.dev; unødvendig lag |
| Unleash (feature flags) | **Vercel Flags SDK + Edge Config** + `tenant_modules` (entitlements i DB) | To behov: entitlements = DB-data, release-toggles = Flags SDK |
| Cloudflare WAF/rate-limit | **Vercel Firewall** | Cloudflare foran Vercel = dobbel proxy; unngås |
| WAL-G backup | **Neon PITR** + ukentlig restore-test + snapshot til objektlager | Managed Postgres gir point-in-time gratis |
| Encore.ts | **Hono + tRPC** | Aldri implementert; erstattet før byggestart |
| Lucia (hånd-rullet auth) | **Better-Auth 1.x** | Produksjonsbevist i TheFold; organizations + passkey + phone-OTP innebygd |
| Postmark (e-post) | **Resend** | Transaksjonelt + Broadcasts (nyhetsbrev) hos én leverandør |

**Redis:** ikke lenger påkrevd. Pub/sub-behovet dekkes av Postgres LISTEN/NOTIFY (SSE-tjenesten). Legges kun til (Upstash) hvis app-nivå rate-limiting senere trenger det.

---

## 2. Kanonisk stack per lag

### Fundament
- **Turborepo + pnpm workspace** (Node 24, corepack)
- **TypeScript strict** overalt (0 `any`)
- **Biome** (formatter + linter, erstatter ESLint/Prettier)
- **Lefthook** (git hooks: pre-commit biome + typecheck)
- **Docker Compose** — kun for lokal dev (Postgres + ev. Redis lokalt)

### Hosting & kjøring — Vercel
- **Vercel fra1 (EU-region)** for GDPR — `apps/web`, `apps/api`, `apps/stream`
- **Vercel Container** — `apps/framer-agent` (Framer External Agent CLI trenger shell + filsystem)
- **Vercel Workflows** — varige jobber, retries, DLQ-mønster (ADR-003)
- **Vercel Cron** — planlagte oppgaver (cleanup, synk, SLA-sjekk, e-post-drypp)
- **Vercel Firewall** — WAF, rate-limiting, DDoS
- **Vercel Flags SDK + Edge Config** — release-toggles, kill-switch, canary, A/B
- **Vercel Observability** — + Sentry + OpenTelemetry

### Frontend — `apps/web` (begge dashboards + mekaniker-PWA)
- **Next.js 16** (App Router, RSC)
- **React 19.2** (native View Transitions for sideoverganger)
- **Tailwind CSS 4** (`@theme`-syntaks)
- **shadcn/ui** + **AI Elements** (Conversation, Message, PromptInput, Plan, Task, Voice)
- **dither-kit** — signatur-estetikk på forhandler- og admin-dashboard (pinnet + kopiert inn)
- **matrix-loaders** (portet fra TheFold) — «AI tenker»-animasjon per SSE-event; **beUI**-loader der det passer
- **slot-text** — rullende KPI-siffer
- **Container queries** (`@container`) — dock-layout responderer på plassen den får, ikke viewport
- **lucide-react** (ikoner), **Recharts** (charts; sparklines som egen SVG)
- **cuelume** (mikro-lyder) — valgfri polish, av som default

### Backend — `apps/api`
- **Hono** — offentlig REST (widget, Quick-webhooks, innkommende webhooks)
- **tRPC v11** — type-safe interne flater (dashboards, PWA) + React Query
- **Zod** — validering
- **Vercel AI SDK** — agent tool-loop + streaming
- **Chat SDK** — samtale-skjelett (resumable streams, historikk)

### Sanntid — `apps/stream`
- **Hono + Postgres LISTEN/NOTIFY** (portet fra TheFold)
- Heartbeat (~15s), Last-Event-ID-reconnect, tilkoblings-caps (re-dimensjonert for Endwise-volum)
- Driver live jobboppdateringer (mekaniker), meldinger og AI-streaming

### AI / agent-lag — `packages/agent-runtime` + `packages/agents`
- **Tynn master-løkke** (LUKKET for endring) — løser tools, kaller modell, kjører kall, gjentar. All styring ligger i tools, ikke i løkka
- **loop-orchestrator** — subagent-spawn (read-only parallelt), review/iterate, circuit-breaker
- **Agent = mappe** (`packages/agents/<navn>/`: `agent.ts` + `instructions.md` + `skills/`), auto-registrert, entitlement-gated
- **Modellkatalog med roller** (fast/standard/hard/embed/realtime) — **ingen hardkodede modeller**; tenant/plan mapper rolle→modell
- **AIProvider** (tynt lag) for latency-sensitive enkeltkall (diagnose, streaming)
- **OpenAI** primær; leverandører bak abstraksjon (mulig å bytte)
- **Fusion / Council** (OpenRouter) for planlegging/resonnering — opt-in, «lei først, eie senere»; aldri i booking-stien
- **Guardrails L1–L5** (`packages/guardrails`) — se sikkerhetsdokumentet

### Database — `packages/db`
- **Neon (EU)** — Postgres 16, **RLS**, **pgvector** (HNSW-indeks)
- **Drizzle ORM** (schema-first, TS-typer genereres)
- **`pg_advisory_xact_lock`** for slot-låsing (transaksjons-skopet — påkrevd med Neon-pooling)
- Multi-tenant: `tenant_id` på hver rad, RLS på hver tabell
- Branch-per-PR = preview-miljøer med ekte DB

### Auth — `packages/auth`
- **Better-Auth 1.x** — organizations (multi-tenant), passkey (WebAuthn), phone-number-plugin
- **Obligatorisk e-post-2FA** for hver forhandler/admin (ingen bypass)
- **60-min idle-timeout** (serverside sliding-vindu) + absolutt maks-levetid
- **Twilio Verify** som OTP-sender
- **Envelope-crypto** (AES-256-GCM, BYOK) for tenant-secrets — inkl. forhandlerens Quick API-nøkkel

### Storage — `packages/uploads`
- **Vercel Blob** — objektlagring (opplastinger, modellbilder) via signerte URL-er
- *Valgfritt senere:* Cloudflare R2 kun for widget-runtime-CDN-en (F4-13) hvis egress ved 250+ sider rettferdiggjør det. Ikke nødvendig for å starte — Blob holder.

### Sikkerhet (tverrgående)
- **CWE/OWASP-gate i CI** (F0-15): CodeQL/Semgrep, Dependency-Check, ASVS L2-mal, ZAP, rød-team-evals
- **Guardrails L1–L5** for AI-laget (OWASP LLM Top 10)
- Full trusselmodell: `endwise-sikkerhet-cwe-owasp.md`

### Testing & CI
- **Vitest** (unit + tenant-isolasjons-suite, portet fra TheFold)
- **Playwright** (e2e)
- **Vercel Git-integrasjon** (preview per PR + Neon-branch) + GitHub Actions for test/lint

---

## 3. Chat- og meldingslag (samlet)

Chatten i Endwise er **to systemer som deler transport**, men ellers er separate. Å blande dem er den vanligste misforståelsen — derfor står de her, eksplisitt.

### De to systemene

| | **Menneske↔menneske-meldinger** | **AI-chat (agenter)** |
|---|---|---|
| Hva | Tråder, uleste-telling, historikk mellom personer | Samtale med en agent (tool-loop, streaming) |
| Teknologi | Meldings-modul (`packages/modules/messages`) + Drizzle-tabeller (threads/messages/read_receipts, RLS) | **Vercel AI SDK** (tool-loop) + **Chat SDK** (resumable streams, historikk) |
| Transport | **Samme `apps/stream` SSE** (Postgres LISTEN/NOTIFY) | **Samme `apps/stream` SSE** |
| Roadmap | F6-01 (tråder), F6-02 (SSE), F6-03 (handlingsknapper) | F6-13 (agent-fundament) |

Delt transport betyr: begge systemer pusher over den samme SSE-tjenesten (heartbeat, Last-Event-ID-reconnect, tilkoblings-caps). Én sanntidskanal, to typer innhold.

### De tre samtale-kanalene

| Kanal | Menneske↔menneske | AI-førstelinje | Hvor |
|---|---|---|---|
| **Kunde ↔ forhandler** | Meldings-modul (F6-01/02) | kunde-support-agent | widget-chat på Framer-side |
| **Forhandler ↔ admin (oss)** | Support-innboks (F5-11) | support-endwise-agent | Endwise-admin + forhandler-dashboard |
| **Mekaniker ↔ forhandler** | Meldings-modul (F6-01/02) | — | PWA + dashboard |

Alle tre bruker samme trådmodell og samme SSE. Forskjellen er kun *hvem* som er i hver ende og *hvilken flate* tråden vises i.

### Eskalering: agent → menneske, samme tråd

Broen mellom de to systemene: når en AI-agent treffer noe den ikke skal svare på (konfidens under terskel, eller utenfor tema), utløser `on-escalation`-hooken (F6-05) en overlevering — **samme tråd flyttes fra AI-førstelinje til et menneske** uten at kunden/forhandleren starter på nytt. Meldings-modulen eier tråden; agenten var bare første deltaker i den. Slik henger F6-13 (AI-runtime) og F6-01/02 (meldinger) sammen i praksis.

### Sikkerhet i chat-laget

Meldinger er tenant-skopet med RLS (en forhandler ser aldri en annens tråder). AI-førstelinjen kjører bak guardrails L1–L5 (F6-14): tool-output er data (ikke instruks, LLM01), og agenten ser aldri data den ikke er scoped til (LLM02). Se `endwise-sikkerhet-cwe-owasp.md`.

---

## 4. Monorepo-struktur

```
endwise/
├── apps/
│   ├── web/              Next.js 16 — admin- + forhandler-dashboard + mekaniker-PWA
│   ├── api/              Hono (offentlig REST) + tRPC (interne flater)
│   ├── stream/           SSE (Hono + Postgres LISTEN/NOTIFY)
│   └── framer-agent/     Vercel Container — Framer External Agent CLI
├── packages/
│   ├── agent-runtime/    tynn master-løkke + loop-orchestrator + hooks/
│   ├── agents/           én mappe per agent (agent.ts + instructions.md + skills/)
│   ├── tools/toolkits/   én mappe per integrasjon (quick, vegvesen, resend, stripe, framer …)
│   ├── guardrails/       L1–L5 filter-pipeline
│   ├── modules/          domenemoduler (booking, kalender, meldinger …)
│   ├── db/               Drizzle + RLS + envelope-crypto
│   ├── auth/             Better-Auth
│   ├── providers/        modellkatalog + AIProvider
│   ├── ui/               shadcn + AI Elements + dither-kit + matrix-loaders + slot-text
│   ├── widget-ui/        lette widget-komponenter (runtime fra CDN)
│   ├── widget-tokens/    designtokens (lys/mørk/aksent)
│   ├── uploads/          Vercel Blob-pipeline
│   └── events/           typet eventbus + katalog
├── framer-plugin/        Framer Plugin (installatør: pairing, skall-synk, entitlements)
└── docs/                 ADR-er, REUSE.md, planer
```

---

## 5. Eksterne tjenester (det Vercel ikke leverer)

| Tjeneste | Rolle | Merknad |
|---|---|---|
| **Neon** | Postgres (EU) | Managed, RLS + pgvector, branch-per-PR |
| **Resend** | E-post | Transaksjonelt + Broadcasts (nyhetsbrev) + auth-eposter |
| **Twilio** | SMS / OTP | Verify som 2FA/OTP-sender |
| **Stripe** | SaaS-fakturering | Abonnement → entitlements (`tenant_modules`) |
| **Quick API** | Datafundament | Varelager, bookinger, kunder — Endwise synker og speiler («Quick Lite») |
| **Vegvesen/Autosys** | Kjøretøyoppslag | Regnr → modell/EU-frist |
| **Finn.no, Lime CRM** | Salg / CRM | Egne adaptere |
| **Framer 3.0** | Widget-distribusjon + hovedside-agent | Plugin (widgets) + External Agent (sideendring via chat) |
| **Composio** | Long-tail OAuth | Utsatt til konkret behov (f.eks. forhandlers Google Calendar) |
| **OpenAI / OpenRouter** | LLM | Bak modellkatalog; OpenRouter for Fusion |

**Betaling sluttkunde→forhandler (forskudd i widget):** ADR-001 fortsatt åpen — Nets Easy vs Stripe+Vipps, tiltet mot Stripe+Vipps siden Stripe alt er valgt for fakturering.

---

## 6. Hva vi bevisst IKKE bruker

Hetzner · Coolify · Traefik · NestJS · Encore · BullMQ · QStash · Trigger.dev · Redis (som fast avhengighet) · Unleash · Cloudflare WAF · WAL-G · Lucia · Postmark · Composio Sandbox/e2b (Endwise-agenter kjører ikke vilkårlig kode; Framer-agenten bruker Vercel Container).

Ser du noen av disse i repoet, er det en rest som skal fjernes.

---

## 7. Kostnadsmodell (kort)

Fra fast infrastruktur til bruksbasert: Vercel Pro + Fluid Active CPU · Neon skalatrinn · Vercel Blob · Resend/Twilio/Stripe pay-per-use. Ved pilotskala trolig billigere enn den forkastede Hetzner-topologien; ved full skala er samtidige SSE-tilkoblinger kostdriveren å overvåke (budsjettalarm i Vercel fra uke 1).
