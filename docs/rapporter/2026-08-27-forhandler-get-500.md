# Øktrapport 27.08.2026 — forhandler.get 500

**Roadmap:** F5-13 (`progress`) · F8-01 (`progress`) · F8-02 (`progress`)

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-13** | `forhandler.get` (og inspect `verksted.forhandleren`) returnerer tenant-navn/slug + tomme butikkfelt når `dealer_profiles` mangler, i stedet for 500. leftover som ikke er objekt blir `{}`. |
| **F8-01** | Ingen endring i Quick-gateway. Samme 500-vindu som `quick.pullNow` peker på manglende `dealer_profiles`. |
| **F8-02** | Koblinger/priser/SMS/shop/sidebar urørt. |

**Migrasjon:** 0030 (tabell) + **0031** (IF NOT EXISTS + GRANT + FORCE RLS). Prod må kjøre `pnpm db:setup` — koden alene fjerner 500 på get, men pull/lagring av kortet krever tabellen.

## 2. Hva gikk galt

Vercel `get_runtime_errors` hadde ingen stack for `/trpc/forhandler.get`. Request `f5qjj-1787811824557-ba3661605b7d` og tre til på `dpl_9yis1ubfm52pDLCwt1BVRjxSTtkh` (06:23:36–44Z, 06:24:39Z) var 500 uten body. Samme deployment: `POST /trpc/quick.pullNow` 500 kl. 06:24:53Z. Begge skriver/leser `dealer_profiles` (0030, merget i #67). Manglende rad ville allerede gitt tomme felt; 500 krever Postgres-feil (42P01/42703/42501). Context.dev MCP ikke brukt.

## 3. Hvilke fikser ble gjort

1. `hentForhandlerKort`: ny transaksjon ved manglende tabell/kolonne (ikke catch i samme tx — Postgres avbryter den).
2. `somLeftover` / `tomtForhandlerKort` — leftover alltid Record, ingen oppdiktede felt.
3. UI tåler leftover som array/primitiv.
4. 0031 idempotent GRANT + FORCE RLS.
5. Tester for klassifisering, leftover, retry og kilde-kontrakt.

## 4. Neste steg

- Kjør `pnpm db:setup` på Scaleway/prod (0030+0031). Uten det: get viser ærlig tomt kort; «Hent nå»/Lagre kan fortsatt feile.
- Ikke merget.
