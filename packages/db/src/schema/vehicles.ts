import { sql } from 'drizzle-orm';
import { date, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { customers } from './customers.ts';
import { tenants } from './tenants.ts';

/** Endwise er ikke et bilverksted. Mc, båt og atv — det er hele universet. */
export const vehicleTypeEnum = pgEnum('vehicle_type', ['mc', 'boat', 'atv']);

/**
 * Kjøretøyregister.
 * `regNumber` er unik per tenant, ikke globalt: to forhandlere kan ha samme
 * Mc i sitt register (kunden byttet verksted), og det skal ikke kollidere.
 * Felter merket «fra Vegvesen» fylles av F2-08-oppslaget og skal ikke skrives
 * manuelt — de er speilet data, ikke vår sannhet.
 */
export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),

    type: vehicleTypeEnum('type').notNull(),
    /** Registreringsnummer. Båt og atv har ikke alltid ett — derfor nullable. */
    regNumber: text('reg_number'),

    // Fra Vegvesen/Autosys (F2-08). Speilet, ikke redigert.
    make: text('make'),
    model: text('model'),
    modelYear: text('model_year'),
    vin: text('vin'),
    /** Neste EU-frist. Driver påminnelser i F9. */
    inspectionDue: date('inspection_due'),
    /** Når speilingen sist ble oppdatert. Null = aldri slått opp. */
    lookupAt: timestamp('lookup_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('vehicles_tenant_reg_idx').on(t.tenantId, t.regNumber),
    index('vehicles_customer_idx').on(t.customerId),
    tenantPolicy('vehicles', t.tenantId),
    inspectSelectPolicy('vehicles', t.tenantId),
  ],
).enableRLS();

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
