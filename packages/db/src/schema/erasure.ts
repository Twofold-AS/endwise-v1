import { sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

export const erasureStatusEnum = pgEnum('erasure_status', [
  'requested',
  'in_progress',
  'completed',
  'partial',
  'failed',
]);

/**
 * F14-16 — Sletteforespørsler (art. 17).
 *
 * Denne tabellen slettes ALDRI. Det er ikke et paradoks — det er poenget:
 * beviset på at vi slettet må overleve slettingen. Uten den kan vi ikke
 * dokumentere etterlevelse (art. 5(2) ansvarlighet), og vi kan ikke svare på
 * «slettet dere faktisk?» to år senere.
 *
 * Den inneholder derfor ingen personopplysninger utover en **hash** av
 * subjektet, og en rapport over hva som ble slettet — ikke hva som sto der.
 */
export const erasureRequests = pgTable(
  'erasure_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),

    /** Hva slettes: 'customer' | 'user' | 'tenant'. */
    subjectType: text('subject_type').notNull(),
    /** ID-en på det som slettes. Beholdes for å kunne bevise HVA som ble slettet. */
    subjectId: text('subject_id').notNull(),

    /** Hvem ba om det: bruker-ID, 'dsr' (den registrerte selv), 'retention' (automatisk). */
    requestedBy: text('requested_by').notNull(),
    status: erasureStatusEnum('status').notNull().default('requested'),

    /**
     * Rapporten. Per ledd: hva ble slettet, hvor mange rader — og hva som IKKE
     * lot seg slette, med begrunnelse. Ærligheten er en del av dokumentasjonen.
     */
    report: jsonb('report').$type<Record<string, unknown>>(),

    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().default(sql`now()`),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('erasure_requests_tenant_idx').on(t.tenantId, t.requestedAt),
    tenantPolicy('erasure_requests', t.tenantId),
  ],
).enableRLS();

export type ErasureRequest = typeof erasureRequests.$inferSelect;
export type NewErasureRequest = typeof erasureRequests.$inferInsert;
