import { eq, schema, withTenant } from '@endwise/db';
import { utkastFraUkjent, vurderAksent } from '@endwise/modules/branding';
import { lastOppLogo } from '@endwise/uploads';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { omradeSjekk, protectedProcedure, router } from '../init.ts';
import { krevWhiteLabel } from '../slug-ledig.ts';

const utkastInput = z.object({
  visningsnavn: z.string().trim().min(1).max(80),
  aksentfarge: z.string().trim().max(7).nullable().optional(),
  visLevertAv: z.boolean().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
});

function feil(melding: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message: melding });
}

export const brandingRouter = router({
  hent: protectedProcedure.use(omradeSjekk('innstillinger', 'se')).query(async ({ ctx }) => {
    krevWhiteLabel();
    return withTenant(ctx.db, ctx.tenantId as string, async (tx) => {
      const [tenant] = await tx
        .select({ name: schema.tenants.name, slug: schema.tenants.slug })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId as string));
      const [rad] = await tx
        .select()
        .from(schema.tenantBranding)
        .where(eq(schema.tenantBranding.tenantId, ctx.tenantId as string));
      const fallback = tenant?.name ?? 'Verkstedet';
      return {
        slug: tenant?.slug ?? '',
        publisertAt: rad?.publisertAt ?? null,
        publisert: {
          visningsnavn: rad?.visningsnavn ?? fallback,
          logoUrl: rad?.logoUrl ?? null,
          aksentfarge: rad?.aksentfarge ?? null,
          aksentTekstfarge: rad?.aksentTekstfarge ?? null,
          visLevertAv: rad?.visLevertAv ?? true,
        },
        utkast: utkastFraUkjent(rad?.utkast, fallback),
      };
    });
  }),

  lagreUtkast: protectedProcedure
    .use(omradeSjekk('innstillinger', 'endre'))
    .input(utkastInput)
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      let tekst: string | null = null;
      if (input.aksentfarge) {
        const farge = vurderAksent(input.aksentfarge);
        if (!farge.ok) feil(farge.grunn);
        tekst = farge.tekst;
        input = { ...input, aksentfarge: farge.hex };
      }
      return withTenant(ctx.db, ctx.tenantId as string, async (tx) => {
        const [tenant] = await tx
          .select({ name: schema.tenants.name })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, ctx.tenantId as string));
        const [eks] = await tx
          .select({
            utkast: schema.tenantBranding.utkast,
            visningsnavn: schema.tenantBranding.visningsnavn,
          })
          .from(schema.tenantBranding)
          .where(eq(schema.tenantBranding.tenantId, ctx.tenantId as string));
        const forrige = utkastFraUkjent(eks?.utkast, tenant?.name ?? 'Verkstedet');
        const neste = {
          ...forrige,
          visningsnavn: input.visningsnavn,
          visLevertAv: input.visLevertAv ?? forrige.visLevertAv,
          aksentfarge:
            input.aksentfarge === undefined ? forrige.aksentfarge : (input.aksentfarge ?? null),
          aksentTekstfarge: input.aksentfarge ? tekst : forrige.aksentTekstfarge,
          logoUrl: input.logoUrl === undefined ? forrige.logoUrl : input.logoUrl,
        };
        const now = new Date();
        await tx
          .insert(schema.tenantBranding)
          .values({
            tenantId: ctx.tenantId as string,
            visningsnavn: eks?.visningsnavn ?? tenant?.name ?? input.visningsnavn,
            utkast: neste,
            oppdatertAt: now,
          })
          .onConflictDoUpdate({
            target: schema.tenantBranding.tenantId,
            set: { utkast: neste, oppdatertAt: now },
          });
        return neste;
      });
    }),

  lastOppLogo: protectedProcedure
    .use(omradeSjekk('innstillinger', 'endre'))
    .input(z.object({ base64: z.string().min(1).max(2_200_000) }))
    .mutation(async ({ ctx, input }) => {
      krevWhiteLabel();
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(Buffer.from(input.base64, 'base64'));
      } catch {
        feil('Filen kunne ikke leses.');
      }
      const opplastet = await lastOppLogo({ tenantId: ctx.tenantId as string, bytes });
      await withTenant(ctx.db, ctx.tenantId as string, async (tx) => {
        const [tenant] = await tx
          .select({ name: schema.tenants.name })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, ctx.tenantId as string));
        const [eks] = await tx
          .select({
            utkast: schema.tenantBranding.utkast,
            visningsnavn: schema.tenantBranding.visningsnavn,
          })
          .from(schema.tenantBranding)
          .where(eq(schema.tenantBranding.tenantId, ctx.tenantId as string));
        const neste = {
          ...utkastFraUkjent(eks?.utkast, tenant?.name ?? 'Verkstedet'),
          logoUrl: opplastet.url,
        };
        const now = new Date();
        await tx
          .insert(schema.tenantBranding)
          .values({
            tenantId: ctx.tenantId as string,
            visningsnavn: eks?.visningsnavn ?? tenant?.name ?? 'Verkstedet',
            utkast: neste,
            oppdatertAt: now,
          })
          .onConflictDoUpdate({
            target: schema.tenantBranding.tenantId,
            set: { utkast: neste, oppdatertAt: now },
          });
      });
      return opplastet;
    }),

  publiser: protectedProcedure
    .use(omradeSjekk('innstillinger', 'endre'))
    .mutation(async ({ ctx }) => {
      krevWhiteLabel();
      return withTenant(ctx.db, ctx.tenantId as string, async (tx) => {
        const [tenant] = await tx
          .select({ name: schema.tenants.name, slug: schema.tenants.slug })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, ctx.tenantId as string));
        if (!tenant?.slug) feil('Fant ikke forhandleren.');
        const [eks] = await tx
          .select()
          .from(schema.tenantBranding)
          .where(eq(schema.tenantBranding.tenantId, ctx.tenantId as string));
        const utkast = utkastFraUkjent(eks?.utkast, tenant.name);
        if (utkast.aksentfarge) {
          const farge = vurderAksent(utkast.aksentfarge);
          if (!farge.ok) feil(farge.grunn);
          utkast.aksentfarge = farge.hex;
          utkast.aksentTekstfarge = farge.tekst;
        }
        const now = new Date();
        await tx
          .insert(schema.tenantBranding)
          .values({
            tenantId: ctx.tenantId as string,
            visningsnavn: utkast.visningsnavn,
            logoUrl: utkast.logoUrl,
            aksentfarge: utkast.aksentfarge,
            aksentTekstfarge: utkast.aksentTekstfarge,
            visLevertAv: utkast.visLevertAv,
            logoMime: utkast.logoUrl?.endsWith('.webp')
              ? 'image/webp'
              : utkast.logoUrl
                ? 'image/png'
                : null,
            utkast,
            publisertAt: now,
            oppdatertAt: now,
          })
          .onConflictDoUpdate({
            target: schema.tenantBranding.tenantId,
            set: {
              visningsnavn: utkast.visningsnavn,
              logoUrl: utkast.logoUrl,
              aksentfarge: utkast.aksentfarge,
              aksentTekstfarge: utkast.aksentTekstfarge,
              visLevertAv: utkast.visLevertAv,
              logoMime: utkast.logoUrl?.endsWith('.webp')
                ? 'image/webp'
                : utkast.logoUrl
                  ? 'image/png'
                  : null,
              utkast,
              publisertAt: now,
              oppdatertAt: now,
            },
          });

        const rot = process.env.TENANT_ROOT_DOMAIN ?? 'endwise.no';
        const vert = `${tenant.slug}.${rot}`;
        await tx
          .insert(schema.tenantDomains)
          .values({
            tenantId: ctx.tenantId as string,
            vert,
            type: 'subdomene',
            primar: true,
            status: 'verifisert',
            verifisertAt: now,
          })
          .onConflictDoUpdate({
            target: schema.tenantDomains.vert,
            set: { status: 'verifisert', verifisertAt: now, primar: true },
          });

        return { publisertAt: now, vert };
      });
    }),
});
