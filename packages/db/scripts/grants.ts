import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { pgConnectionConfig } from '../src/client.ts';

/** Kjører sql/grants.sql som eier. Idempotent — kan kjøres om igjen. */
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    'DATABASE_URL mangler. Opprett .env (cp .env.example .env) og start DB: `pnpm db:up`.',
  );

const here = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(join(here, '..', 'sql', 'grants.sql'), 'utf8');
// F14-16: redact_audit_log() er SECURITY DEFINER og MÅ opprettes av eieren.
const functions = readFileSync(join(here, '..', 'sql', 'functions.sql'), 'utf8');

const pool = new Pool(pgConnectionConfig(url));
await pool.query(grants);
await pool.query(functions);

const rev = await pool.query<{ rev0025: boolean }>(`
  select strpos(p.prosrc, 'slett_forhandler_rev=0025') > 0 as rev0025
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'slett_forhandler'
     and pg_get_function_identity_arguments(p.oid) = 'uuid'
`);
if (!rev.rows[0]?.rev0025) {
  console.error(
    '[db] slett_forhandler er ikke rev 0025 (DROP+CREATE feilet). ' +
      'Kjør `pnpm db:setup` på nytt mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

await pool.end();
console.info('[db] grants + funksjoner kjørt (slett_forhandler rev=0025)');
