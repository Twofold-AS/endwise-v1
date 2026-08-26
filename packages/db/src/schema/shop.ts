import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { parts } from './inventory.ts';
import { tenants } from './tenants.ts';

/**
 * Interne butikkordrer. **Ikke Medusa.** Katalog er lager (`parts`).
 * Disse tabellene er kun salg: ordre + linjer, tenant-RLS, Stripe test-kasse.
 * Ingen kundepersonopplysninger her i første slice. `createdByUserId` er
 * den innloggede forhandlerbrukeren (fra sesjonen), ikke en sluttkunde.
 */

export const shopOrderStatusEnum = pgEnum('shop_order_status', ['pending', 'paid', 'cancelled']);

export const shopOrders = pgTable(
  'shop_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    status: shopOrderStatusEnum('status').notNull().default('pending'),
    /** Stripe Checkout Session-id. Unik — webhooken slår opp her, ikke via e-post. */
    stripeCheckoutSessionId: text('stripe_checkout_session_id'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    currency: text('currency').notNull().default('nok'),
    totalMinor: integer('total_minor').notNull(),
    /** Better-Auth-bruker som startet kassen. Fra sesjonen, aldri fra input. */
    createdByUserId: text('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('shop_orders_stripe_session_uq').on(t.stripeCheckoutSessionId),
    index('shop_orders_tenant_created_idx').on(t.tenantId, t.createdAt),
    tenantPolicy('shop_orders', t.tenantId),
    inspectSelectPolicy('shop_orders', t.tenantId),
  ],
).enableRLS();

export const shopOrderLines = pgTable(
  'shop_order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => shopOrders.id, { onDelete: 'cascade' }),
    partId: uuid('part_id')
      .notNull()
      .references(() => parts.id, { onDelete: 'restrict' }),
    /** Snapshot — katalogen kan endre navn/sku etter at ordren er lagt. */
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
  },
  (t) => [
    index('shop_order_lines_order_idx').on(t.orderId),
    index('shop_order_lines_tenant_idx').on(t.tenantId),
    tenantPolicy('shop_order_lines', t.tenantId),
    inspectSelectPolicy('shop_order_lines', t.tenantId),
  ],
).enableRLS();

export type ShopOrder = typeof shopOrders.$inferSelect;
export type NewShopOrder = typeof shopOrders.$inferInsert;
export type ShopOrderLine = typeof shopOrderLines.$inferSelect;
export type NewShopOrderLine = typeof shopOrderLines.$inferInsert;
export type ShopOrderStatus = (typeof shopOrderStatusEnum.enumValues)[number];
