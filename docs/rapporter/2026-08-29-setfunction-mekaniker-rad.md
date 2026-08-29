# Øktrapport 29.08.2026 — setFunction synker mechanics-rad

**Roadmap:** F1-14 (`done`) · F1-10 (`done`, urørt invitasjonssti)

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-14** | `team.setFunction` synker `mechanics` når funksjonen blir eller slutter å være mekaniker. Landing = `job_function`. Tildelbarhet = `mechanics`-rad med `active=true`. |
| **F1-14** | Engangs backfill `0032_mekaniker_rad_backfill` for alle tenants: `job_function=mekaniker` uten `mechanics.user_id`-rad får en rad. Idempotent (`NOT EXISTS`). Ingen hardkodet forhandler. |
| **F1-14** | Tester: setFunction til mekaniker oppretter/aktiverer; bort deaktiverer og faller ut av list/match; tilbake aktiverer samme rad; backfill er idempotent. |

## 2. Hva gikk galt

Alt gikk som planlagt for fiksen. Context.dev MCP krevde innlogging og ble ikke brukt. Docker fantes ikke i miljøet — lokal Postgres ble satt opp for TDD. `jobbfunksjon.test.ts` har et eksisterende landing-avvik (`/oppstart` vs `/dashboard` når onboarding mangler) som ikke røres her.

## 3. Hvilke fikser ble gjort

1. `synkMekanikerRad` — upsert/aktiver ved mekaniker, deaktiver ved annet. Sletter ikke bookinger.
2. `team.setFunction` og `opprettUtenInvitasjon` bruker helperen (samme form som invite: navn + capacity).
3. Migrasjon 0032: tenant-løkke via `organization` (ingen RLS) + `app.tenant_id` per tenant, slik FORCE RLS holder.
4. UI invaliderer `mechanics.list` / `oversikt` etter setFunction, så jobbpicker oppdateres uten reload.

## 4. Neste steg

Etter merge: `pnpm db:migrate` mot Scaleway (0032). Mikael-moto dekkes av den samme loopen som alle andre tenants. Invitasjonsstien er uendret.
