import { sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { pgPolicy } from 'drizzle-orm/pg-core';
import { authenticatedRole } from './roles.ts';

/**
 * RLS-mønsteret.
 * Regel: hver tabell har `tenant_id` og RLS påslått. Applikasjonen setter
 * `app.tenant_id` (transaksjons-lokalt) via `withTenant`, og policyen under
 * er den eneste veien til data. Ingen tabell slipper unna.
 */
export const APP_TENANT_SETTING = 'app.tenant_id';

/**
 * Se verkstedet — smal guc. Verdi er forhandlerens UUID, ikke `'on'`.
 * Aldri bytt `app.tenant_id` for inspect: da åpner force RLS hele tenanten.
 */
export const APP_INSPECT_SETTING = 'app.platform_inspect';

/** F31 / white label F10 — kundens egen rad. Tom streng = ingen rader. */
export const APP_CUSTOMER_SETTING = 'app.customer_id';
/** `customer` | tom. RESTRICTIVE-policyer slår inn bare når verdien er customer. */
export const APP_ACTOR_SETTING = 'app.actor';

/**
 * Gjeldende tenant fra session-variabelen. NULL => ingen rader synlige.
 * `nullif(..., '')` er ikke kosmetikk. Etter at en transaksjon med
 * `set_config(..., is_local => true)` er avsluttet, tilbakestiller Postgres
 * Guc-en til tom streng — ikke til NULL. Uten nullif ville neste spørring på
 * den gjenbrukte pool-forbindelsen kaste
 * `invalid input syntax for type uuid: ""` i stedet for å returnere null rader.
 * Funnet av F1-08-testene mot en ekte database.
 */
export const currentTenantId = sql`nullif(current_setting(${sql.raw(`'${APP_TENANT_SETTING}'`)}, true), '')::uuid`;

export const currentInspectTenantId = sql`nullif(current_setting(${sql.raw(`'${APP_INSPECT_SETTING}'`)}, true), '')::uuid`;

export const currentCustomerId = sql`nullif(current_setting(${sql.raw(`'${APP_CUSTOMER_SETTING}'`)}, true), '')::uuid`;

export const currentActor = sql`nullif(current_setting(${sql.raw(`'${APP_ACTOR_SETTING}'`)}, true), '')`;

/**
 * Når `app.actor='customer'` må raden tilhøre `app.customer_id`.
 * Ellers (ansatt, inspect, tom actor) er sjekken sann — tenant-policy gjelder.
 * RESTRICTIVE + PERMISSIVE AND. Feiler lukket.
 */
export function customerRestrictivePolicy(tableName: string, customerIdColumn: PgColumn) {
  return pgPolicy(`${tableName}_customer_own`, {
    as: 'restrictive',
    for: 'all',
    to: authenticatedRole,
    using: sql`${currentActor} is distinct from 'customer' or ${customerIdColumn} = ${currentCustomerId}`,
    withCheck: sql`${currentActor} is distinct from 'customer' or ${customerIdColumn} = ${currentCustomerId}`,
  });
}

/**
 * F33 / white label F11b — meldinger og deltakere har ikke egen customer_id.
 * Når actor=customer må tråden være koblet til app.customer_id.
 */
export function customerRestrictiveViaThread(tableName: string, threadIdColumn: PgColumn) {
  return pgPolicy(`${tableName}_customer_own`, {
    as: 'restrictive',
    for: 'all',
    to: authenticatedRole,
    using: sql`${currentActor} is distinct from 'customer' or exists (
      select 1 from threads th
      where th.id = ${threadIdColumn}
        and th.customer_id = ${currentCustomerId}
    )`,
    withCheck: sql`${currentActor} is distinct from 'customer' or exists (
      select 1 from threads th
      where th.id = ${threadIdColumn}
        and th.customer_id = ${currentCustomerId}
    )`,
  });
}

/**
 * SELECT-only inspect-policy bundet til `app.platform_inspect`.
 * Ingen skriving. Ikke bruk på `customers` — kolonne-RLS kan ikke skjule e-post/telefon.
 */
export function inspectSelectPolicy(tableName: string, tenantIdColumn: PgColumn) {
  return pgPolicy(`${tableName}_platform_inspect_read`, {
    as: 'permissive',
    for: 'select',
    to: authenticatedRole,
    using: sql`${tenantIdColumn} = ${currentInspectTenantId}`,
  });
}

/**
 * Standard tenant-isolasjonspolicy. Brukes på hver tenant-skopet tabell:
 * export const foo = pgTable('foo', {...}, (t) => [tenantPolicy('foo', t.tenantId)]).enableRLS;
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
