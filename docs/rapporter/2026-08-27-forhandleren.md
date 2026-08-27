# Øktrapport 27.08.2026 — Organisasjon › Forhandleren

**Roadmap:** F5-13 (`progress`) · F5-19 (`done`) · F8-01 (`progress`) · F8-02 (`progress`)

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-13** | Organisasjon▾ barn: Forhandleren · Team · Kompetanse · Timeplan. Rute `/organisasjon/forhandleren` (alias `/forhandleren`). Breadcrumb Organisasjon · Forhandleren. `/ansatte` lander på første barn. |
| **F5-19** | Settings forblir personen (visningsnavn, kallenavn, e-post) + Koblinger + billing. Ingen kallenavn/2FA på Forhandleren. |
| **F8-01** | `client/info` skrives på firmanavn + `dealer_profiles`. leftover i `quick_client` jsonb. Tom verdi overskriver ikke. slug urørt. Apply på setConfig/testConnection/pullNow (før katalog). Plattform-org urørt. |
| **F8-02** | Koblinger uendret. Etter pull/setConfig/test invalideres `session.me` og `forhandler.get`. |

### Felt → kolonne

| UI | Kolonne | Quick etter fold |
|---|---|---|
| Firmanavn | `tenants.name`, `organization.name` | `name`, ellers `company` |
| Slug | `tenants.slug` / `organization.slug` | skrives aldri |
| Orgnr | `dealer_profiles.orgnr` | `organizationNumber`, ellers `orgNo` |
| Adresse | `dealer_profiles.address` | `address` |
| Postnr | `dealer_profiles.postal_code` | `zipCode`, ellers `postalCode` |
| Poststed | `dealer_profiles.city` | `city` |
| Telefon | `dealer_profiles.phone` | `phone` |
| Forhandler-epost | `dealer_profiles.email` | `email` |
| Nettside | `dealer_profiles.website` | `website`, ellers `homepage` |
| Mer fra Quick | `dealer_profiles.quick_client` | leftover-nøkler |

Skriving: `dealer_admin` (`adminProcedure`). Inspect: `verksted.forhandleren` (kun lesing). Ingen `endwiseInspectProcedure` som kan skrive uten setActive.

## 2. Hva gikk galt

Alt gikk som planlagt i testharness. Context.dev MCP var ikke autentisert. Live Yamaha `client/info`-body er ikke logget — nøkler utenom `name`/`company` mappes bare når de finnes etter fold.

## 3. Hvilke fikser ble gjort

1. `dealer_profiles` + migrasjon 0030 (RLS + inspect-SELECT).
2. `mapQuickClientInfo` / `applyQuickDealerProfile` / `runIndependentOfCatalog`.
3. tRPC `forhandler.get`/`update` og inspect-lesing.
4. Forhandleren-kortet (norsk UI, slug read-only).

## 4. Neste steg

- Live «Hent nå» mot Yamaha: bekreft firmanavn og ev. adresse-nøkler.
- Hvis #65 merges først: rebase — denne PR-en er et supersett.
- `pnpm db:setup` for 0030.
