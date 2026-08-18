import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { APP_TENANT_SETTING } from './rls.ts';
import * as schema from './schema/index.ts';

export type Database = ReturnType<typeof createDb>;

/**
 * Driver: node-postgres (`pg`) over vanlig TCP.
 *
 * Vanlig TCP fungerer mot både Docker-basen vi utvikler mot og Scaleway
 * Managed PostgreSQL i produksjon (besluttet 09.08.2026). Serverless-drivere
 * som snakker WebSocket til en leverandørs egen proxy er bevisst unngått: de
 * kan ikke koble til en vanlig Postgres, og de ville låst oss til én leverandør.
 *
 * ⚠️ Pooling: låsing bruker `pg_advisory_xact_lock` (TRANSAKSJONS-skopet), ikke
 * session-skopet. Går man gjennom en pooler — og Scaleway tilbyr pgbouncer —
 * gjenbrukes forbindelser på tvers av forespørsler, og en session-lås ville
 * fulgt med neste låner. Transaksjonslåsen slippes av COMMIT/ROLLBACK uansett.
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

/**
 * F5-26 — Kryss-tenant LESNING for Endwise-admin. **Bruk med vett.**
 *
 * Setter `app.platform_admin` transaksjons-lokalt, som slår på den
 * SELECT-ONLY-policyen `tenants_platform_admin_read`. Den finnes fordi
 * `tenants`-policyen ellers gir **null rader** utenfor en tenant-kontekst — og
 * Endwise-admin må kunne se forhandlerlista.
 *
 * ⛔ **Tre regler, og de er ikke forhandlingsbare:**
 *
 *   1. Kalles KUN fra `endwiseAdminProcedure`. Rollen er sperren; dette er
 *      bare mekanismen som lar den gjøre jobben uten at RLS skrus av.
 *   2. Policyen er `for: 'select'` uten `withCheck`. **Skriving på tvers av
 *      tenants er fortsatt umulig**, også for oss.
 *   3. Den gjelder KUN `tenants`-tabellen. Ingen annen policy ser på denne
 *      GUC-en, så den kan ikke åpne kunde-, booking- eller meldingsdata.
 *
 * Alternativet — å koble til som DB-eier for akkurat denne spørringen — ville
 * omgått RLS fullstendig og gjort den ene lesestien til den ene uten isolasjon.
 * Dette er det smalest mulige hullet som løser problemet.
 */
export async function withPlatformAdmin<T>(
  db: Database,
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
    return fn(tx);
  });
}
