import { schema, sql, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { DEV_MODE_FLAG } from '../dev-mode.ts';
import { adminProcedure, endwiseAdminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * ⛔ F5-28 ① — NØKLER EN TENANT ALDRI FÅR OVERSTYRE.
 *
 * `setOverride` er `adminProcedure`, og `adminProcedure` slipper inn **både**
 * `dealer_admin` og `endwise_admin`. Nøkkelen var en fri streng. En
 * forhandler-admin kunne derfor sette override på hvilket som helst flagg for
 * sin egen tenant — inkludert `dev-mode`, straks nøkkelen fantes globalt.
 *
 * Dette er en DENY-liste og ikke en allow-liste, med vilje: en ny release-
 * toggle skal fortsatt kunne overstyres per tenant uten at noen husker å
 * registrere den. Det er nettopp de PLATTFORMSTYRENDE nøklene som må navngis,
 * og de er få nok til å telles.
 *
 * Vil du legge til en nøkkel her: den hører hjemme her hvis svaret på «kan en
 * forhandler misbruke denne mot oss?» er noe annet enn et blankt nei.
 */
const IKKE_OVERSTYRBAR: readonly string[] = [DEV_MODE_FLAG, 'kill-switch'];

/**
 * F0-04 — Feature-flags (release-toggles), DB-styrt. ERSTATTER Vercel Edge
 * Config (betalt). Global av/på + per-tenant overstyring; admin styrer.
 *
 *   - resolve      : les resolverte flagg for gjeldende tenant (alle innloggede)
 *   - list         : rå global+override-liste for admin-UI (dealer/endwise-admin)
 *   - setGlobal    : slå et flagg av/på GLOBALT (kun endwise_admin)
 *   - upsert       : opprett/beskriv et flagg (kun endwise_admin)
 *   - setOverride  : overstyr et flagg for EGEN tenant (dealer/endwise-admin)
 *
 * RLS skoper override-tabellen til tenanten; rollesjekk (adminProcedure /
 * eksplisitt endwise_admin) styrer skriving. `feature_flags` er system-vidt.
 */
export const flagsRouter = router({
  /** Resolverte flagg for gjeldende tenant: override vinner over global. */
  resolve: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const globals = await tx
        .select({ key: schema.featureFlags.key, enabled: schema.featureFlags.enabled })
        .from(schema.featureFlags);
      const overrides = await tx
        .select({
          key: schema.featureFlagOverrides.flagKey,
          enabled: schema.featureFlagOverrides.enabled,
        })
        .from(schema.featureFlagOverrides);
      const overrideMap = new Map(overrides.map((o) => [o.key, o.enabled]));
      const resolved: Record<string, boolean> = {};
      for (const g of globals) resolved[g.key] = overrideMap.get(g.key) ?? g.enabled;
      return resolved;
    }),
  ),

  /** Rådata for admin-UI: globale flagg + denne tenantens overstyringer. */
  list: adminProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const globals = await tx.select().from(schema.featureFlags);
      const overrides = await tx.select().from(schema.featureFlagOverrides);
      return { globals, overrides };
    }),
  ),

  /** Opprett/beskriv et flagg. `endwiseAdminProcedure` = sperren er i typen. */
  upsert: endwiseAdminProcedure
    .input(z.object({ key: z.string().min(1), description: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      return withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .insert(schema.featureFlags)
          .values({ key: input.key, description: input.description })
          .onConflictDoUpdate({
            target: schema.featureFlags.key,
            set: { description: input.description, updatedAt: sql`now()` },
          }),
      );
    }),

  /** Slå et flagg av/på GLOBALT. Dev-mode-bryteren i admin går hit. */
  setGlobal: endwiseAdminProcedure
    .input(z.object({ key: z.string().min(1), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .insert(schema.featureFlags)
          .values({ key: input.key, enabled: input.enabled })
          .onConflictDoUpdate({
            target: schema.featureFlags.key,
            set: { enabled: input.enabled, updatedAt: sql`now()` },
          }),
      );
    }),

  /**
   * Overstyr et flagg for EGEN tenant (dealer_admin/endwise_admin).
   *
   * ⛔ Plattformstyrende nøkler er sperret — se `IKKE_OVERSTYRBAR` øverst.
   * Sperren står HER, på skrivestien, ikke i UI-et: en knapp som ikke vises er
   * ikke en sperre, det er en gjemt knapp.
   */
  setOverride: adminProcedure
    .input(z.object({ key: z.string().min(1), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      if (IKKE_OVERSTYRBAR.includes(input.key)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Flagget «${input.key}» kan ikke overstyres per forhandler`,
        });
      }
      return withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .insert(schema.featureFlagOverrides)
          .values({ flagKey: input.key, tenantId: ctx.tenantId, enabled: input.enabled })
          .onConflictDoUpdate({
            target: [schema.featureFlagOverrides.flagKey, schema.featureFlagOverrides.tenantId],
            set: { enabled: input.enabled, updatedAt: sql`now()` },
          }),
      );
    }),
});
