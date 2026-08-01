import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F8-01 — Synk-konflikter (tre-veis fletting). Én rad per felt der BÅDE Quick og
 * vi endret samme felt til ulik verdi siden forrige pull (se merge.ts).
 *
 * Generisk med vilje (`entity` + `entityId` + `field`) så booking/delelager/salg
 * arver samme konflikt-kø som kunder. RLS-scopet: forhandler A ser aldri B.
 *
 * Idempotens: partiell unik indeks på (tenant, provider, entity, entityId, field)
 * der `status='open'` → gjentatte pull-er OPPDATERER samme åpne konflikt i stedet
 * for å lage duplikater. Løste konflikter (`status='resolved'`) beholdes som spor.
 */
export const syncConflicts = pgTable(
  'sync_conflicts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Integrasjon, f.eks. 'quick'. */
    provider: text('provider').notNull(),
    /** Entitetstype: 'customer' (senere 'booking' | 'part' | 'sale' …). */
    entity: text('entity').notNull(),
    /** Lokal rad-id (f.eks. customers.id). */
    entityId: uuid('entity_id').notNull(),
    /** Feltnavn i konflikt, f.eks. 'phone'. */
    field: text('field').notNull(),
    /** Merge-base (sist hentet fra Quick) — felles stamfar. */
    baseValue: text('base_value'),
    /** Vår gjeldende verdi. */
    ourValue: text('our_value'),
    /** Quicks nye verdi. */
    theirValue: text('their_value'),
    /** 'open' | 'resolved'. */
    status: text('status').notNull().default('open'),
    /** Hvordan løst: 'quick' (behold Quick) | 'local' (behold vår) | null. */
    resolution: text('resolution'),
    /** Bruker som løste (userId). */
    resolvedBy: text('resolved_by'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /**
     * Satt ved «behold vår»: vår verdi bør pushes til Quick. Push er fortsatt
     * gated (F8-01), så dette er kun REGISTRERT INTENSJON — ingen automatisk push.
     */
    pushIntent: text('push_intent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('sync_conflicts_tenant_status_idx').on(t.tenantId, t.status),
    uniqueIndex('sync_conflicts_open_uidx')
      .on(t.tenantId, t.provider, t.entity, t.entityId, t.field)
      .where(sql`status = 'open'`),
    tenantPolicy('sync_conflicts', t.tenantId),
  ],
).enableRLS();

export type SyncConflict = typeof syncConflicts.$inferSelect;
export type NewSyncConflict = typeof syncConflicts.$inferInsert;
