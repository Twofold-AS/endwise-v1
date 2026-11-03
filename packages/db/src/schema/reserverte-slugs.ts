import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { authenticatedRole } from '../roles.ts';

/**
 * F16 / white label F0 — redigerbar reservert-liste.
 * Skriving bare med app.platform_admin. Kodefallback i
 * @endwise/modules/tenant-host er den harde sperren.
 */
export const reserverteSlugs = pgTable(
  'reserverte_slugs',
  {
    slug: text('slug').primaryKey(),
    grunn: text('grunn').notNull(),
    opprettetAt: timestamp('opprettet_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  () => [
    pgPolicy('reserverte_slugs_platform_admin', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on'`,
      withCheck: sql`current_setting('app.platform_admin', true) = 'on'`,
    }),
  ],
).enableRLS();

export type ReservertSlug = typeof reserverteSlugs.$inferSelect;
export type NewReservertSlug = typeof reserverteSlugs.$inferInsert;
