import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_TENANT_SETTING } from './rls.ts';
import * as schema from './schema/index.ts';

export type Database = ReturnType<typeof createDb>;

/**
 * Driver: node-postgres (`pg`) over vanlig TCP.
 *
 * Hvorfor ikke @neondatabase/serverless: den snakker WebSocket til Neons proxy
 * og kan ikke koble til en vanlig Postgres — altså heller ikke Docker-basen vi
 * utvikler og kjører F1-08-testene mot. Neon er en ekte Postgres og tar imot
 * standard TCP fra `pg`. Databasen er den samme (techstack §2/§5), det er kun
 * klientdriveren som er den vanlige.
 *
 * Neon-pooling: fordi vi går gjennom pooleren er `pg_advisory_xact_lock`
 * (transaksjons-skopet) det eneste gyldige låse-primitivet — session-skopede
 * låser overlever ikke poolen.
 */
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema, casing: 'snake_case' });
}

/**
 * F0-03 — Eneste lovlige inngang til tenant-data.
 *
 * Setter `app.tenant_id` LOKALT i transaksjonen, slik at RLS-policyene filtrerer.
 * Aldri `SET` uten `LOCAL`/`is_local=true`: det ville lekket tenant-konteksten
 * videre til neste låner av pool-forbindelsen.
 *
 * MERK: kall alltid assertMember() (@endwise/auth) FØR denne. RLS stoler på
 * `app.tenant_id` — den verifiserer ikke at brukeren har lov til å be om den.
 */
export async function withTenant<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config(${APP_TENANT_SETTING}, ${tenantId}, true)`);
    return fn(tx);
  });
}
