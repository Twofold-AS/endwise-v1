import { and, envelopeCryptoConfigured, eq, schema, withTenant } from '@endwise/db';
import {
  ADDON_LABELS,
  erBlokertTildeling,
  erTierKey,
  erTildelbarAddon,
  tierByKey,
} from '@endwise/modules';
import { applyQuickDealerProfile, createQuickConfigService } from '@endwise/modules/quick';
import {
  assertAllowedQuickUrl,
  mapQuickClientInfo,
  normalizeQuickBaseUrl,
  normalizeQuickToken,
  probeQuickReadOnly,
  type QuickClientInfo,
  QuickSsrfError,
  quickProbeUserMessage,
} from '@endwise/toolkit-quick';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { aktiverQuickEtterGet, quickNokkelMangler } from '../../lib/quick-activate.ts';
import { adminProcedure, router } from '../init.ts';

/**
 * Eier-veiviser. Egen skriverute, ikke `tenants.setModules`.
 * `dealer_admin` får forbidden på `tenants.setModules` / `tenants.create`.
 * Her kan hen bare:
 * sette visningsnavn
 * slå på nøkler admin merket `source=optional` for denne tenanten
 * kun mens onboarding ikke er fullført
 * shop avvises selv om noen skulle ha rotet den inn som optional.
 * SMS kan slås på hvis admin åpnet den som optional.
 * Team-invitasjoner går via `invitasjoner.opprett` (F1-10 staff-check).
 */

const extrasSchema = z
  .array(z.string().min(1).max(64))
  .max(40)
  .superRefine((keys, ctx) => {
    for (const key of keys) {
      if (erBlokertTildeling(key)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Nettbutikk (shop) er blokkert og ikke til salgs.',
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
          plan: schema.tenants.plan,
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

      const planKey = erTierKey(tenant?.plan) ? tenant.plan : 'start';
      const nivaa = { key: planKey, name: tierByKey(planKey)?.name ?? 'Start' };
      const includedKeys = new Set(
        rader.filter((r) => r.source === 'included' && r.enabled).map((r) => r.moduleKey),
      );

      return {
        complete: Boolean(tenant?.onboardingCompletedAt),
        visningsnavn: tenant?.name ?? '',
        nivaa,
        included: rader
          .filter((r) => r.source === 'included' && r.enabled)
          .map((r) => ({ key: r.moduleKey, label: etikett(r.moduleKey) })),
        optional: rader
          .filter((r) => r.source === 'optional' || r.source === 'dealer')
          .filter((r) => !erBlokertTildeling(r.moduleKey))
          .filter((r) => !includedKeys.has(r.moduleKey))
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
        /** Forhandlerens egen Quick-nøkkel. Påkrevd når extras inneholder `quick`. */
        quick: z
          .object({
            baseUrl: z.string().trim().url(),
            token: z.string().min(1).max(512),
          })
          .optional(),
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

      if (quickNokkelMangler(extras, input.quick)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Quick krever base-URL og ApiV2-nøkkel. Nøkkelen testes før den slås på.',
        });
      }

      let probedClient: QuickClientInfo | undefined;
      if (extras.includes('quick') && input.quick) {
        const baseUrl = normalizeQuickBaseUrl(input.quick.baseUrl);
        const token = normalizeQuickToken(input.quick.token);
        try {
          assertAllowedQuickUrl(baseUrl);
        } catch (error) {
          if (error instanceof QuickSsrfError) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: error.message });
          }
          throw error;
        }
        if (!envelopeCryptoConfigured()) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'ENDWISE_KEK mangler — kan ikke kryptere Quick-token.',
          });
        }
        try {
          // GET først — ingen persist her. Persist skjer etter at extras er tillatt.
          probedClient = await probeQuickReadOnly({ baseUrl, token });
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: quickProbeUserMessage(error),
          });
        }
      }

      const result = await withTenant(ctx.db, ctx.tenantId, async (tx) => {
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
          tillatt
            .filter((r) => r.source === 'optional' || r.source === 'dealer')
            .map((r) => r.moduleKey),
        );

        const ulovlige = extras.filter((k) => !optionalNokler.has(k));
        if (ulovlige.length) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Tillegget er ikke åpnet for dere: ${ulovlige.join(', ')}`,
          });
        }

        if (extras.includes('quick') && input.quick) {
          await aktiverQuickEtterGet({
            probe: async () => undefined,
            persist: (cfg) => createQuickConfigService(ctx.db).set(ctx.tenantId, cfg),
            baseUrl: input.quick.baseUrl,
            token: input.quick.token,
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

      if (probedClient) {
        const mapped = mapQuickClientInfo(probedClient);
        try {
          await applyQuickDealerProfile(ctx.db, ctx.tenantId, mapped);
        } catch {
          // Oppstart er ferdig. Quick-navn er fakta når det finnes.
        }
        if (mapped.name) {
          return { ...result, visningsnavn: mapped.name };
        }
      }
      return result;
    }),
});
