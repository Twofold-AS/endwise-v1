import { createBillingService, subscriptionFromPriceIds } from '@endwise/modules/billing';
import { createAppContext } from '../context.ts';
import { markerShopOrdreBetalt } from '../lib/shop.ts';
import { getStripe, stripeConfigured } from '../lib/stripe.ts';

/**
 * F5-09 / F5-32 / F13-03 — Stripe-webhook for abonnement-livssyklus.
 *
 * ⛔ **DETTE ER DEN ENESTE VEIEN ENTITLEMENTS FLIPPES.** Ingen klient-rute
 * skriver `tenant_modules` — modultilgang er en konsekvens av en verifisert
 * betaling, aldri av et knappetrykk. `checkout` returnerer bare en URL.
 *
 * **Signaturverifisering er PÅ:** `constructEvent(body, sig, whsec)` på RÅ
 * body-streng. Kall `await req.text()` FØR denne — aldri `req.json()`.
 * Feiler signaturen, svarer vi 400 og rører ingenting. Uten
 * STRIPE_WEBHOOK_SECRET svarer ruta 503 — den feiler LUKKET, ikke åpent.
 *
 * Tenant finnes via `tenant_id` i abonnementets metadata (satt ved checkout),
 * ikke via kryss-tenant-oppslag. Alt skrives gjennom withTenant → RLS.
 *
 * ── Nivå + tillegg (07.08.2026) ───────────────────────────────────────────
 * Et abonnement har nå FLERE subscription items: ett for nivået og ett per
 * tillegg. Vi leser derfor ALLE price-IDene, ikke bare `items.data[0]` — den
 * gamle koden ville stille mistet hvert eneste tillegg.
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

/**
 * Kjernen. `rawBody` MÅ være den ubearbeidede request-teksten — Stripe
 * signerer bytes, ikke et parse-tre.
 */
export async function handleStripeWebhookRaw(
  rawBody: string,
  signature: string | null | undefined,
): Promise<Response> {
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !whsec) {
    return Response.json(
      { ok: false, mock: true, note: 'Stripe ikke konfigurert' },
      { status: 503 },
    );
  }

  let event: { type: string; data: { object: unknown } };
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature ?? '', whsec) as typeof event;
  } catch {
    return Response.json({ error: 'signaturfeil' }, { status: 400 });
  }

  const ctx = createAppContext();
  const billing = createBillingService(ctx.db);
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id?: string;
          mode?: string;
          payment_intent?: string | { id: string };
          metadata?: Record<string, string>;
        };
        if (session.metadata?.kind !== 'shop') break;
        const tenantId = session.metadata.tenant_id;
        const sessionId = session.id;
        if (!tenantId || !sessionId) break;
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        await markerShopOrdreBetalt(ctx.db, tenantId, {
          checkoutSessionId: sessionId,
          paymentIntentId,
        });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as SubLike;
        const tenantId = sub.metadata?.tenant_id;
        if (!tenantId) break;

        // ⚠️ ALLE items, ikke bare den første: nivået er ett item, hvert
        // tillegg sitt eget. `items.data[0]` ville mistet tilleggene stille.
        const priceIds = sub.items.data.map((i) => i.price?.id);
        const { tier, tillegg } = subscriptionFromPriceIds(priceIds);

        if (tier) {
          await billing.applySubscription(
            tenantId,
            tier.key,
            tillegg.map((t) => t.key),
            {
              status: sub.status,
              stripeCustomerId: customerIdOf(sub.customer),
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
            },
          );
        } else {
          // Kjenner vi ikke igjen nivået, rører vi IKKE modulene. Å nulle dem
          // fordi en price-ID manglet i .env ville stengt et betalende verksted.
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
        // ⚠️ Kun status. Modulene står PÅ — nåden er 14 dager
        // (PAST_DUE_NADE_DAGER), og frysejobben er ikke bygget (F5-32).
        // Basis berøres uansett aldri: den har ingen gate.
        if (tenantId) await billing.setStatus(tenantId, 'past_due');
        break;
      }
      default:
        break;
    }
  } catch {
    return Response.json({ error: 'handteringsfeil' }, { status: 500 });
  }
  return Response.json({ received: true });
}

/**
 * Les rå body med `req.text()` — aldri `req.json()`. Next-ruta speiler dette
 * eksplisitt slik at signaturverifiseringen ikke kan miste whitespace.
 */
export async function handleStripeWebhook(req: Request): Promise<Response> {
  const rawBody = await req.text();
  return handleStripeWebhookRaw(rawBody, req.headers.get('stripe-signature'));
}
