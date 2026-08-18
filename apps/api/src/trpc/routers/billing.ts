import {
  byggKatalog,
  createBillingService,
  INTEGRATIONS,
  kjopbareTillegg,
  NotEntitledError,
  PAST_DUE_NADE_DAGER,
  TIERS,
  TILLEGG,
  tierByKey,
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
  /**
   * Priskatalogen til UI-et: tre nivåer + valgfrie tillegg.
   *
   * `kjopbar` er utledet av BÅDE status og om price-IDen finnes i miljøet — et
   * tillegg uten pris i Stripe kan ikke kjøpes uansett hvor klar funksjonen er,
   * og en knapp som garantert feiler er verre enn en låst knapp.
   */
  plans: protectedProcedure.query(() =>
    TIERS.map((t) => ({
      key: t.key,
      name: t.name,
      pitch: t.pitch,
      priceMonthlyMinor: t.priceMonthlyMinor,
      hoydepunkter: t.hoydepunkter,
      modules: t.modules,
      kvoter: t.kvoter,
      kjopbar: Boolean(process.env[t.stripePriceEnv]),
    })),
  ),

  tillegg: protectedProcedure.query(() =>
    TILLEGG.map((t) => ({
      key: t.key,
      name: t.name,
      desc: t.desc,
      priceMonthlyMinor: t.priceMonthlyMinor,
      module: t.module,
      status: t.status,
      merknad: t.merknad ?? null,
      kjopbar: t.status === 'available' && Boolean(process.env[t.stripePriceEnv]),
    })),
  ),

  /** Nåde-vinduet ved mislykket betaling. Vises i UI-et — ingen hemmelighet. */
  naadeDager: protectedProcedure.query(() => PAST_DUE_NADE_DAGER),

  subscription: protectedProcedure.query(({ ctx }) =>
    createBillingService(ctx.db).getState(ctx.tenantId),
  ),

  /**
   * F5-19 — KATALOGEN, delt i tredjeparts-integrasjoner og Endwise-egne
   * tjenester, slått mot hva forhandleren faktisk har.
   *
   * ⛔ **Ren lesning.** Ruta aktiverer ingenting og har ingen av/på. Det er med
   * vilje: entitlements skrives kun av den signaturverifiserte Stripe-webhooken
   * (F5-09). En bryter her ville antydet at man kan skru på noe man ikke har
   * betalt for — og ville uansett blitt avvist av `NotEntitledError`.
   *
   * `har` = raden finnes i `tenant_modules`. `aktiv` = den er skrudd på. En
   * nedgradert modul står som `har: true, aktiv: false` fordi vi deaktiverer
   * framfor å slette — historikken skal ikke forsvinne fordi noen byttet plan.
   */
  katalog: protectedProcedure.query(async ({ ctx }) => {
    const state = await createBillingService(ctx.db)
      .getState(ctx.tenantId)
      .catch(() => null);

    const mine = new Map((state?.modules ?? []).map((m) => [m.key, m.enabled]));
    const poster = byggKatalog().map((p) => ({
      ...p,
      har: mine.has(p.key),
      aktiv: mine.get(p.key) ?? false,
    }));

    const nivaa = TIERS.find((t) => t.key === state?.planKey);
    return {
      tredjepart: poster.filter((p) => p.kilde === 'tredjepart'),
      endwise: poster.filter((p) => p.kilde === 'endwise'),
      /** Abonnementsnivået — grunnkostnaden alt annet kommer på toppen av. */
      nivaa: nivaa
        ? {
            key: nivaa.key,
            navn: nivaa.name,
            prisMinor: nivaa.priceMonthlyMinor,
            hoydepunkter: nivaa.hoydepunkter,
          }
        : null,
      status: state?.status ?? null,
    };
  }),

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

  /**
   * Start checkout for et nivå + valgfrie tillegg.
   *
   * ⛔ **Vi utfører aldri et trekk.** Ruta returnerer en URL forhandleren selv
   * fullfører hos Stripe, og entitlements flippes først av den
   * signaturverifiserte webhooken.
   *
   * ⚠️ Tilleggene filtreres SERVER-SIDE mot `kjopbareTillegg()`. At UI-et viser
   * 🕓-tillegg som låst er kosmetikk; her er sperren. Å selge «Nettbutikk» før
   * Medusa-beslutningen er tatt, ville vært å ta betalt for noe vi ikke kan
   * levere.
   */
  checkout: adminProcedure
    .input(
      z.object({
        planKey: z.string().min(1),
        tillegg: z.array(z.string()).default([]),
        returnUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = tierByKey(input.planKey);
      if (!plan) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ukjent nivå' });

      const kjopbare = kjopbareTillegg();
      const valgte = input.tillegg.map((k) => {
        const t = kjopbare.find((x) => x.key === k);
        if (!t) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Tillegget «${k}» kan ikke kjøpes ennå`,
          });
        }
        return t;
      });
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
          message: `Mangler ${plan.stripePriceEnv} — kjør scripts/stripe-setup.ts og legg price-IDene i .env`,
        });
      }
      const tilleggPriser = valgte.map((t) => {
        const pid = process.env[t.stripePriceEnv];
        if (!pid) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: `Mangler ${t.stripePriceEnv}`,
          });
        }
        return pid;
      });
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
        // Nivået + ett item per tillegg. Webhooken leser alle igjen.
        line_items: [
          { price, quantity: 1 },
          ...tilleggPriser.map((pid) => ({ price: pid, quantity: 1 })),
        ],
        success_url: `${input.returnUrl}?abonnement=ok`,
        cancel_url: `${input.returnUrl}?abonnement=avbrutt`,
        client_reference_id: ctx.tenantId,
        subscription_data: {
          // `tenant_id` er hvordan webhooken finner tenanten — uten kryss-tenant-
          // oppslag. Mister vi den, kan et abonnement ikke knyttes til noen.
          metadata: {
            tenant_id: ctx.tenantId,
            plan_key: plan.key,
            tillegg: valgte.map((t) => t.key).join(','),
          },
        },
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

  /**
   * Simuler at webhooken har provisjonert. **Kun i dev** — sjekken er en
   * eksplisitt `FORBIDDEN` i produksjon, ikke en antakelse om at ruta ikke
   * finnes der.
   *
   * Den finnes fordi Stripe-webhooken krever en offentlig URL (stripe CLI eller
   * tunnel); uten den kunne ikke onboarding-flyten testes lokalt i det hele tatt.
   */
  applyPlanMock: adminProcedure
    .input(z.object({ planKey: z.string().min(1), tillegg: z.array(z.string()).default([]) }))
    .mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV === 'production') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Kun i test/utvikling' });
      }
      if (!tierByKey(input.planKey)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ukjent nivå' });
      }
      await createBillingService(ctx.db).applySubscription(
        ctx.tenantId,
        input.planKey,
        input.tillegg,
        { status: 'active' },
      );
      return { ok: true };
    }),
});
