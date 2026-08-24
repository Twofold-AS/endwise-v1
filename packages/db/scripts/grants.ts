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

// pg_get_function_identity_arguments(oid) for slett_forhandler(p_tenant_id uuid)
// returnerer «p_tenant_id uuid», ikke «uuid». Filtrer derfor på navn + prosrc,
// ikke på eksakt identity-streng — godta begge formene.
const rev = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'slett_forhandler'
       and strpos(p.prosrc, 'slett_forhandler_rev=0026') > 0
  ) as ok
`);
if (rev.rows[0]?.ok !== true) {
  const funnet = await pool.query<{ identity: string; snippet: string }>(`
    select pg_get_function_identity_arguments(p.oid) as identity,
           left(p.prosrc, 240) as snippet
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'slett_forhandler'
  `);
  console.error(
    '[db] slett_forhandler er ikke rev 0026 (DROP+CREATE feilet). ' +
      'Kjør `pnpm db:setup` på nytt mot Scaleway-eieren.',
  );
  if (funnet.rows.length === 0) {
    console.error('[db] public.slett_forhandler finnes ikke.');
  } else {
    for (const rad of funnet.rows) {
      console.error(`[db] funnet slett_forhandler(${rad.identity}): ${rad.snippet}`);
    }
  }
  await pool.end();
  process.exit(1);
}

await pool.end();
console.info('[db] grants + funksjoner kjørt (slett_forhandler rev=0026)');
