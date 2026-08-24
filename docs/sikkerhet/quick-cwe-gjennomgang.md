# Quick-integrasjonen — CWE-sikkerhetsgjennomgang

**Dato:** 2026-07-18 · **Omfang:** hele Quick-integrasjonen (F8-01/F8-02) — toolkit-klient,
envelope-crypto, `integration_config`, config-service, synk/tre-veis-fletting, konflikter,
tRPC-rutere, cron-rute, UI.

**Metode:** manuell CWE-gjennomgang + uavhengig andregangs-gjennomgang (subagent). Angrepsflaten
er spesiell: en **ekstern API** (Quick), **hemmeligheter** (per-tenant token) og en
**brukerkonfigurert URL** (dealer_admin skriver inn Quick-instansens baseUrl). Det siste gjør SSRF
til den viktigste trusselen — dette er delt Endwise-infra, ikke tenant-scopet.

> Alle utnyttbare funn er **fikset i denne økten**. Tabellen under markerer status.

## Funn og status

| CWE | Komponent | Alvorlighet | Funn | Fiks / status |
|---|---|---|---|---|
| **CWE-918 SSRF** | `toolkit-quick/client.ts`, `routers/quick.ts` (setConfig) | **Høy** | `baseUrl` ble kun validert med `z.string().url()`. `http://`, `169.254.169.254` (sky-metadata), `localhost`, RFC1918, `[::1]` osv. passerte. `fetch` fulgte 3xx-redirects (bypass). | **FIKSET.** Ny `assertAllowedQuickUrl` (`url-guard.ts`): kun `https`, allowlist `*.quick.no` (env-overstyrbar), blokkerer IP-literaler/localhost/credentials/ikke-standard port. Validert **både** ved `setConfig` (før lagring) og i `createQuickClient` (før hver fetch). `redirect: 'error'` på fetch. 19 enhetstester (`url-guard.test.ts`). |
| **CWE-400/770 DoS** | `toolkit-quick/client.ts` | **Høy** (heng) / **Middels** (OOM) | Ingen HTTP-timeout → hengende Quick blokkerer pull/cron uendelig. Ingen tak på responsstørrelse/rader → fiendtlig svar kan OOM-e. | **FIKSET.** `AbortSignal.timeout(15s)` per kall; `Content-Length`-sjekk (`MAX_RESPONSE_BYTES` 25 MB); rad-tak `MAX_ROWS_PER_SYNC` (500k) + `MAX_PAGES` (10k) i pagineringen. |
| **CWE-306/862 fail-open** | `routes/cron/quick-pull.ts` | **Middels–Høy** | `if (secret && …)` — uten `CRON_SECRET` ble endepunktet OFFENTLIG, og `?force=1` forbigår tidsgaten → uautentisert trigger av full pull for alle tenants. | **FIKSET.** Feiler nå **lukket**: mangler `CRON_SECRET` → 503; ellers konstant-tids Bearer-sjekk (`timingSafeEqual`). |
| **CWE-209/532 info-lekkasje** | `toolkit-quick/client.ts`, `routers/quick.ts` | **Lav–Middels** | Rå nettverks-`cause.message` ble reflektert til klient/`lastSyncDetail` — kan bære intern host/IP og gi et blind-SSRF-orakel. | **FIKSET.** Klienten kaster nå generiske meldinger («Nådde ikke Quick», «Tidsavbrudd mot Quick», «Quick svarte N») — aldri rå cause. Token er aldri i noen feilmelding. |
| **CWE-522/311/312/798 credentials** | `db/crypto.ts`, `modules/quick/config.ts` | **Ikke-aktuelt (trygt)** | — | Token envelope-kryptert (AES-256-GCM), unik 12-byte IV per kryptering, auth-tag verifisert. KEK fra env (`ENDWISE_KEK`), ikke hardkodet, **feiler lukket** (kaster hvis mangler). Token returneres ALDRI til klient (`getView` gir kun `hasToken`); `getDecrypted` er server-intern. Ingen token-logging. |
| **CWE-863/862 authz** | `routers/quick.ts`, `routers/conflicts.ts`, `init.ts` | **Ikke-aktuelt (trygt)** | — | `setConfig`/`testConnection`/`pullNow`/`pushNow`/`conflicts.list|count|resolve` er alle `adminProcedure` (kun dealer_admin/endwise_admin). Alt via `withTenant` → RLS. `config`-query er read-only og lekker ikke token. RLS-isolasjon bekreftet med angrepstest (A ser/løser ikke B sin config/token/konflikt). |
| **CWE-20/502 input** | `toolkit-quick/schema.ts`, `sync.ts` | **Lav** | Quick-respons er `.loose()` (bevarer ukjent). | Validert med zod før upsert; `mapQuickCustomer` bygger ferskt objekt kun fra kjente felt → ingen prototype pollution. Minne-risiko dekket av CWE-770-takene. Anbefaling: bytt til `.strip()` når feltene er bekreftet mot Test_Public. |
| **CWE-352 CSRF** | tRPC-mutasjoner | **Lav (app-nivå)** | — | Mutasjoner er POST via tRPC over Better-Auth cookie-sesjon; app-nivå SameSite-cookie + JSON-content-type gir CSRF-vern. Ikke introdusert/regressert av denne integrasjonen. |
| **CWE-89 SQLi** | `sync.ts`, `conflicts.ts`, `config.ts` | **Ikke-aktuelt** | — | Alt via Drizzle query-builder (parameterisert). `sql`-fragmenter er statiske (`now()`, `status = 'open'`). Ingen rå interpolasjon av brukerinput. |

## Restrisiko (dokumentert, ikke fikset)

- **F1-07 live probe (24.08.2026):** `setConfig` / `onboarding.fullfor` kaller ikke Quick
  fra Vercel. Live GET `client/info` kjører i forhandlerens nettleser (Quick CORS:
  `Access-Control-Allow-Origin: *`, `Authorization` i allow-headers). Residual
  `testConnection` og pull går fortsatt fra fra1 og kan 500 mot Quick allowlist —
  500 mappes ikke som ugyldig nøkkel.
- **DNS-rebinding** mot `*.quick.no`: allowlisten er domene-basert; et angrep der Quicks DNS
  resolver til en intern IP krever kompromittert Quick-DNS — utenfor dealer-admin-trusselmodellen.
  `redirect: 'error'` stopper 3xx-omdirigering. Full binding krever IP-pinning ved connect (ikke
  lett med `fetch`); notert som en mulig senere herding.
- **CWE-863 tilkoblingsrolle:** RLS-isolasjonen holder kun hvis runtime-tilkoblingen (`DATABASE_URL`)
  IKKE er tabelleier/`BYPASSRLS`. Dette er en drifts-/miljøkontroll (appen skal koble som
  `authenticated`/`endwise_app`). RLS-testene kjører mot `APP_DATABASE_URL` nettopp for å bevise
  isolasjonen. Bekreft rollen i prod.
- ~~Samme fail-open-mønster (`if (secret && …)`) finnes i `cron/cleanup.ts` og `cron/retention.ts`~~
  **RYDDET 2026-07-18 (f):** alle cron-ruter bruker nå den delte `cronAuth`-middleware
  (`apps/api/src/lib/cron-auth.ts`) som feiler lukket. Se oppfølgingsseksjonen under.

## Oppfølging (f): fail-open ryddet på tvers av alle cron-ruter

**Kartlagt alle eksternt trigg­bare endepunkter** (apps/api, apps/stream, framer-agent):

| Endepunkt | Type | Autentisering | Status |
|---|---|---|---|
| `POST /stripe/webhook` | webhook | Stripe-signatur (`constructEvent`) | ✔ Feiler lukket (503 uten `STRIPE_WEBHOOK_SECRET`, 400 ved signaturfeil) |
| `GET /cron/quick-pull` | cron | `cronAuth` | ✔ Fail-closed (fikset (c)/(e), nå delt guard) |
| `GET /cron/cleanup` | cron | `cronAuth` | ✅ **Var fail-open → fikset** |
| `GET /cron/retention` | cron | `cronAuth` (sletter data!) | ✅ **Var fail-open → fikset** |
| `GET /sse` (stream) | SSE | `requireSession` + `assertMember` + connection-caps | ✔ Feiler lukket (401/403/429) |
| `GET /health` (api/stream/framer) | status | ingen (bevisst) | ✔ Harmløst (ingen data/handling) |

**Fiks:** delt `cronAuth`-middleware (`apps/api/src/lib/cron-auth.ts`) — 503 uten `CRON_SECRET`,
401 ved feil/manglende Bearer, konstant-tids sammenligning. Én implementasjon brukt av alle tre
cron-ruter, så mønsteret ikke kan drifte fra hverandre igjen. Ingen query-param (`?force=1`)
forbigår den (kjører som middleware før handleren). Testet: `apps/api/test/cron-auth.test.ts`
(ren `evaluateCronAuth` verifisert 7/7 standalone + in-memory Hono `app.request`-tester for CI).
