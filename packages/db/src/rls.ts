import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { authenticatedRole } from './roles.ts';

/**
 * F0-03 — RLS-mønsteret.
 *
 * Regel: HVER tabell har `tenant_id` og RLS påslått. Applikasjonen setter
 * `app.tenant_id` (transaksjons-lokalt) via `withTenant()`, og policyen under
 * er den eneste veien til data. Ingen tabell slipper unna.
 */
export const APP_TENANT_SETTING = 'app.tenant_id';

/** Gjeldende tenant fra session-variabelen. NULL => ingen rader synlige. */
export const currentTenantId = sql`current_setting(${sql.raw(`'${APP_TENANT_SETTING}'`)}, true)::uuid`;

/**
 * Standard tenant-isolasjonspolicy. Brukes på hver tenant-skopet tabell:
 *
 *   export const foo = pgTable('foo', {...}, (t) => [tenantPolicy('foo', t.tenantId)]).enableRLS();
 */
export function tenantPolicy(tableName: string, tenantIdColumn: PgColumn) {
  return pgPolicy(`${tableName}_tenant_isolation`, {
    as: 'permissive',
    for: 'all',
    to: authenticatedRole,
    using: sql`${tenantIdColumn} = ${currentTenantId}`,
    withCheck: sql`${tenantIdColumn} = ${currentTenantId}`,
  });
}
