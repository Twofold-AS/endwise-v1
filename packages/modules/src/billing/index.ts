import { and, type Database, eq, schema, sql, withTenant } from '@endwise/db';
import type { ModuleKey } from '../entitlements.ts';
import { publishEvent } from '../stream/publisher.ts';
import { modulesForSubscription } from './plans.ts';

export * from './katalog.ts';
export * from './plans.ts';

export type BillingState = {
  /** Nivået: start | pro | enterprise. */
  planKey: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  /** Moduler tenanten HAR (nivå + tillegg), med av/på-tilstand. */
  modules: { key: ModuleKey; enabled: boolean }[];
};

/**
 * F5-32 — **14 DAGERS NÅDE ved mislykket betaling.** Eiers beslutning 07.08.2026.
 *
 * Basis fortsetter ALLTID — Verkstedet, Saker, Kunder, Lager, Innboks, Helpdesk
 * og Settings har ingen gate og berøres ikke. Det er TILLEGGENE som fryses, og
 * først etter 14 dager i `past_due`.
 *
 * Å stenge et verksted midt i arbeidsdagen fordi et kort utløp er dårlig
 * produkt; 14 dager rekker for et nytt kort, og er kort nok til at det ikke blir
 * gratis drift.
 *
 * ⚠️ **Parameteren er satt, jobben er ikke bygget.** Ingenting fryser noe i dag
 * — se `erUtenforNade()` og F5-32. Cron-steget kommer senere.
 */
export const PAST_DUE_NADE_DAGER = 14;

/** Har nåden løpt ut? Ren funksjon — ingen leser den ennå (F5-32). */
export function erUtenforNade(pastDueSince: Date | null, naa: Date): boolean {
  if (!pastDueSince) return false;
  return (naa.getTime() - pastDueSince.getTime()) / 86_400_000 > PAST_DUE_NADE_DAGER;
}

/** Stripe-feltene webhooken pakker ut og sender videre. */
export type AbonnementOpts = {
  status?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
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
     * Sett tenantens NIVÅ + TILLEGG → synk entitlements.
     *
     * ⚠️ **Kalles KUN fra den signaturverifiserte Stripe-webhooken.** Ingen
     * klient-sti når hit; entitlements er en konsekvens av en betaling, ikke av
     * et knappetrykk.
     *
     * ── Nedgradering: `enabled = false`, ikke DELETE (endret 07.08.2026) ──
     * Tidligere slettet denne rader for moduler utenfor planen. Det var feil på
     * to måter: (1) dataene modulen eier blir stående uansett, så sletting av
     * entitlementet skjuler bare at forhandleren HAR hatt den, og (2) kommer de
     * tilbake, mistet vi historikken om hva de en gang betalte for.
     *
     * Nå deaktiveres raden i stedet. `moduleProcedure` leser `enabled = true`,
     * så virkningen er identisk — men den er reversibel og etterlater et spor.
     */
    async applySubscription(
      tenantId: string,
      planKey: string,
      tilleggKeys: readonly string[] = [],
      opts: AbonnementOpts = {},
    ): Promise<void> {
      const wanted = modulesForSubscription(planKey, tilleggKeys);
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

        // Aktiver alt abonnementet gir. `enabled: true` settes eksplisitt —
        // en tidligere nedgradert modul skal skrus PÅ igjen ved oppgradering.
        for (const key of wanted) {
          await tx
            .insert(schema.tenantModules)
            .values({ tenantId, moduleKey: key, plan: planKey, enabled: true })
            .onConflictDoUpdate({
              target: [schema.tenantModules.tenantId, schema.tenantModules.moduleKey],
              set: { plan: planKey, enabled: true, updatedAt: sql`now()` },
            });
        }
        // Nedgradering: deaktiver, ikke slett. Se doc-kommentaren over.
        for (const m of await tx
          .select({ key: schema.tenantModules.moduleKey })
          .from(schema.tenantModules)) {
          if (!wanted.includes(m.key)) {
            await tx
              .update(schema.tenantModules)
              .set({ enabled: false, updatedAt: sql`now()` })
              .where(eq(schema.tenantModules.moduleKey, m.key));
          }
        }
      });

      await publishEvent(db, {
        tenantId,
        type: 'tenant.modules.changed',
        subjectId: tenantId,
        audienceId: null,
        payload: { tenantId, planKey, modules: wanted },
      });
    },

    /** @deprecated Bruk `applySubscription` — den tar også tillegg. */
    async applyPlan(tenantId: string, planKey: string, opts: AbonnementOpts = {}): Promise<void> {
      await this.applySubscription(tenantId, planKey, [], opts);
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
