import { and, asc, eq, schema, sql, withPlatformAdmin, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { DEV_MODE_FLAG } from '../dev-mode.ts';
import { adminProcedure, endwiseAdminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * F5-28 ① — nøkler en tenant aldri får overstyre.
 * `setOverride` er `adminProcedure`, og `adminProcedure` slipper inn **både**
 * `dealer_admin` og `endwise_admin`. Nøkkelen var en fri streng. En
 * forhandler-admin kunne derfor sette override på hvilket som helst flagg for
 * sin egen tenant — inkludert `dev-mode`, straks nøkkelen fantes globalt.
 * Dette er en deny-liste og ikke en allow-liste, med vilje: en ny release-
 * toggle skal fortsatt kunne overstyres per tenant uten at noen husker å
 * registrere den. Det er nettopp de plattformstyrende nøklene som må navngis,
 * og de er få nok til å telles.
 * Vil du legge til en nøkkel her: den hører hjemme her hvis svaret på «kan en
 * forhandler misbruke denne mot oss?» er noe annet enn et blankt nei.
 */
const IKKE_OVERSTYRBAR: readonly string[] = [DEV_MODE_FLAG, 'kill-switch'];

/**
 * CWE-20 — samme regel som klienten (`FLAG_KEY_PATTERN` i apps/web/flags.ts).
 * En fri `z.string.min(1)` ville latt et rått tRPC-kall omgå UI-regexen.
 */
const FLAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const flagKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(FLAG_KEY_PATTERN, 'Kun små bokstaver, tall og bindestrek');

function assertOverstyrbar(key: string) {
  if (IKKE_OVERSTYRBAR.includes(key)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Flagget «${key}» kan ikke overstyres per forhandler`,
    });
  }
}

/**
 * CWE-778 — append-only spor i samme transaksjon som mutasjonen.
 * `audit_log` har INSERT+SELECT, ingen UPDATE/DELETE. RLS krever at
 * `tenant_id` er den `withTenant` nettopp satte.
 */
async function skrivFlagAudit(
  tx: Parameters<Parameters<typeof withTenant>[2]>[0],
  input: {
    tenantId: string;
    actor: string;
    action:
      | 'feature_flag.upsert'
      | 'feature_flag.set_global'
      | 'feature_flag.set_override'
      | 'feature_flag.clear_override';
    key: string;
    old: unknown;
    neu: unknown;
    extra?: Record<string, unknown>;
  },
) {
  await tx.insert(schema.auditLog).values({
    tenantId: input.tenantId,
    actor: input.actor,
    action: input.action,
    subjectType: 'feature_flag',
    subjectId: input.key,
    metadata: { key: input.key, old: input.old, new: input.neu, ...input.extra },
  });
}

/**
 * Feature-flags (release-toggles), DB-styrt. Erstatter Vercel Edge
 * Config (betalt). Global av/på + per-tenant overstyring; admin styrer.
 * resolve : les resolverte flagg for gjeldende tenant (alle innloggede)
 * list : rå global+override-liste for egen tenant (dealer/endwise-admin)
 * listPlatform : alle flagg + alle tenants overstyringer (kun endwise_admin)
 * setGlobal : slå et flagg av/på globalt (kun endwise_admin)
 * upsert : opprett/beskriv et flagg (kun endwise_admin)
 * setOverride : overstyr et flagg for egen tenant (dealer/endwise-admin)
 * setTenantOverride : overstyr et flagg for en valgt tenant (kun endwise_admin)
 * clearTenantOverride : fjern overstyring for en valgt tenant (kun endwise_admin)
 * RLS skoper override-tabellen til tenanten; rollesjekk (adminProcedure /
 * eksplisitt endwise_admin) styrer skriving. `feature_flags` er system-vidt.
 * `setTenantOverride` / `clearTenantOverride` er den ene lovlige
 * kryss-tenant-skrivingen for flagg. De bytter `withTenant` til *måltenanten*,
 * ikke sesjonens `ctx.tenantId`. Rollen er sperren (`endwiseAdminProcedure`);
 * RLS er fortsatt på — vi skriver bare i den tenantens override-rader.
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
    .input(z.object({ key: flagKeySchema, description: z.string().optional() }))
    .mutation(({ ctx, input }) => {
      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [forrige] = await tx
          .select({ description: schema.featureFlags.description })
          .from(schema.featureFlags)
          .where(eq(schema.featureFlags.key, input.key));

        await tx
          .insert(schema.featureFlags)
          .values({ key: input.key, description: input.description })
          .onConflictDoUpdate({
            target: schema.featureFlags.key,
            set: { description: input.description, updatedAt: sql`now()` },
          });

        await skrivFlagAudit(tx, {
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: 'feature_flag.upsert',
          key: input.key,
          old: forrige?.description ?? null,
          neu: input.description ?? null,
          extra: { scope: 'global' },
        });
      });
    }),

  /** Slå et flagg av/på globalt. Dev-mode-bryteren i admin går hit. */
  setGlobal: endwiseAdminProcedure
    .input(z.object({ key: flagKeySchema, enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [forrige] = await tx
          .select({ enabled: schema.featureFlags.enabled })
          .from(schema.featureFlags)
          .where(eq(schema.featureFlags.key, input.key));

        await tx
          .insert(schema.featureFlags)
          .values({ key: input.key, enabled: input.enabled })
          .onConflictDoUpdate({
            target: schema.featureFlags.key,
            set: { enabled: input.enabled, updatedAt: sql`now()` },
          });

        await skrivFlagAudit(tx, {
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: 'feature_flag.set_global',
          key: input.key,
          old: forrige?.enabled ?? null,
          neu: input.enabled,
          extra: { scope: 'global' },
        });
      });
    }),

  /**
   * Overstyr et flagg for egen tenant (dealer_admin/endwise_admin).
   * Plattformstyrende nøkler er sperret — se `IKKE_OVERSTYRBAR` øverst.
   * Sperren står her, på skrivestien, ikke i UI-et: en knapp som ikke vises er
   * ikke en sperre, det er en gjemt knapp.
   */
  setOverride: adminProcedure
    .input(z.object({ key: flagKeySchema, enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      assertOverstyrbar(input.key);
      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [forrige] = await tx
          .select({ enabled: schema.featureFlagOverrides.enabled })
          .from(schema.featureFlagOverrides)
          .where(eq(schema.featureFlagOverrides.flagKey, input.key));

        await tx
          .insert(schema.featureFlagOverrides)
          .values({ flagKey: input.key, tenantId: ctx.tenantId, enabled: input.enabled })
          .onConflictDoUpdate({
            target: [schema.featureFlagOverrides.flagKey, schema.featureFlagOverrides.tenantId],
            set: { enabled: input.enabled, updatedAt: sql`now()` },
          });

        await skrivFlagAudit(tx, {
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: 'feature_flag.set_override',
          key: input.key,
          old: forrige?.enabled ?? null,
          neu: input.enabled,
          extra: { targetTenantId: ctx.tenantId },
        });
      });
    }),

  /**
   * Rådata for Endwise-admin-flaten: globale flagg + overstyringer
   * per forhandler. Fail-closed: feiler override-oppslaget for én tenant,
   * vises den uten overstyringer (arver global), ikke med gjettede verdier.
   */
  listPlatform: endwiseAdminProcedure.query(async ({ ctx }) => {
    const globals = await ctx.db
      .select({
        key: schema.featureFlags.key,
        description: schema.featureFlags.description,
        enabled: schema.featureFlags.enabled,
      })
      .from(schema.featureFlags)
      .orderBy(asc(schema.featureFlags.key));

    const tenants = await withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
        })
        .from(schema.tenants)
        .orderBy(asc(schema.tenants.name)),
    );

    const rader: Array<
      (typeof tenants)[number] & { overrides: Array<{ flagKey: string; enabled: boolean }> }
    > = [];
    for (const t of tenants) {
      const overrides = await withTenant(ctx.db, t.id, (tx) =>
        tx
          .select({
            flagKey: schema.featureFlagOverrides.flagKey,
            enabled: schema.featureFlagOverrides.enabled,
          })
          .from(schema.featureFlagOverrides),
      ).catch(() => [] as Array<{ flagKey: string; enabled: boolean }>);
      rader.push({ ...t, overrides });
    }

    return {
      globals: globals.map((g) => ({
        ...g,
        overridable: !IKKE_OVERSTYRBAR.includes(g.key),
      })),
      lockedKeys: [...IKKE_OVERSTYRBAR],
      tenants: rader,
    };
  }),

  /**
   * Overstyr et flagg for en valgt tenant. Ikke entitlements — de skrives
   * av Stripe-webhooken, ikke her.
   */
  setTenantOverride: endwiseAdminProcedure
    .input(
      z.object({
        tenantId: z.uuid(),
        key: flagKeySchema,
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertOverstyrbar(input.key);

      const [flag] = await ctx.db
        .select({ key: schema.featureFlags.key })
        .from(schema.featureFlags)
        .where(eq(schema.featureFlags.key, input.key));
      if (!flag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Flagget «${input.key}» finnes ikke. Opprett det globalt først.`,
        });
      }

      const [tenant] = await withPlatformAdmin(ctx.db, (tx) =>
        tx
          .select({ id: schema.tenants.id })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, input.tenantId)),
      );
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }

      return withTenant(ctx.db, input.tenantId, async (tx) => {
        const [forrige] = await tx
          .select({ enabled: schema.featureFlagOverrides.enabled })
          .from(schema.featureFlagOverrides)
          .where(eq(schema.featureFlagOverrides.flagKey, input.key));

        await tx
          .insert(schema.featureFlagOverrides)
          .values({
            flagKey: input.key,
            tenantId: input.tenantId,
            enabled: input.enabled,
          })
          .onConflictDoUpdate({
            target: [schema.featureFlagOverrides.flagKey, schema.featureFlagOverrides.tenantId],
            set: { enabled: input.enabled, updatedAt: sql`now()` },
          });

        await skrivFlagAudit(tx, {
          tenantId: input.tenantId,
          actor: ctx.userId,
          action: 'feature_flag.set_override',
          key: input.key,
          old: forrige?.enabled ?? null,
          neu: input.enabled,
          extra: { targetTenantId: input.tenantId, actorTenantId: ctx.tenantId },
        });
      });
    }),

  /** Fjern per-tenant overstyring, så tenanten arver det globale flagget. */
  clearTenantOverride: endwiseAdminProcedure
    .input(z.object({ tenantId: z.uuid(), key: flagKeySchema }))
    .mutation(async ({ ctx, input }) => {
      const [tenant] = await withPlatformAdmin(ctx.db, (tx) =>
        tx
          .select({ id: schema.tenants.id })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, input.tenantId)),
      );
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }

      return withTenant(ctx.db, input.tenantId, async (tx) => {
        const slettet = await tx
          .delete(schema.featureFlagOverrides)
          .where(
            and(
              eq(schema.featureFlagOverrides.flagKey, input.key),
              eq(schema.featureFlagOverrides.tenantId, input.tenantId),
            ),
          )
          .returning({ enabled: schema.featureFlagOverrides.enabled });

        const forrige = slettet[0];
        if (!forrige) return;

        await skrivFlagAudit(tx, {
          tenantId: input.tenantId,
          actor: ctx.userId,
          action: 'feature_flag.clear_override',
          key: input.key,
          old: forrige.enabled,
          neu: null,
          extra: { targetTenantId: input.tenantId, actorTenantId: ctx.tenantId },
        });
      });
    }),
});
