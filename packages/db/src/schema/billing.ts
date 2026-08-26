import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * Abonnementstilstand per forhandler (Stripe). Én rad per tenant.
 * Kobler forhandlerens Stripe-kunde/abonnement til planen. Planen bestemmer
 * hvilke moduler/integrasjoner tenanten får (entitlements, F0-04 → tenant_modules).
 * Stripe-webhooken skriver hit; ingen kode leser Stripe direkte i drift.
 * Tenant-skopet via RLS. Webhooken finner tenant via `tenant_id` i Stripe-
 * metadata (ikke via kryss-tenant-oppslag).
 */
export const billingCustomers = pgTable(
  'billing_customers',
  {
    tenantId: uuid('tenant_id')
      .primaryKey()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    planKey: text('plan_key'),
    /** none | active | trialing | past_due | canceled */
    status: text('status').notNull().default('none'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [tenantPolicy('billing_customers', t.tenantId)],
).enableRLS();

export type BillingCustomer = typeof billingCustomers.$inferSelect;
export type NewBillingCustomer = typeof billingCustomers.$inferInsert;
