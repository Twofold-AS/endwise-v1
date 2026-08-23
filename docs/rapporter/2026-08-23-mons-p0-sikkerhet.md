# Rapport — Mons P0 etter NO-GO på main (a840318)

23.08.2026 · F5-11 / F1-07 / F1-10

## 1. Hva er gjort

### Inspect — for mye PII (CWE-284 / CWE-200)
- `withPlatformInspect` setter `app.platform_inspect` (forhandler-UUID), ikke `app.tenant_id`.
- Sesjonen blir på plattform-org. Ingen `organization.setActive` for Se verkstedet.
- Smale SELECT-policyer i 0021: bookings, mechanics, services, service_versions, vehicles, `dealer_admin`-tråder/meldinger. **Ingen** `customers_platform_inspect_read`.
- Inspect-ruter dumper ikke e-post/telefon. Innboks filtrerer `kind = dealer_admin`. Mutations er fortsatt 403 «Kun lesing».
- Én auditert skrive-sti: `postPlatformSupportReply` (innboks-svar) + `audit_log` `platform.support.reply`. Ingen generisk `withTenant(dealerId)` fra inspect-routeren.

### 0019 for bred (CWE-200)
- 0019-fila urørt (journal-hash). 0021 DROPper og lager tettere policyer: `th.tenant_id = messages.tenant_id`.
- Last-message-subquery i `listPlatformSupportThreads` binder `m.tenant_id` til trådens tenant.

### 0020 lookup / CHECK / hash (CWE-284, DEFINER)
- 0020-fila urørt. 0021: `DROP FUNCTION lookup_open_invitation(text)` deretter CREATE med `platform_level`.
- `db:migrate` = `db:repair-0020` + drizzle-kit: DROPper `lookup_open_invitation` **før** 0020 kjøres, så CREATE OR REPLACE ikke dør på ny RETURNS. 0021 DROPper og CREATE-er på nytt. `drizzle.config.ts` bruker host+`ssl: { rejectUnauthorized: false }` (Scaleway-CA) — url+sslmode alene ga exit 1 med bare SSL-advarsler.
- CHECK `invitations_platform_level_role`: `endwise_admin`↔`administrator`, `endwise_support`↔`support`.
- Hash-policy er SELECT + UPDATE, ikke FOR ALL (`grants.sql` + 0021).
- Godta krever `kind === 'platform'` ⇒ `erPlattformTenant`. Samme sjekk i `opprettPlatform`.

### Eier-lås (CWE-284)
- Before-hook (`eierLasForHook` inne i `byttPassordForHook`, samme `endwiseId`) nekter `update-member-role` / `remove-member` på første `endwise_admin` på org `slug=endwise`.
- DB-trigger `eier_las_member` BEFORE UPDATE OR DELETE ON `member`.

### Quick (CWE-200)
- `testConnection` persisterer `quickProbeUserMessage`, ikke `error.message`.
- Token maks 512. Probe-body maks 256_000, målt på faktisk body (ikke bare Content-Length).
- HTTP 500 uten Vercel/allowlist i klienttekst.

### Bevisst ikke rørt
- `slett_forhandler` (Mons: H5 er ikke et reelt hull).
- Dealer-priser, SMS, shop, Admin-tab.
- 0019/0020 SQL-innhold (journal).

## 2. Hva gikk galt
Alt gikk som planlagt. Context7 MCP var ikke tilgjengelig; API-er ble verifisert mot repoet (hypotese → lesing). Ingen Docker-`DATABASE_URL` i denne økta — isolasjonstesten `platform-inspect.test.ts` skippes uten APP_DATABASE_URL.

## 3. Hvilke fikser ble gjort
Se §1. Kontraktstester i `packages/db/test/mons-p0-kontrakt.test.ts` og oppdaterte inspect/invite/Quick/eier-tester.

## 4. Neste steg
- Etter merge: **`pnpm db:setup`** mot sesjonens `DATABASE_URL` (Scaleway), **ikke** Docker.
  Det er `db:migrate` (DROP lookup + 0020 + **0021_mons_p0_sikkerhet**) og `db:grants`. Ingen rå SQL.
- GJENSTÅR på F5-11: `support-endwise-agent` som førstelinje.
