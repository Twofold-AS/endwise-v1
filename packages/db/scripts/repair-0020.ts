import { Pool } from 'pg';
import { pgConnectionConfig } from '../src/client.ts';

/**
 * 0020 brukte CREATE OR replace lookup_open_invitation uten DROP.
 * Postgres kan ikke endre RETURNS via OR replace — Scaleway db:setup
 * kan ha stoppet her. DROP først, så kan 0020/0021 kjøres om igjen.
 * Prod (42883)
 * Denne scriptet kjørte DROP på hver `db:migrate` / `db:setup`. Når 0020
 * og 0021 allerede står i journalen (Scaleway er på 0026), hopper drizzle
 * over CREATE, og funksjonen blir borte. `db:grants` skulle skapt den på
 * nytt via functions.sql — men grants har historisk feilet på Windows
 * (ebusy). Resultat: invite-siden 500 / «Klarte ikke hente invitasjonen».
 * DROP bare når funksjonen mangler den kontrakten 0021 innførte
 * (platform_level + app.invitation_hash). Er den allerede riktig: hopp over.
 * Mangler den etter at 0021 er merket kjørt: grants.ts CREATE-er den.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL mangler. Opprett .env (cp .env.example .env) og start DB: `pnpm db:up`.',
  );
}

const pool = new Pool(pgConnectionConfig(url));

const kontrakt = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'lookup_open_invitation'
       and pg_get_function_identity_arguments(p.oid) in ('text', 'p_token_hash text')
       and strpos(p.prosrc, 'app.invitation_hash') > 0
       and strpos(pg_get_function_result(p.oid), 'platform_level') > 0
       and strpos(pg_get_function_result(p.oid), 'job_function') > 0
       and strpos(pg_get_function_result(p.oid), 'expires_at') > 0
  ) as ok
`);

if (kontrakt.rows[0]?.ok === true) {
  await pool.end();
  console.info('[db] repair-0020: lookup_open_invitation allerede på plass — hopper over DROP');
} else {
  await pool.query('drop function if exists lookup_open_invitation(text)');
  await pool.end();
  console.info(
    '[db] repair-0020: lookup_open_invitation droppet om den fantes (feil/mangler RETURNS). ' +
      '0020/0021 eller `pnpm db:grants` oppretter den på nytt.',
  );
}
