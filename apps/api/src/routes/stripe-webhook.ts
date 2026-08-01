import { createBillingService, planForPriceId } from '@endwise/modules/billing';
import { Hono } from 'hono';
import { createAppContext } from '../context.ts';
import { getStripe, stripeConfigured } from '../lib/stripe.ts';

/**
 * F5-09 — Stripe-webhook for abonnement-livssyklus. Signaturverifisert
 * (constructEvent). Finner tenant via `tenant_id` i abonnementets metadata (satt
 * ved checkout) → oppdaterer entitlements via billing-tjenesten (withTenant/RLS).
 * Ingen kryss-tenant-oppslag.
 *
 * Krever STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET. Uten dem: 503 (mock-modus).
 */

// Minimal, versjonsrobust form (unngår Stripe API-versjons-typedrift).
type SubLike = {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata?: Record<string, string>;
  items: { data: { price?: { id?: string } }[] };
  current_period_end?: number;
};
type InvoiceLike = {
  metadata?: Record<string, string>;
  subscription_details?: { metadata?: Record<string, string> };
};

const customerIdOf = (c: string | { id: string }): string => (typeof c === 'string' ? c : c.id);

export const stripeWebhook = new Hono().post('/', async (c) => {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !whsec) {
    return c.json({ ok: false, mock: true, note: 'Stripe ikke konfigurert' }, 503);
  }
  const sig = c.req.header('stripe-signature') ?? '';
  const body = await c.req.text();

  let event: { type: string; data: { object: unknown } };
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whsec) as typeof event;
  } catch {
    return c.json({ error: 'signaturfeil' }, 400);
  }

  const billing = createBillingService(createAppContext().db);
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as SubLike;
        const tenantId = sub.metadata?.tenant_id;
        if (!tenantId) break;
        const plan = planForPriceId(sub.items.data[0]?.price?.id);
        if (plan) {
          await billing.applyPlan(tenantId, plan.key, {
            status: sub.status,
            stripeCustomerId: customerIdOf(sub.customer),
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
          });
        } else {
          await billing.setStatus(tenantId, sub.status);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as SubLike;
        if (sub.metadata?.tenant_id) await billing.setStatus(sub.metadata.tenant_id, 'canceled');
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as InvoiceLike;
        const tenantId = inv.subscription_details?.metadata?.tenant_id ?? inv.metadata?.tenant_id;
        if (tenantId) await billing.setStatus(tenantId, 'past_due');
        break;
      }
      default:
        break;
    }
  } catch {
    return c.json({ error: 'handteringsfeil' }, 500);
  }
  return c.json({ received: true });
});
