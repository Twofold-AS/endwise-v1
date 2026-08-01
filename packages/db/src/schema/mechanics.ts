import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * Mekaniker.
 *
 * MERK: ferdighetene ligger IKKE her. De bor i `mechanic_skills` (F3-12), fordi
 * en ferdighet er mer enn et ord — den har nivå, sertifisering og utløpsdato.
 * Én kilde til sannhet: matcheren (F3-02) leser derfra, ikke herfra.
 */
export const mechanics = pgTable(
  'mechanics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Better-Auth-bruker, når mekanikeren har PWA-tilgang (F7). */
    userId: text('user_id'),
    name: text('name').notNull(),
    /** Samtidige jobber mekanikeren kan ha. 1 = én om gangen. */
    capacity: integer('capacity').notNull().default(1),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('mechanics_tenant_active_idx').on(t.tenantId, t.active),
    tenantPolicy('mechanics', t.tenantId),
  ],
).enableRLS();

export type Mechanic = typeof mechanics.$inferSelect;
export type NewMechanic = typeof mechanics.$inferInsert;
