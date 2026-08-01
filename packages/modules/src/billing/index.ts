import { and, type Database, eq, schema, sql, withTenant } from '@endwise/db';
import type { ModuleKey } from '../entitlements.ts';
import { modulesForPlan } from './plans.ts';

export * from './plans.ts';

export type BillingState = {
  planKey: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  /** Moduler tenanten HAR (fra plan), med av/på-tilstand. */
  modules: { key: ModuleKey; enabled: boolean }[];
};

export class NotEntitledError extends Error {
  readonly code = 'NOT_ENTITLED';
  // Eksplisitt felt (ikke TS parameter property) — strip-only-trygt, se scope-gate.ts.
  readonly moduleKey: ModuleKey;
  constructor(moduleKey: ModuleKey) {
    super(`Tenant har ikke tilgang til modulen "${moduleKey}" (krever høyere plan)`);
    this.moduleKey = moduleKey;
  }
}

/**
 * F5-09 — Billing-tjeneste (ren DB, RLS-skopet). Skriver tenant_modules
 * (entitlements) + billing_customers. Ingen Stripe-SDK her; apps/api eier
 * Stripe-kallene og kaller disse funksjonene med utpakkede verdier.
 *
 * ALLE operasjoner kjører under `withTenant` → RLS garanterer at forhandler A
 * aldri rører forhandler B sine rader, uavhengig av hva som sendes inn.
 */
export function createBillingService(db: Database) {
  return {
    /** Gjeldende abonnement + entitlements for tenanten. */
    async getState(tenantId: string): Promise<BillingState> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select()
          .from(schema.billingCustomers)
          .where(eq(schema.billingCustomers.tenantId, tenantId));
        const mods = await tx
          .select({ key: schema.tenantModules.moduleKey, enabled: schema.tenantModules.enabled })
          .from(schema.tenantModules);
        return {
          planKey: row?.planKey ?? null,
          status: row?.status ?? 'none',
          currentPeriodEnd: row?.currentPeriodEnd ?? null,
          modules: mods,
        };
      });
    },

    /**
     * Sett tenantens plan → synk entitlements. Moduler i planen sikres (enabled
     * beholdes hvis raden finnes); moduler UTENFOR planen fjernes (nedgradering).
     * Kalles fra webhooken når abonnementet endres.
     */
    async applyPlan(
      tenantId: string,
      planKey: string,
      opts: {
        status?: string;
        stripeCustomerId?: string | null;
        stripeSubscriptionId?: string | null;
        currentPeriodEnd?: Date | null;
      } = {},
    ): Promise<void> {
      const wanted = modulesForPlan(planKey);
      await withTenant(db, tenantId, async (tx) => {
        await tx
          .insert(schema.billingCustomers)
          .values({
            tenantId,
            planKey,
            status: opts.status ?? 'active',
            stripeCustomerId: opts.stripeCustomerId ?? null,
            stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
            currentPeriodEnd: opts.currentPeriodEnd ?? null,
          })
          .onConflictDoUpdate({
            target: schema.billingCustomers.tenantId,
            set: {
              planKey,
              status: opts.status ?? 'active',
              ...(opts.stripeCustomerId !== undefined
                ? { stripeCustomerId: opts.stripeCustomerId }
                : {}),
              ...(opts.stripeSubscriptionId !== undefined
                ? { stripeSubscriptionId: opts.stripeSubscriptionId }
                : {}),
              ...(opts.currentPeriodEnd !== undefined
                ? { currentPeriodEnd: opts.currentPeriodEnd }
                : {}),
              updatedAt: sql`now()`,
            },
          });

        // Sikre planens moduler (behold enabled hvis finnes).
        for (const key of wanted) {
          await tx
            .insert(schema.tenantModules)
            .values({ tenantId, moduleKey: key, plan: planKey })
            .onConflictDoUpdate({
              target: [schema.tenantModules.tenantId, schema.tenantModules.moduleKey],
              set: { plan: planKey, updatedAt: sql`now()` },
            });
        }
        // Fjern moduler som ikke lenger er i planen (nedgradering).
        for (const m of await tx
          .select({ key: schema.tenantModules.moduleKey })
          .from(schema.tenantModules)) {
          if (!wanted.includes(m.key)) {
            await tx.delete(schema.tenantModules).where(eq(schema.tenantModules.moduleKey, m.key));
          }
        }
      });
    },

    /** Marker status (f.eks. past_due/canceled) uten å endre plan-moduler. */
    async setStatus(tenantId: string, status: string): Promise<void> {
      await withTenant(db, tenantId, (tx) =>
        tx
          .insert(schema.billingCustomers)
          .values({ tenantId, status })
          .onConflictDoUpdate({
            target: schema.billingCustomers.tenantId,
            set: { status, updatedAt: sql`now()` },
          }),
      );
    },

    /**
     * Forhandler skrur en integrasjon av/på. KUN tillatt hvis tenanten er
     * entitled (raden finnes i tenant_modules). Ellers NotEntitledError.
     */
    async setModuleEnabled(
      tenantId: string,
      moduleKey: ModuleKey,
      enabled: boolean,
    ): Promise<void> {
      await withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select({ key: schema.tenantModules.moduleKey })
          .from(schema.tenantModules)
          .where(
            and(
              eq(schema.tenantModules.tenantId, tenantId),
              eq(schema.tenantModules.moduleKey, moduleKey),
            ),
          );
        if (!row) throw new NotEntitledError(moduleKey);
        await tx
          .update(schema.tenantModules)
          .set({ enabled, updatedAt: sql`now()` })
          .where(eq(schema.tenantModules.moduleKey, moduleKey));
      });
    },

    /** Hent lagret Stripe-kunde-ID (til Customer Portal). */
    async getStripeCustomerId(tenantId: string): Promise<string | null> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select({ id: schema.billingCustomers.stripeCustomerId })
          .from(schema.billingCustomers)
          .where(eq(schema.billingCustomers.tenantId, tenantId));
        return row?.id ?? null;
      });
    },

    /** Lagre Stripe-kunde-ID (ved checkout-opprettelse). */
    async setStripeCustomer(tenantId: string, stripeCustomerId: string): Promise<void> {
      await withTenant(db, tenantId, (tx) =>
        tx
          .insert(schema.billingCustomers)
          .values({ tenantId, stripeCustomerId })
          .onConflictDoUpdate({
            target: schema.billingCustomers.tenantId,
            set: { stripeCustomerId, updatedAt: sql`now()` },
          }),
      );
    },
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
