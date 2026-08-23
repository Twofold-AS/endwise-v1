import { and, eq, schema, withTenant } from '@endwise/db';
import { ADDON_LABELS, erBlokertTildeling, erTildelbarAddon } from '@endwise/modules';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, router } from '../init.ts';

/**
 * F5-26 — EIER-VEIVISER. Egen skriverute, IKKE `tenants.setModules`.
 *
 * ⛔ `dealer_admin` får FORBIDDEN på `tenants.setModules` / `tenants.create`.
 * Her kan hen bare:
 *   · sette visningsnavn
 *   · slå på nøkler admin merket `source=optional` for DENNE tenanten
 *   · kun mens onboarding ikke er fullført
 *
 * shop/twilio avvises selv om noen skulle ha rotet dem inn som optional.
 * Team-invitasjoner går via `invitasjoner.opprett` (F1-10 staff-CHECK).
 */

const extrasSchema = z
  .array(z.string().min(1).max(64))
  .max(40)
  .superRefine((keys, ctx) => {
    for (const key of keys) {
      if (erBlokertTildeling(key)) {
        ctx.addIssue({
          code: 'custom',
          message:
            key === 'shop'
              ? 'Nettbutikk (shop) er blokkert og ikke til salgs.'
              : 'SMS er ikke et tillegg — pass-through per melding, ingen modulpris.',
        });
      }
    }
  });

export const onboardingRouter = router({
  status: adminProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [tenant] = await tx
        .select({
          name: schema.tenants.name,
          onboardingCompletedAt: schema.tenants.onboardingCompletedAt,
        })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId));

      const rader = await tx
        .select({
          moduleKey: schema.tenantModules.moduleKey,
          enabled: schema.tenantModules.enabled,
          source: schema.tenantModules.source,
        })
        .from(schema.tenantModules)
        .where(eq(schema.tenantModules.tenantId, ctx.tenantId));

      const etikett = (key: string) =>
        key in ADDON_LABELS ? ADDON_LABELS[key as keyof typeof ADDON_LABELS] : key;

      return {
        complete: Boolean(tenant?.onboardingCompletedAt),
        visningsnavn: tenant?.name ?? '',
        included: rader
          .filter((r) => r.source === 'included' && r.enabled)
          .map((r) => ({ key: r.moduleKey, label: etikett(r.moduleKey) })),
        optional: rader
          .filter((r) => r.source === 'optional' || r.source === 'dealer')
          .map((r) => ({
            key: r.moduleKey,
            label: etikett(r.moduleKey),
            enabled: r.enabled,
          })),
      };
    });
  }),

  /**
   * Fullfør veiviseren. Inkludert pakke er allerede skrevet — hopp over extras
   * og den blir stående.
   */
  fullfor: adminProcedure
    .input(
      z.object({
        visningsnavn: z.string().min(2).max(120),
        extras: extrasSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== 'dealer_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens eier kan fullføre oppstarten.',
        });
      }

      const extras = [...new Set(input.extras)];
      for (const key of extras) {
        if (!erTildelbarAddon(key) || erBlokertTildeling(key)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Kan ikke tildeles: ${key}`,
          });
        }
      }

      return withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const [tenant] = await tx
          .select({
            name: schema.tenants.name,
            onboardingCompletedAt: schema.tenants.onboardingCompletedAt,
          })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, ctx.tenantId));

        if (!tenant) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
        }
        if (tenant.onboardingCompletedAt) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Oppstarten er allerede fullført.',
          });
        }

        const tillatt = await tx
          .select({
            moduleKey: schema.tenantModules.moduleKey,
            source: schema.tenantModules.source,
            enabled: schema.tenantModules.enabled,
          })
          .from(schema.tenantModules)
          .where(eq(schema.tenantModules.tenantId, ctx.tenantId));

        const optionalNokler = new Set(
          tillatt.filter((r) => r.source === 'optional' || r.source === 'dealer').map((r) => r.moduleKey),
        );

        const ulovlige = extras.filter((k) => !optionalNokler.has(k));
        if (ulovlige.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Tillegget er ikke åpnet for dere: ${ulovlige.join(', ')}`,
          });
        }

        const navn = input.visningsnavn.trim();
        await tx
          .update(schema.tenants)
          .set({ name: navn, onboardingCompletedAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.tenants.id, ctx.tenantId));
        await tx
          .update(schema.organization)
          .set({ name: navn })
          .where(eq(schema.organization.id, ctx.tenantId));

        const granted: string[] = [];
        for (const key of extras) {
          const rad = tillatt.find((r) => r.moduleKey === key);
          if (rad?.enabled) continue;
          await tx
            .update(schema.tenantModules)
            .set({ enabled: true, source: 'dealer', updatedAt: new Date() })
            .where(
              and(
                eq(schema.tenantModules.tenantId, ctx.tenantId),
                eq(schema.tenantModules.moduleKey, key),
              ),
            );
          granted.push(key);
        }

        await tx.insert(schema.auditLog).values({
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: 'onboarding.completed',
          subjectType: 'tenant',
          subjectId: ctx.tenantId,
          metadata: { visningsnavn: navn, extras: granted },
        });
        for (const key of granted) {
          await tx.insert(schema.auditLog).values({
            tenantId: ctx.tenantId,
            actor: ctx.userId,
            action: 'entitlement.granted',
            subjectType: 'tenant_module',
            subjectId: key,
            metadata: { moduleKey: key, at: 'owner-onboarding', source: 'dealer' },
          });
        }

        return { visningsnavn: navn, granted, complete: true };
      });
    }),
});
