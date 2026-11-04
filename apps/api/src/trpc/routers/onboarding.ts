import { and, type Database, envelopeCryptoConfigured, eq, schema, withTenant } from '@endwise/db';
import {
  ADDON_LABELS,
  erBlokertTildeling,
  erTierKey,
  erTildelbarAddon,
  tierByKey,
} from '@endwise/modules';
import {
  AI_TAK_DEFAULT,
  AI_TAK_MAX,
  AI_TAK_MIN,
  ONBOARDING_KATEGORIER,
  ONBOARDING_STORRELSER,
  rensAiTak,
  rensApningstider,
  rensKategorier,
  standardApningstider,
} from '@endwise/modules/onboarding';
import { applyQuickDealerProfile, createQuickConfigService } from '@endwise/modules/quick';
import { byggSlugSvar, slugSjekkTillatt, vurderSlugFormat } from '@endwise/modules/slug';
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
import { omradeSjekk, protectedProcedure, router } from '../init.ts';
import { loggOnboardingPostgresFeil, mapOnboardingPostgresFeil } from '../oppstart-postgres.ts';
import { slugErOpptatt } from '../slug-ledig.ts';

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

const utkastSchema = z.object({
  visningsnavn: z.string().min(2).max(120),
  slug: z.string().min(3).max(32).optional(),
  address: z.string().max(200).optional(),
  postalCode: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().max(120).optional(),
  kategorier: z.array(z.enum(ONBOARDING_KATEGORIER)).max(8).optional(),
  forventetStorrelse: z.enum(ONBOARDING_STORRELSER).optional(),
  aiTak: z.number().int().min(AI_TAK_MIN).max(AI_TAK_MAX).optional(),
  apningstider: z
    .array(
      z.object({
        dag: z.number().int().min(0).max(6),
        fra: z.string().max(5),
        til: z.string().max(5),
        stengt: z.boolean(),
      }),
    )
    .max(7)
    .optional(),
});

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

async function skrivOnboardingUtkast(
  db: Database,
  tenantId: string,
  input: z.infer<typeof utkastSchema>,
) {
  const naa = new Date();
  await withTenant(db, tenantId, async (tx) => {
    await tx
      .insert(schema.dealerProfiles)
      .values({
        tenantId,
        address: input.address ?? '',
        postalCode: input.postalCode ?? '',
        city: input.city ?? '',
        phone: input.phone ?? '',
        email: input.email ?? '',
        apningstider: rensApningstider(input.apningstider),
        kategorier: rensKategorier(input.kategorier),
        forventetStorrelse: input.forventetStorrelse ?? 'liten',
        aiTak: rensAiTak(input.aiTak),
        updatedAt: naa,
      })
      .onConflictDoUpdate({
        target: schema.dealerProfiles.tenantId,
        set: {
          address: input.address ?? '',
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          phone: input.phone ?? '',
          email: input.email ?? '',
          apningstider: rensApningstider(input.apningstider),
          kategorier: rensKategorier(input.kategorier),
          forventetStorrelse: input.forventetStorrelse ?? 'liten',
          aiTak: rensAiTak(input.aiTak),
          updatedAt: naa,
        },
      });
    const visningsnavn = input.visningsnavn.trim();
    if (visningsnavn.length >= 2) {
      await tx
        .insert(schema.tenantBranding)
        .values({
          tenantId,
          visningsnavn,
          oppdatertAt: naa,
        })
        .onConflictDoUpdate({
          target: schema.tenantBranding.tenantId,
          set: { visningsnavn, oppdatertAt: naa },
        });
    }
  });
}

export const onboardingRouter = router({
  status: protectedProcedure.use(omradeSjekk('innstillinger', 'se')).query(async ({ ctx }) => {
    return withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [tenant] = await tx
        .select({
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          plan: schema.tenants.plan,
          onboardingCompletedAt: schema.tenants.onboardingCompletedAt,
        })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId));

      const [branding] = await tx
        .select({ visningsnavn: schema.tenantBranding.visningsnavn })
        .from(schema.tenantBranding)
        .where(eq(schema.tenantBranding.tenantId, ctx.tenantId));

      const [profil] = await tx
        .select({
          address: schema.dealerProfiles.address,
          postalCode: schema.dealerProfiles.postalCode,
          city: schema.dealerProfiles.city,
          phone: schema.dealerProfiles.phone,
          email: schema.dealerProfiles.email,
          apningstider: schema.dealerProfiles.apningstider,
          kategorier: schema.dealerProfiles.kategorier,
          forventetStorrelse: schema.dealerProfiles.forventetStorrelse,
          aiTak: schema.dealerProfiles.aiTak,
        })
        .from(schema.dealerProfiles)
        .where(eq(schema.dealerProfiles.tenantId, ctx.tenantId));

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
        visningsnavn: branding?.visningsnavn ?? tenant?.name ?? '',
        slug: tenant?.slug ?? '',
        address: profil?.address ?? '',
        postalCode: profil?.postalCode ?? '',
        city: profil?.city ?? '',
        phone: profil?.phone ?? '',
        email: profil?.email ?? '',
        kategorier: rensKategorier(profil?.kategorier),
        forventetStorrelse: profil?.forventetStorrelse ?? 'liten',
        aiTak: rensAiTak(profil?.aiTak ?? AI_TAK_DEFAULT),
        apningstider: rensApningstider(profil?.apningstider ?? standardApningstider()),
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

  slugSjekk: protectedProcedure
    .use(omradeSjekk('innstillinger', 'se'))
    .input(z.object({ slug: z.string().min(1).max(48), sted: z.string().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      if (!slugSjekkTillatt(ctx.tenantId)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Vent litt og prøv igjen.' });
      }
      const format = vurderSlugFormat(input.slug);
      const forhands = byggSlugSvar(input.slug, {
        opptatt: false,
        sted: input.sted,
        firmanavn: input.slug,
      });
      if (!format.ok || forhands.grunn === 'reservert' || forhands.grunn === 'manuell') {
        return forhands;
      }
      const opptatt = await slugErOpptatt(ctx.db, format.slug, ctx.tenantId);
      return byggSlugSvar(format.slug, { opptatt, sted: input.sted, firmanavn: input.slug });
    }),

  /** Idempotent utkast. Setter ikke Gå live. */
  lagre: protectedProcedure
    .use(omradeSjekk('innstillinger', 'endre'))
    .input(utkastSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== 'dealer_admin' && ctx.role !== 'endwise_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Bare forhandlerens eier kan lagre oppstarten.',
        });
      }
      try {
        await skrivOnboardingUtkast(ctx.db, ctx.tenantId, input);
      } catch (error) {
        loggOnboardingPostgresFeil(error);
        throw mapOnboardingPostgresFeil(error);
      }
      return { ok: true as const };
    }),

  /**
   * Fullfør veiviseren. Inkludert pakke er allerede skrevet — hopp over extras
   * og den blir stående. Idempotent: allerede live returnerer ok.
   */
  fullfor: protectedProcedure
    .use(omradeSjekk('innstillinger', 'endre'))
    .input(
      utkastSchema.extend({
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

      let result: { visningsnavn: string; granted: string[]; complete: true };
      try {
        result = await withTenant(ctx.db, ctx.tenantId, async (tx) => {
          const [tenant] = await tx
            .select({
              name: schema.tenants.name,
              slug: schema.tenants.slug,
              onboardingCompletedAt: schema.tenants.onboardingCompletedAt,
            })
            .from(schema.tenants)
            .where(eq(schema.tenants.id, ctx.tenantId));

          if (!tenant) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
          }
          if (tenant.onboardingCompletedAt) {
            return { visningsnavn: tenant.name, granted: [] as string[], complete: true };
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
          const naa = new Date();
          await tx
            .update(schema.tenants)
            .set({
              onboardingCompletedAt: naa,
              updatedAt: naa,
            })
            .where(eq(schema.tenants.id, ctx.tenantId));
          await tx
            .insert(schema.dealerProfiles)
            .values({
              tenantId: ctx.tenantId,
              address: input.address ?? '',
              postalCode: input.postalCode ?? '',
              city: input.city ?? '',
              phone: input.phone ?? '',
              email: input.email ?? '',
              apningstider: rensApningstider(input.apningstider),
              kategorier: rensKategorier(input.kategorier),
              forventetStorrelse: input.forventetStorrelse ?? 'liten',
              aiTak: rensAiTak(input.aiTak),
              updatedAt: naa,
            })
            .onConflictDoUpdate({
              target: schema.dealerProfiles.tenantId,
              set: {
                address: input.address ?? '',
                postalCode: input.postalCode ?? '',
                city: input.city ?? '',
                phone: input.phone ?? '',
                email: input.email ?? '',
                apningstider: rensApningstider(input.apningstider),
                kategorier: rensKategorier(input.kategorier),
                forventetStorrelse: input.forventetStorrelse ?? 'liten',
                aiTak: rensAiTak(input.aiTak),
                updatedAt: naa,
              },
            });
          await tx
            .insert(schema.tenantBranding)
            .values({
              tenantId: ctx.tenantId,
              visningsnavn: navn,
              publisertAt: naa,
              oppdatertAt: naa,
            })
            .onConflictDoUpdate({
              target: schema.tenantBranding.tenantId,
              set: { visningsnavn: navn, publisertAt: naa, oppdatertAt: naa },
            });

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
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        loggOnboardingPostgresFeil(error);
        throw mapOnboardingPostgresFeil(error);
      }

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
