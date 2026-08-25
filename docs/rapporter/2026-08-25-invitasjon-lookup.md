# Rapport — 25.08.2026 — invitasjonssiden 42883 (F1-10)

## 1. Hva er gjort

**F1-10** — P0: invite-e-post virket, `/invitasjon/:token` viste «Klarte ikke hente invitasjonen» for mekaniker / selger / support.

Rotårsak (verifisert i kode, ikke gjetning):

1. `lookup_open_invitation(text)` er definert i **allerede kjørte** migrasjoner 0020 og 0021 (Scaleway er på 0026). Ingen 0027.
2. `packages/db/scripts/repair-0020.ts` kjørte `DROP FUNCTION` på **hver** `db:migrate` / `db:setup`. Når 0020/0021 står i journalen, hopper drizzle over CREATE. Funksjonen blir borte.
3. `pnpm db:grants` skulle skapt den på nytt via `sql/functions.sql`, men grants har historisk aldri fullført på Scaleway (Windows EBUSY). `grants.ts` sjekket bare `slett_forhandler`, ikke lookup.
4. Vercel: `function lookup_open_invitation(unknown) does not exist` (42883). Hono kastet; siden fikk ikke JSON og landet i catch. `(unknown)` er node-postgres uten cast — funksjonen fantes ikke i det hele tatt.
5. Mount/URL er riktig: siden `/invitasjon/:token` (entall), API `GET /invitasjoner/:token` (flertall). Ikke sti-kollisjonen fra 16.08.

Fiks:

- `repair-0020` DROPper bare når kontrakten mangler (text + `app.invitation_hash` + `platform_level`). Ferdig 0021-funksjon får stå.
- `db:grants` CREATE-er via functions.sql (DROP+CREATE, som #24) og **exit 1** uten lookup-kontrakten.
- Oppslaget caster `${hash}::text`.
- GET/POST returnerer JSON ved 42883 med samme setning som siden allerede viser. FORCE RLS / `invitations_open_by_hash` urørt.

PR #28, Quick CONNECT, Stripe og sidebar-navn urørt.

## 2. Hva gikk galt
Alt gikk som planlagt. Ingen blokkering. Context7 MCP var ikke i katalog (eksisterende Postgres/Drizzle-mønster i repoet).

## 3. Hvilke fikser ble gjort
- `packages/db/scripts/repair-0020.ts` — betinget DROP
- `packages/db/scripts/grants.ts` — verifiser lookup-kontrakt
- `packages/db/sql/functions.sql` — REVOKE PUBLIC, rev-markør
- `packages/modules/src/invitasjoner/index.ts` — `::text`
- `apps/api/src/routes/invitasjon.ts` — JSON ved oppslagsfeil
- `apps/web/app/invitasjon/[token]/page.tsx` — tåler ikke-JSON 500
- Tester: mons-p0-kontrakt, http-invitasjon, force-rls, eier-invitasjon-ui, invitasjoner

## 4. Neste steg
På Scaleway (eier-URL i `DATABASE_URL`, **ikke** app-rollen, ingen hemmeligheter i kommandoen):

```bash
pnpm db:grants
```

Loggen **MÅ** si:

`[db] grants + funksjoner kjørt (lookup_open_invitation + slett_forhandler rev=0026)`

Exit 1 = funksjonen ble ikke opprettet. Kjør på nytt (idempotent). `pnpm db:setup` går også (migrate er no-op på 0026; repair-0020 dropper ikke en riktig funksjon).

Etterpå: åpne en eksisterende staff-invite (`/invitasjon/<token>`). Skal vise forhandler + funksjon, ikke «Klarte ikke hente».

Ikke merge før review.
