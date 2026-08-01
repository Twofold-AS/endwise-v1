import {
  createBillingService,
  INTEGRATIONS,
  NotEntitledError,
  PLANS,
} from '@endwise/modules/billing';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getStripe, stripeConfigured } from '../../lib/stripe.ts';
import { adminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * F5-09 — Forhandler-selvbetjent abonnement + integrasjoner.
 *
 * Sikkerhet: skriveflatene er `adminProcedure` (kun dealer_admin/endwise_admin),
 * og ALT går via `createBillingService` → `withTenant` → RLS. Forhandler A kan
 * dermed verken lese eller endre forhandler B — verken via rolle eller RLS.
 *
 * Vi utfører ALDRI betalinger på vegne av noen: `checkout` returnerer en URL som
 * forhandleren selv fullfører hos Stripe. Uten Stripe-nøkler kjører flaten i
 * mock-modus (checkout/portal utilgjengelig; plan→entitlements testbar via
 * `applyPlanMock` i ikke-produksjon).
 */
export const billingRouter = router({
  plans: protectedProcedure.query(() =>
    PLANS.map((p) => ({
      key: p.key,
      name: p.name,
      priceMonthlyMinor: p.priceMonthlyMinor,
      modules: p.modules,
    })),
  ),

  subscription: protectedProcedure.query(({ ctx }) =>
    createBillingService(ctx.db).getState(ctx.tenantId),
  ),

  integrations: protectedProcedure.query(async ({ ctx }) => {
    const state = await createBillingService(ctx.db).getState(ctx.tenantId);
    const owned = new Map(state.modules.map((m) => [m.key, m.enabled]));
    return INTEGRATIONS.map((i) => ({
      key: i.key,
      name: i.name,
      desc: i.desc,
      entitled: owned.has(i.key),
      enabled: owned.get(i.key) ?? false,
    }));
  }),

  setIntegration: adminProcedure
    .input(z.object({ key: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await createBillingService(ctx.db).setModuleEnabled(ctx.tenantId, input.key, input.enabled);
        return { ok: true };
      } catch (e) {
        if (e instanceof NotEntitledError) {
          throw new TRPCError({ code: 'FORBIDDEN', message: e.message });
        }
        throw e;
      }
    }),

  checkout: adminProcedure
    .input(z.object({ planKey: z.string().min(1), returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const plan = PLANS.find((p) => p.key === input.planKey);
      if (!plan) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ukjent plan' });
      if (!stripeConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe er ikke konfigurert (mock-modus). Sett STRIPE_SECRET_KEY + price-IDer.',
        });
      }
      const price = process.env[plan.stripePriceEnv];
      if (!price) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Mangler ${plan.stripePriceEnv}`,
        });
      }
      const stripe = getStripe();
      const billing = createBillingService(ctx.db);

      let customerId = await billing.getStripeCustomerId(ctx.tenantId);
      if (!customerId) {
        const created = await stripe.customers.create({ metadata: { tenant_id: ctx.tenantId } });
        customerId = created.id;
        await billing.setStripeCustomer(ctx.tenantId, customerId);
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${input.returnUrl}?abonnement=ok`,
        cancel_url: `${input.returnUrl}?abonnement=avbrutt`,
        client_reference_id: ctx.tenantId,
        subscription_data: { metadata: { tenant_id: ctx.tenantId, plan_key: plan.key } },
      });
      return { url: session.url };
    }),

  portal: adminProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripeConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe er ikke konfigurert (mock-modus)',
        });
      }
      const customerId = await createBillingService(ctx.db).getStripeCustomerId(ctx.tenantId);
      if (!customerId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Ingen Stripe-kunde ennå — start et abonnement først',
        });
      }
      const session = await getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: input.returnUrl,
      });
      return { url: session.url };
    }),

  applyPlanMock: adminProcedure
    .input(z.object({ planKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV === 'production') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Kun i test/utvikling' });
      }
      await createBillingService(ctx.db).applyPlan(ctx.tenantId, input.planKey, {
        status: 'active',
      });
      return { ok: true };
    }),
});
