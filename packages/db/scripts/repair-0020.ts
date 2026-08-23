import { Pool } from 'pg';
import { pgConnectionConfig } from '../src/client.ts';

/**
 * 0020 brukte CREATE OR REPLACE lookup_open_invitation uten DROP.
 * Postgres kan ikke endre RETURNS via OR REPLACE — Scaleway db:setup
 * kan ha stoppet her. DROP først, så kan 0020/0021 kjøres om igjen.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL mangler. Opprett .env (cp .env.example .env) og start DB: `pnpm db:up`.',
  );
}

const pool = new Pool(pgConnectionConfig(url));
await pool.query('drop function if exists lookup_open_invitation(text)');
await pool.end();
console.info('[db] repair-0020: lookup_open_invitation droppet om den fantes');
