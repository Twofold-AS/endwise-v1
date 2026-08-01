import { sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { pgPolicy } from 'drizzle-orm/pg-core';
import { authenticatedRole } from './roles.ts';

/**
 * F0-03 — RLS-mønsteret.
 *
 * Regel: HVER tabell har `tenant_id` og RLS påslått. Applikasjonen setter
 * `app.tenant_id` (transaksjons-lokalt) via `withTenant()`, og policyen under
 * er den eneste veien til data. Ingen tabell slipper unna.
 */
export const APP_TENANT_SETTING = 'app.tenant_id';

/**
 * Gjeldende tenant fra session-variabelen. NULL => ingen rader synlige.
 *
 * `nullif(..., '')` er IKKE kosmetikk. Etter at en transaksjon med
 * `set_config(..., is_local => true)` er avsluttet, tilbakestiller Postgres
 * GUC-en til TOM STRENG — ikke til NULL. Uten nullif ville neste spørring på
 * den gjenbrukte pool-forbindelsen kaste
 * `invalid input syntax for type uuid: ""` i stedet for å returnere null rader.
 * Funnet av F1-08-testene mot en ekte database.
 */
export const currentTenantId = sql`nullif(current_setting(${sql.raw(`'${APP_TENANT_SETTING}'`)}, true), '')::uuid`;

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
