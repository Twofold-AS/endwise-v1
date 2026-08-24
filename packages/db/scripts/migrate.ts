import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { pgConnectionConfig } from '../src/client.ts';

/**
 * Samme tilkobling som appen / grants.ts — ikke drizzle-kit sin Pool med
 * `ssl: {}` som slår på TLS mot localhost (DEPTH_ZERO_SELF_SIGNED_CERT)
 * og gjemmer Postgres-feilen bak hanji-spinneren.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL mangler. Opprett .env (cp .env.example .env) og start DB: `pnpm db:up`.',
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const pool = new Pool(pgConnectionConfig(url));
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: join(here, '..', 'drizzle') });
  console.info('[db] migrate ferdig');
} catch (error) {
  console.error('[db] migrate feilet');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
