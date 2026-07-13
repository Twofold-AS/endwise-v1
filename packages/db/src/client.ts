import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { APP_TENANT_SETTING } from './rls.ts';
import * as schema from './schema/index.ts';

export type Database = ReturnType<typeof createDb>;

/**
 * Neon-pooling. Merk (techstack §2): fordi vi kjører gjennom pooler er
 * `pg_advisory_xact_lock` (transaksjons-skopet) det eneste gyldige låse-
 * primitivet — session-skopede låser overlever ikke poolen.
 */
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema, casing: 'snake_case' });
}

/**
 * F0-03 — Eneste lovlige inngang til tenant-data.
 * Setter `app.tenant_id` LOKALT i transaksjonen, slik at RLS-policyene
 * (se rls.ts) filtrerer. Aldri `SET` uten `LOCAL` — det ville lekket
 * tenant-konteksten videre til neste låner av pool-forbindelsen.
 */
export async function withTenant<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config(${APP_TENANT_SETTING}, ${tenantId}, true)`,
    );
    return fn(tx);
  });
}
