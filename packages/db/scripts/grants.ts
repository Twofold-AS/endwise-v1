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
await pool.end();
console.info('[db] grants + funksjoner kjørt');
