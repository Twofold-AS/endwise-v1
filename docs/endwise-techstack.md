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
| Hetzner Cloud + Coolify + Traefik | **Vercel** (cdg1 Paris EU) | Egress-argumentet falt bort (Framer hoster widget, R2/Blob tar assets); én-leverandør; TheFold-deploy gjenbrukes |
| NestJS | **Hono + tRPC v11** | Hono for offentlig REST, tRPC for interne flater; modulær monolitt består som packages |
| BullMQ 5 + Redis (kø) | **Vercel Workflows + Vercel Cron** | Durable functions dekker jobbene; samme åpne Workflow-SDK som Eve; ingen egen Redis å drifte |
| QStash (vurdert) | **Vercel Workflows** | ADR-003 avgjort til Vercel-native |
| Trigger.dev | **Vercel Workflows** (inline der mulig) | TheFold bypasset selv Trigger.dev; unødvendig lag |
| Unleash (feature flags) | **DB-basert feature-flags** (`feature_flags`-tabell, admin-styrt) + `tenant_modules` (entitlements i DB) | To behov: entitlements = DB-data, release-toggles = DB-flagg. Vercel Edge Config (betalt lagring) droppet 16.07.2026 |
| Cloudflare WAF/rate-limit | **Vercel Firewall** | Cloudflare foran Vercel = dobbel proxy; unngås |
| WAL-G backup | **Scaleway automatiske backups** + ukentlig restore-test + snapshot til objektlager | Managed Postgres gir point-in-time uten egen WAL-drift |
| Encore.ts | **Hono + tRPC** | Aldri implementert; erstattet før byggestart |
| Lucia (hånd-rullet auth) | **Better-Auth 1.x** | Produksjonsbevist i TheFold; organizations + passkey + phone-OTP innebygd |
| Postmark (e-post) | **Resend** | Transaksjonelt + Broadcasts (nyhetsbrev) hos én leverandør |
| OpenAI (LLM) | **Fireworks** | Leverandørvalg. Hele poenget med modellkatalogen + AIProvider-abstraksjonen er at dette koster én fil. Brukergodkjent 14.07.2026 |
| dither-kit (charts) | **Recharts** | ⚠️ REVERSERT 05.08.2026. dither-kit erstattet Recharts 14.07, men ble deretter fjernet fra UI-et 03.08 på eiers ønske — og lot flaten stå uten chart-motor. Recharts er nå motoren, via shadcns Chart-mønster i `packages/ui/src/components/chart.tsx`. Brukergodkjent §2-beslutning |

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
- **Vercel cdg1 (Paris, EU-region)** for GDPR + Quick Static IP (`51.44.143.46`) — `apps/web` (med `apps/api` portet inn som route handlers, F13-03). `apps/stream` på Scaleway Serverless Container (ikke Vercel serverless)
- **Scaleway Serverless Container** — `apps/framer-agent` (⚠️ ENDRET 11.08.2026, eierbeslutning: var *Vercel Container* + *Framer External Agent CLI*. Nå **Framers offisielle Server API**, som ikke trenger shell — men fortsatt en levende prosess, fordi en redigeringsøkt er stateful. Samme leverandør som `apps/stream`. Se F8-09/F13-04 + `docs/deploy-plan.md`)
- **Vercel Workflows** — varige jobber, retries, DLQ-mønster (ADR-003)
- **Vercel Cron** — planlagte oppgaver (cleanup, synk, SLA-sjekk, e-post-drypp)
- **Vercel Firewall** — WAF, rate-limiting, DDoS
- **DB-basert feature-flags** (`feature_flags` i Postgres, admin-styrt, gratis) — release-toggles, kill-switch, canary, A/B. *(Vercel Edge Config droppet 16.07.2026 — betalt lagring; `flags`-SDK var gratis, men vi eier nå kilden selv.)*
- **Vercel Observability** — + Sentry + OpenTelemetry

### Frontend — `apps/web` (begge dashboards + mekaniker-PWA)
- **Next.js 16** (App Router, RSC)
- **React 19.2** (native View Transitions for sideoverganger)
- **Tailwind CSS 4** (`@theme`-syntaks)
- **shadcn/ui** + **AI Elements** (Conversation, Message, PromptInput, Plan, Task, Voice). ⚠️ **AI Elements er IKKE hentet inn, og overlapper nå delvis** — se chat-raden under
- **Chat-komponenter: shadcn `message` · `message-scroller` · `questionnaire`** (12.08.2026, brukergodkjent §2-beslutning). Krever **`@shadcn/react`** (MIT, 56 kB, **null avhengigheter**, pinnet `0.3.0`) som bærer oppførselen i scroller og questionnaire. `message` har ingen avhengigheter. ⚠️ `questionnaire` finnes IKKE i det offentlige registeret (404, verifisert) — stil-skallet er vårt, oppførselen er pakkens. Tool-parts er egenskrevet (shadcn har ingen). Detaljer i `docs/UI-PAKKER.md` §9. ⚠️ **Dette dekker `Conversation`/`Message`/`PromptInput` fra AI Elements** — å hente AI Elements nå ville gitt to meldingskomponenter side om side, og er en egen §2-avklaring
- **dither-kit** — signatur-estetikk på forhandler- og admin-dashboard (pinnet + kopiert inn)
- **matrix-loaders** (portet fra TheFold) — «AI tenker»-animasjon per SSE-event; **beUI**-loader der det passer
- **slot-text** — rullende KPI-siffer
- **Container queries** (`@container`) — dock-layout responderer på plassen den får, ikke viewport
- **lucide-react** (ikoner) — eneste ikonbibliotek
- **beUI** (shadcn-registry `@beui`) — tilstands-komponenter (`StatefulButton`) + kanoniske bevegelses-tokens (`lib/ease.ts`)
- **Charts: Recharts er eneste chart-motor** (05.08.2026, brukergodkjent §2-beslutning). Hentet inn shadcn-stil i `packages/ui/src/components/chart.tsx` — appene importerer aldri `recharts` direkte. **Kun søyle, linje og areal** er eksponert; pai/radar/scatter er bevisst utelatt. Fargene er CSS-variabler mot `--ew-*`-tokenene, så grafene snur med lys/mørk. ~~dither-kit~~ er ute av UI-et (03.08.2026)
- **cuelume** (mikro-lyder) — valgfri polish, av som default
- **blobatar** + **@blobatar/react** (avatarer, 20.08.2026, brukergodkjent §2-beslutning). MIT, ~4,4 kB, **null avhengigheter**, alt genereres klientside — ingen avatar-URL, ingen tredjepartsforespørsel, ingenting som forlater maskinen. Deterministiske geometriske ansikter fra en streng. ⛔ **Seeden er alltid en stabil ID** (`customers.id`, `mechanics.id`, `user.id`), aldri et navn: en rettet skrivefeil skal ikke bytte ansikt på noen. Hentet inn bak `Avatar` i `packages/ui/src/components/avatar.tsx` — appene importerer aldri pakken direkte, samme regel som for Recharts og lucide. **Kun personer, ikke kjøretøy** (modellbilder er F2-03 med ekte silhuetter) og **kun admin-flatene** — widget og kundevendte flater er utenfor. Detaljer i `docs/UI-PAKKER.md` §10

### Backend — `apps/api`
- **Hono** — offentlig REST (widget, Quick-webhooks, innkommende webhooks)
- **tRPC v11** — type-safe interne flater (dashboards, PWA) + React Query
- **Zod** — validering
- **Vercel AI SDK** (`ai` ^7) — agent tool-loop + streaming. ⚠️ Deklarert som DIREKTE avhengighet i `apps/api` og `apps/web` fra 12.08.2026, ikke bare transitivt
- **`@ai-sdk/react`** (12.08.2026, brukergodkjent §2-beslutning) — `useChat` for chat-flaten (F6-18). React-bindingen til `ai@7` vi allerede kjører, ikke en ny leverandør
- ⛔ **Vercel AI Gateway brukes IKKE.** Modellvalget går gjennom `resolveModelProvider(dataClass)` — kundevendt → Mistral (EU), internt → Fireworks. En gateway ville flyttet den avgjørelsen ut av vår kode, og EU-residensen med den
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
- **TO LLM-LEVERANDØRER, delt etter DATAKLASSE** (brukergodkjent 14.07.2026 — se `docs/personvern/`):
  - **Mistral (EU)** — `@ai-sdk/mistral`. **Alt som ser sluttkundens fritekst.** EU-endepunkt (`https://api.mistral.ai/v1`) er hardkodet som eneste lovlige; Mistrals US-endepunkt er **sperret i kode** (`assertEuEndpoint`)
  - **Fireworks (global)** — `@ai-sdk/fireworks`. Kun agenter som ser **tenant-skopede driftsdata**
  - **Regelen håndheves i kode, ikke i dokumentasjon:** hver agent erklærer `dataClass`, hver provider erklærer `region`, og `spawnAgent()` nekter å starte en `customer_freetext`-agent mot en ikke-EU-leverandør. En feilkonfigurasjon her er et personvernbrudd, ikke en bug
  - **Scope-gate (F14-05):** Mistral Moderations (`mistral-moderation-2603`) klassifiserer kundens fritekst **i EU** før den når hoved-modellen. Kategoriene `health`, `pii`, `law`, `selfharm` → eskaler til menneske (F6-05)
- **Fireworks — SERVERLESS** (`@ai-sdk/fireworks`), ikke dedicated/on-demand. Leverandører bak abstraksjon (mulig å bytte). ~~OpenAI~~ er ute — se «Døde valg» §1 (brukergodkjent 14.07.2026)
  - **Tool calling støttes på serverless** (OpenAI-kompatibel `tools`-spesifikasjon), men **kun på modeller som er merket `supportsTools`** — sjekk feltet før en modell velges til en agent-rolle
  - Fireworks anbefaler **lav temperatur (0.0–0.3)** ved tool calling for å unngå hallusinerte parametre
  - Serverless-begrensninger som gjelder oss: **harde rate limits**, **smalere modellutvalg** enn on-demand, **delt kapasitet** (latens varierer med last), og **ingen egne modeller**
  - ⚠️ **Serverless har ingen region-pinning.** On-demand kan settes til `--region EUROPE`; serverless kan ikke. Det er en GDPR-avveining vi må ta bevisst — se §5
- **Ingen hardkodede modell-ID-er.** Modellkatalogen leser `FIREWORKS_MODEL_<ROLLE>` fra miljøet
- **Fusion / Council** (OpenRouter) for planlegging/resonnering — opt-in, «lei først, eie senere»; aldri i booking-stien
- **Guardrails L1–L5** (`packages/guardrails`) — se sikkerhetsdokumentet

### Database — `packages/db`
- **Scaleway Managed PostgreSQL (Frankrike, EU)** — Postgres 16, **RLS**, **pgvector** (HNSW-indeks). ⚠️ ERSTATTET Neon 09.08.2026 (brukergodkjent): en vanlig Postgres er påkrevd for langlevde `LISTEN/NOTIFY`-forbindelser, og vi holder oss til to leverandører totalt. Se `docs/deploy-plan.md`
- **Drizzle ORM** (schema-first, TS-typer genereres)
- **`pg_advisory_xact_lock`** for slot-låsing (transaksjons-skopet — påkrevd så snart en connection pooler er i bildet)
- Multi-tenant: `tenant_id` på hver rad, RLS på hver tabell
- Branch-per-PR = preview-miljøer med ekte DB

### Auth — `packages/auth`
- **Better-Auth 1.x** — organizations (multi-tenant), phone-number-plugin, twoFactor (e-post-OTP). Passkey (WebAuthn) er MIDLERTIDIG UTSATT (17.07.2026): `@better-auth/passkey` dro inn et foreldet @better-auth/core-1.4.x-subtre (peer-drift) og ingen klientflyt brukte den. Pakke + plugin fjernet, `passkey`-tabellen beholdt dormant. Reaktiveres når WebAuthn-flyten bygges. Se roadmap-endringer.md.
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
- **Vercel Git-integrasjon** (preview per PR) + GitHub Actions for test/lint. ⚠️ Uten Neon finnes ikke branch-per-PR-databaser lenger — preview-DB-strategi er et åpent punkt i `docs/deploy-plan.md`

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
│   └── framer-agent/     Scaleway Serverless Container — Framers Server API
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
| **Scaleway** | Postgres (Frankrike, EU) + Serverless Container + Key Manager | ⭐ ALL DATA hos én EU-leverandør. Vanlig Postgres → `LISTEN/NOTIFY` er til å stole på. Containeren kjører `apps/stream` med minst én instans |
| **Resend** | E-post | Transaksjonelt + Broadcasts (nyhetsbrev) + auth-eposter |
| **Twilio** | SMS / OTP | Verify som 2FA/OTP-sender |
| **Stripe** | SaaS-fakturering | Abonnement → entitlements (`tenant_modules`) |
| **Vercel Web Analytics** | Besøksstatistikk (NY 16.07.2026) | Cookieless/anonymisert (hash nullstilles daglig, ingen krysssporing). KUN på deploy — ikke localhost. Underdatabehandler (GDPR-veikart §8b) |
| **Quick API** | Datafundament | Varelager, bookinger, kunder — Endwise synker og speiler («Quick Lite») |
| **Vegvesen/Autosys** | Kjøretøyoppslag | Regnr → modell/EU-frist |
| **Finn.no, Lime CRM** | Salg / CRM | Egne adaptere |
| **Framer 3.0** | Widget-distribusjon + hovedside-agent | Plugin (widgets) + **Server API** (sideendring via chat, server-side). ⛔ Ikke community-MCP-pluginen — krever åpen klient, skalerer ikke til 250 forhandlere |
| **Composio** | Long-tail OAuth | Utsatt til konkret behov (f.eks. forhandlers Google Calendar) |
| **Mistral (EU)** | LLM | **Kundevendt.** All sluttkunde-fritekst. EU-hosting som standard; US-endepunktet er sperret i kode. Moderations-API-et driver scope-gaten (F14-05) |
| **Fireworks (serverless)** | LLM | **Intern drift.** Bak modellkatalog (`FIREWORKS_API_KEY` + `FIREWORKS_MODEL_*`). Per token, harde rate limits, ingen region-pinning |
| **OpenRouter** | LLM | Kun for Fusion/Council (planlegging) — aldri i booking-stien |

**⚠️ Åpent punkt — GDPR og Fireworks serverless:** hele arkitekturen ellers er EU-bundet (Vercel cdg1 Paris, Scaleway Frankrike). Fireworks **serverless** tilbyr ikke region-valg — det gjør bare on-demand-deployments (`--region EUROPE`). Så lenge agentene kun får se tenant-skopede driftsdata (bookinger, tjenester), er eksponeringen begrenset, men den er ikke null. Skal kundedata eller fritekst fra kunder inn i prompten, må dette avklares — enten med DPA/SCC, eller ved å flytte til on-demand i EU-regionen. **Eier er informert (14.07.2026).**

**Betaling sluttkunde→forhandler (forskudd i widget):** ADR-001 fortsatt åpen — Nets Easy vs Stripe+Vipps, tiltet mot Stripe+Vipps siden Stripe alt er valgt for fakturering.

---

## 6. Hva vi bevisst IKKE bruker

Hetzner · Coolify · Traefik · NestJS · Encore · BullMQ · QStash · Trigger.dev · Redis (som fast avhengighet) · Unleash · Cloudflare WAF · WAL-G · Lucia · Postmark · dither-kit (fjernet fra UI-et 03.08.2026 — filene ligger, men er ikke eksportert) · Vercel Edge Config (betalt flagg-lagring — DB-basert flagg valgt) · OpenAI (som LLM-leverandør — Fireworks serverless er valgt) · Composio Sandbox/e2b (Endwise-agenter kjører ikke vilkårlig kode; Framer-agenten har et FAST verktøysett) · **Framer community-MCP-plugin** (lagt til 11.08.2026 — krever en åpen Framer-klient på en persons maskin; kan ikke kjøre i kø, ikke kjøre når lokket er lukket, og skalerer ikke til 250 forhandlere. Framers offisielle Server API er valgt).

Ser du noen av disse i repoet, er det en rest som skal fjernes.

---

## 7. Kostnadsmodell (kort)

Fra fast infrastruktur til bruksbasert: Vercel Pro + Fluid Active CPU · Scaleway Managed PostgreSQL + Serverless Container (alltid på, altså ikke scale-to-zero) · Vercel Blob · Resend/Twilio/Stripe pay-per-use. Ved pilotskala trolig billigere enn den forkastede Hetzner-topologien; ved full skala er samtidige SSE-tilkoblinger kostdriveren å overvåke (budsjettalarm i Vercel fra uke 1).
