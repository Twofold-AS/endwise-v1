import { kanSkriveDealerDesk } from '@endwise/auth';
import { and, eq, schema, withTenant } from '@endwise/db';
import { createWidgetKeyService, WidgetKeyOriginError } from '@endwise/modules/widget';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { byggShopLinjer, lesShopKatalog } from '../../lib/shop.ts';
import { getStripe, stripeConfigured } from '../../lib/stripe.ts';
import { router, shopProcedure } from '../init.ts';

/**
 * Intern testbutikk. **Ikke `moduleProcedure('shop')`.**
 * Gaten er `shopProcedure` (feature-flag `shop` + auth/RLS).
 * Stripe-kassen er `mode: payment` — holdt adskilt fra abonnements-items.
 */
export const shopRouter = router({
  catalog: shopProcedure.query(({ ctx }) => lesShopKatalog(ctx.db, ctx.tenantId)),

  /**
   * Midlertidig testplassering: publishable key til den eksisterende
   * EndwiseWidget på /butikk. Ikke en ny booking. Ikke widget-modulen
   * (F4 admin-nøkler) — gaten er shop-flagget, samme som katalogen.
   */
  bookingWidget: shopProcedure
    .input(z.object({ origin: z.string().url().max(200) }))
    .query(async ({ ctx, input }) => {
      try {
        const key = await createWidgetKeyService(ctx.db).ensureShopTestKey(
          ctx.tenantId,
          input.origin,
        );
        return { publishableKey: key.publishableKey, apiBase: '' };
      } catch (error) {
        if (error instanceof WidgetKeyOriginError) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
        }
        throw error;
      }
    }),

  createCheckout: shopProcedure
    .input(
      z.object({
        linjer: z
          .array(
            z.object({
              partId: z.uuid(),
              quantity: z.number().int().min(1).max(999),
            }),
          )
          .min(1)
          .max(50),
        returnUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!kanSkriveDealerDesk(ctx)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Mekaniker har ikke tilgang til kassen.',
        });
      }
      if (!stripeConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Stripe er ikke konfigurert (testmodus). Sett STRIPE_SECRET_KEY.',
        });
      }

      const { linjer, totalMinor } = await byggShopLinjer(ctx.db, ctx.tenantId, input.linjer);

      const ordre = await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [rad] = await tx
          .insert(schema.shopOrders)
          .values({
            tenantId: ctx.tenantId,
            status: 'pending',
            currency: 'nok',
            totalMinor,
            createdByUserId: ctx.userId,
          })
          .returning();

        await tx.insert(schema.shopOrderLines).values(
          linjer.map((l) => ({
            tenantId: ctx.tenantId,
            orderId: rad.id,
            partId: l.partId,
            sku: l.sku,
            name: l.name,
            quantity: l.quantity,
            unitPriceMinor: l.unitPriceMinor,
          })),
        );

        return rad;
      });

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: linjer.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: 'nok',
            unit_amount: l.unitPriceMinor,
            product_data: { name: `${l.sku} ${l.name}`.trim() },
          },
        })),
        success_url: `${input.returnUrl}?butikk=ok`,
        cancel_url: `${input.returnUrl}?butikk=avbrutt`,
        client_reference_id: ordre.id,
        metadata: {
          kind: 'shop',
          tenant_id: ctx.tenantId,
          shop_order_id: ordre.id,
        },
        payment_intent_data: {
          metadata: {
            kind: 'shop',
            tenant_id: ctx.tenantId,
            shop_order_id: ordre.id,
          },
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Stripe returnerte ingen kasse-URL',
        });
      }

      await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        await tx
          .update(schema.shopOrders)
          .set({ stripeCheckoutSessionId: session.id })
          .where(
            and(eq(schema.shopOrders.id, ordre.id), eq(schema.shopOrders.tenantId, ctx.tenantId)),
          );
      });

      return { url: session.url, orderId: ordre.id };
    }),
});
